<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../services/TokenService.php';
require_once __DIR__ . '/../services/QueueService.php';

class StaffController {
    /**
     * Get staff counter information
     */
    public static function myCounter(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT c.*, d.name as department_name, d.code as department_code,
                    t.token_number as current_token_number, t.id as current_token_id, t.status as current_token_status,
                    s.name as current_service_name, u.name as customer_name
             FROM counters c
             JOIN departments d ON c.department_id = d.id
             LEFT JOIN tokens t ON c.current_token_id = t.id
             LEFT JOIN services s ON t.service_id = s.id
             LEFT JOIN users u ON t.user_id = u.id
             WHERE c.staff_id = ? LIMIT 1'
        );
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter) {
            // If staff has no assigned counter, find first unassigned or available counter in any department
            $stmt = $db->prepare('SELECT * FROM counters WHERE staff_id IS NULL ORDER BY id LIMIT 1');
            $stmt->execute();
            $availableCounter = $stmt->fetch();
            if ($availableCounter) {
                // Auto-assign staff to this counter for seamless demo
                $update = $db->prepare('UPDATE counters SET staff_id = ?, status = "available" WHERE id = ?');
                $update->execute([$user['id'], $availableCounter['id']]);
                self::myCounter();
                return;
            }
        }

        Response::success($counter);
    }

    /**
     * Update counter status (available, busy, break, closed)
     */
    public static function updateCounterStatus(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = new Validator($data);
        $validator->required('status')->in('status', ['available', 'busy', 'break', 'closed']);
        $validator->validate();

        $db = Database::getConnection();

        // Find counter assigned to staff
        $stmt = $db->prepare('SELECT id, department_id FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter) {
            Response::error('You do not have an assigned counter');
        }

        $stmt = $db->prepare('UPDATE counters SET status = ? WHERE id = ?');
        $stmt->execute([$data['status'], $counter['id']]);

        // QUEUE RESCUE: If counter went on Break or Closed, seamlessly re-assign waiting/called tokens
        $rescuedCount = 0;
        if (in_array($data['status'], ['break', 'closed'])) {
            $rescuedCount = QueueService::rescueCounterQueue((int)$counter['id']);
        } else {
            // Recalculate wait times when returning to available
            QueueService::recalculateDepartmentQueue((int)$counter['department_id']);
        }

        $msg = "Counter status updated to {$data['status']}";
        if ($rescuedCount > 0) {
            $msg .= " ({$rescuedCount} customer(s) rescued to active counters)";
        }

        Response::success(['status' => $data['status'], 'rescued' => $rescuedCount], $msg);
    }

    /**
     * Get queue list for staff counter's department and compatible services
     */
    public static function queue(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        // 1. Get staff counter & department
        $stmt = $db->prepare('SELECT id, name, department_id, current_token_id, status FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter) {
            $deptId = 1;
            $counterId = null;
        } else {
            $deptId = (int)$counter['department_id'];
            $counterId = (int)$counter['id'];
        }

        // 2. Fetch waiting tokens compatible with this counter (or department)
        $sql = 'SELECT t.*, s.name as service_name, s.avg_duration_minutes, u.name as customer_name, u.phone as customer_phone,
                       a.appointment_number, a.start_time as appointment_time
                FROM tokens t
                JOIN services s ON t.service_id = s.id
                JOIN users u ON t.user_id = u.id
                LEFT JOIN appointments a ON t.appointment_id = a.id ';
        
        if ($counterId) {
            $sql .= 'LEFT JOIN counter_services cs ON s.id = cs.service_id AND cs.counter_id = ? 
                     WHERE (cs.counter_id = ? OR s.department_id = ?) AND t.status = "waiting" ';
            $params = [$counterId, $counterId, $deptId];
        } else {
            $sql .= 'WHERE s.department_id = ? AND t.status = "waiting" ';
            $params = [$deptId];
        }

        $sql .= 'ORDER BY 
                   CASE WHEN t.type = "appointment" THEN 0 ELSE 1 END,
                   t.created_at ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $waiting = $stmt->fetchAll();

        // 3. Fetch currently called / in-service token at this staff counter with readiness
        $currentToken = null;
        if ($counter && !empty($counter['current_token_id'])) {
            $stmt = $db->prepare(
                'SELECT t.*, s.name as service_name, s.avg_duration_minutes, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                        a.appointment_number, a.notes as appointment_notes
                 FROM tokens t
                 JOIN services s ON t.service_id = s.id
                 JOIN users u ON t.user_id = u.id
                 LEFT JOIN appointments a ON t.appointment_id = a.id
                 WHERE t.id = ?'
            );
            $stmt->execute([$counter['current_token_id']]);
            $currentToken = $stmt->fetch() ?: null;
        }

        // 4. Fetch counters in this department for visibility
        $stmt = $db->prepare(
            'SELECT c.*, u.name as staff_name, t.token_number as current_token_number
             FROM counters c
             LEFT JOIN users u ON c.staff_id = u.id
             LEFT JOIN tokens t ON c.current_token_id = t.id
             WHERE c.department_id = ?'
        );
        $stmt->execute([$deptId]);
        $deptCounters = $stmt->fetchAll();

        Response::success([
            'counter' => $counter,
            'current_token' => $currentToken,
            'waiting_queue' => $waiting,
            'counters' => $deptCounters,
            'queue_count' => count($waiting)
        ]);
    }

    /**
     * Call next token in queue
     */
    public static function callNext(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        // 1. Get staff counter
        $stmt = $db->prepare('SELECT * FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter) {
            Response::error('You do not have an assigned counter');
        }

        if ($counter['status'] === 'break' || $counter['status'] === 'closed') {
            Response::error("Cannot call customer while counter is {$counter['status']}. Please set counter to Available first.");
        }

        // Check if there is already a token in progress
        if (!empty($counter['current_token_id'])) {
            $stmt = $db->prepare('SELECT id, token_number, status FROM tokens WHERE id = ?');
            $stmt->execute([$counter['current_token_id']]);
            $current = $stmt->fetch();
            if ($current && in_array($current['status'], ['called', 'in_service'])) {
                Response::error("Token {$current['token_number']} is currently {$current['status']}. Complete or skip it before calling the next one.");
            }
        }

        // 2. Find next waiting token compatible with this counter (prioritizing checked-in appointments)
        $stmt = $db->prepare(
            'SELECT t.id, t.token_number, t.user_id, t.service_id, s.name as service_name
             FROM tokens t
             JOIN services s ON t.service_id = s.id
             LEFT JOIN counter_services cs ON s.id = cs.service_id AND cs.counter_id = ?
             WHERE (cs.counter_id = ? OR s.department_id = ?) AND t.status = "waiting"
             ORDER BY 
               CASE WHEN t.type = "appointment" THEN 0 ELSE 1 END,
               t.created_at ASC
             LIMIT 1'
        );
        $stmt->execute([$counter['id'], $counter['id'], $counter['department_id']]);
        $nextToken = $stmt->fetch();

        if (!$nextToken) {
            Response::error('No waiting customers in the queue for this department', 404);
        }

        $tokenId = (int)$nextToken['id'];

        // 3. Atomically update token status to 'called'
        $stmt = $db->prepare(
            'UPDATE tokens SET status = "called", counter_id = ?, called_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        $stmt->execute([$counter['id'], $tokenId]);

        // 4. Update counter with current token
        $stmt = $db->prepare('UPDATE counters SET current_token_id = ?, status = "busy" WHERE id = ?');
        $stmt->execute([$tokenId, $counter['id']]);

        // 5. Log history
        TokenService::logHistory($tokenId, (int)$counter['id'], (int)$user['id'], 'called', "Called to {$counter['name']}");

        // 6. Notify user
        $notif = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "queue")');
        $notif->execute([
            $nextToken['user_id'],
            'Token Called!',
            "Token {$nextToken['token_number']} — Please proceed to {$counter['name']} for {$nextToken['service_name']}."
        ]);

        // 7. Recalculate waiting times for remaining tokens
        QueueService::recalculateDepartmentQueue((int)$counter['department_id']);

        Response::success([
            'token_id' => $tokenId,
            'token_number' => $nextToken['token_number'],
            'counter_name' => $counter['name'],
            'call_announcement' => "Token {$nextToken['token_number']} — Please proceed to {$counter['name']}."
        ], "Token {$nextToken['token_number']} called to {$counter['name']}");
    }

    /**
     * Recall current token
     */
    public static function recall(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter || empty($counter['current_token_id'])) {
            Response::error('No active token to recall');
        }

        $tokenId = (int)$counter['current_token_id'];
        $stmt = $db->prepare('SELECT t.*, s.name as service_name FROM tokens t JOIN services s ON t.service_id = s.id WHERE t.id = ?');
        $stmt->execute([$tokenId]);
        $token = $stmt->fetch();

        if (!$token || $token['status'] !== 'called') {
            Response::error('Can only recall a token that is currently in "called" status');
        }

        // Log recall
        TokenService::logHistory($tokenId, (int)$counter['id'], (int)$user['id'], 'recalled', "Recalled to {$counter['name']}");

        // Send notification again
        $notif = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "queue")');
        $notif->execute([
            $token['user_id'],
            'Recall: Please Proceed to Counter',
            "RECALL: Token {$token['token_number']} — Please proceed immediately to {$counter['name']}."
        ]);

        Response::success([
            'token_number' => $token['token_number'],
            'counter_name' => $counter['name'],
            'call_announcement' => "Token {$token['token_number']} — Please proceed to {$counter['name']}."
        ], "Token {$token['token_number']} recalled");
    }

    /**
     * Skip token / mark unavailable
     */
    public static function skip(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter || empty($counter['current_token_id'])) {
            Response::error('No active token to skip');
        }

        $tokenId = (int)$counter['current_token_id'];

        // Update token to skipped
        $stmt = $db->prepare('UPDATE tokens SET status = "skipped" WHERE id = ?');
        $stmt->execute([$tokenId]);

        // If linked to an appointment, mark appointment missed
        $stmt = $db->prepare('SELECT appointment_id, token_number FROM tokens WHERE id = ?');
        $stmt->execute([$tokenId]);
        $tok = $stmt->fetch();
        if (!empty($tok['appointment_id'])) {
            $stmt = $db->prepare('UPDATE appointments SET status = "missed" WHERE id = ?');
            $stmt->execute([$tok['appointment_id']]);
        }

        // Clear counter current token and set available
        $stmt = $db->prepare('UPDATE counters SET current_token_id = NULL, status = "available" WHERE id = ?');
        $stmt->execute([$counter['id']]);

        TokenService::logHistory($tokenId, (int)$counter['id'], (int)$user['id'], 'skipped', 'Customer did not show up');

        Response::success(null, "Token {$tok['token_number']} skipped and marked unavailable");
    }

    /**
     * Start service
     */
    public static function startService(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter || empty($counter['current_token_id'])) {
            Response::error('No active token to start service');
        }

        $tokenId = (int)$counter['current_token_id'];

        $stmt = $db->prepare('UPDATE tokens SET status = "in_service", service_started_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$tokenId]);

        $stmt = $db->prepare('UPDATE counters SET status = "busy" WHERE id = ?');
        $stmt->execute([$counter['id']]);

        // If linked to appointment, set appointment status to in_service
        $stmt = $db->prepare('SELECT appointment_id, token_number FROM tokens WHERE id = ?');
        $stmt->execute([$tokenId]);
        $tok = $stmt->fetch();
        if (!empty($tok['appointment_id'])) {
            $stmt = $db->prepare('UPDATE appointments SET status = "in_service" WHERE id = ?');
            $stmt->execute([$tok['appointment_id']]);
        }

        TokenService::logHistory($tokenId, (int)$counter['id'], (int)$user['id'], 'started', 'Service began');

        Response::success(['token_number' => $tok['token_number']], "Service started for token {$tok['token_number']}");
    }

    /**
     * Complete service
     */
    public static function completeService(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireStaff($user);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM counters WHERE staff_id = ?');
        $stmt->execute([$user['id']]);
        $counter = $stmt->fetch();

        if (!$counter || empty($counter['current_token_id'])) {
            Response::error('No active token to complete service');
        }

        $tokenId = (int)$counter['current_token_id'];

        // Mark completed
        $stmt = $db->prepare('UPDATE tokens SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$tokenId]);

        // If linked to appointment, set appointment status to completed
        $stmt = $db->prepare('SELECT appointment_id, token_number, user_id FROM tokens WHERE id = ?');
        $stmt->execute([$tokenId]);
        $tok = $stmt->fetch();
        if (!empty($tok['appointment_id'])) {
            $stmt = $db->prepare('UPDATE appointments SET status = "completed" WHERE id = ?');
            $stmt->execute([$tok['appointment_id']]);
        }

        // Clear counter current token & set available
        $stmt = $db->prepare('UPDATE counters SET current_token_id = NULL, status = "available" WHERE id = ?');
        $stmt->execute([$counter['id']]);

        TokenService::logHistory($tokenId, (int)$counter['id'], (int)$user['id'], 'completed', 'Service successfully completed');

        // Notify customer
        $notif = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "system")');
        $notif->execute([
            $tok['user_id'],
            'Service Completed',
            "Your service for token {$tok['token_number']} at {$counter['name']} is now complete. Thank you for visiting!"
        ]);

        // Recalculate waiting times for department
        QueueService::recalculateDepartmentQueue((int)$counter['department_id']);

        Response::success(['token_number' => $tok['token_number']], "Service for token {$tok['token_number']} completed");
    }
}
