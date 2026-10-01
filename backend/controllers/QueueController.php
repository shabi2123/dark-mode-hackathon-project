<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/TokenService.php';
require_once __DIR__ . '/../services/QueueService.php';

class QueueController {
    /**
     * Join walk-in queue
     */
    public static function join(): void {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = new Validator($data);
        $validator->required('service_id', 'Service')->integer('service_id', 'Service');
        $validator->validate();

        try {
            $token = TokenService::createToken(
                (int)$user['id'],
                (int)$data['service_id'],
                'walk_in',
                null,
                isset($data['readiness_percentage']) ? (int)$data['readiness_percentage'] : 100,
                $data['readiness_status'] ?? 'READY',
                $data['missing_requirements'] ?? null
            );
            Response::success($token, 'Token generated successfully. You are now in the queue.', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Get live queue status for currently logged in customer
     */
    public static function status(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        // Find user's active token (waiting, called, or in_service)
        $stmt = $db->prepare(
            'SELECT t.*, s.name as service_name, s.avg_duration_minutes, d.name as department_name, d.code as department_code, c.name as counter_name, u.name as staff_name
             FROM tokens t
             JOIN services s ON t.service_id = s.id
             JOIN departments d ON s.department_id = d.id
             LEFT JOIN counters c ON t.counter_id = c.id
             LEFT JOIN users u ON c.staff_id = u.id
             WHERE t.user_id = ? AND t.status IN ("waiting", "called", "in_service")
             ORDER BY t.id DESC LIMIT 1'
        );
        $stmt->execute([$user['id']]);
        $token = $stmt->fetch();

        if (!$token) {
            // Check for most recently completed token today
            $stmt = $db->prepare(
                'SELECT t.*, s.name as service_name, d.name as department_name, c.name as counter_name
                 FROM tokens t
                 JOIN services s ON t.service_id = s.id
                 JOIN departments d ON s.department_id = d.id
                 LEFT JOIN counters c ON t.counter_id = c.id
                 WHERE t.user_id = ? AND DATE(t.created_at) = CURDATE()
                 ORDER BY t.id DESC LIMIT 1'
            );
            $stmt->execute([$user['id']]);
            $recent = $stmt->fetch();

            Response::success([
                'has_active_token' => false,
                'active_token' => null,
                'recent_token' => $recent ?: null
            ]);
            return;
        }

        // Calculate dynamic people ahead & wait time if still waiting
        $peopleAhead = 0;
        $estWait = 0;
        if ($token['status'] === 'waiting') {
            $peopleAhead = QueueService::getPeopleAhead((int)$token['id'], (int)$token['service_id'], $token['created_at']);
            $estWait = QueueService::calculateEstimatedWait((int)$token['service_id'], $peopleAhead);
        }

        // Get compatible counters for this service
        $compatibleCounters = QueueService::getCompatibleCounters((int)$token['service_id']);

        // Get currently serving token for this service/department
        $stmt = $db->prepare(
            'SELECT t.token_number, c.name as counter_name 
             FROM tokens t 
             JOIN counters c ON t.counter_id = c.id
             JOIN services s ON t.service_id = s.id
             WHERE s.department_id = (SELECT department_id FROM services WHERE id = ?)
               AND t.status IN ("called", "in_service")
             ORDER BY t.called_at DESC LIMIT 1'
        );
        $stmt->execute([$token['service_id']]);
        $currentServing = $stmt->fetch();

        Response::success([
            'has_active_token' => true,
            'active_token' => array_merge($token, [
                'people_ahead' => $peopleAhead,
                'queue_position' => $peopleAhead + 1,
                'estimated_wait_minutes' => $estWait,
                'current_serving_token' => $currentServing ? $currentServing['token_number'] : null,
                'current_serving_counter' => $currentServing ? $currentServing['counter_name'] : null,
                'compatible_counters' => $compatibleCounters
            ])
        ]);
    }

    /**
     * Cancel active token
     */
    public static function cancel(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT id, service_id FROM tokens WHERE user_id = ? AND status = "waiting"'
        );
        $stmt->execute([$user['id']]);
        $token = $stmt->fetch();

        if (!$token) {
            Response::error('No active waiting token to cancel');
        }

        $stmt = $db->prepare('UPDATE tokens SET status = "cancelled" WHERE id = ?');
        $stmt->execute([$token['id']]);

        TokenService::logHistory((int)$token['id'], null, null, 'cancelled', 'Cancelled by customer');

        // Recalculate queue for department
        $deptStmt = $db->prepare('SELECT department_id FROM services WHERE id = ?');
        $deptStmt->execute([$token['service_id']]);
        $deptId = (int)$deptStmt->fetchColumn();
        if ($deptId) {
            QueueService::recalculateDepartmentQueue($deptId);
        }

        Response::success(null, 'Token cancelled successfully');
    }

    /**
     * Customer queue history
     */
    public static function history(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT t.*, s.name as service_name, d.name as department_name, c.name as counter_name
             FROM tokens t
             JOIN services s ON t.service_id = s.id
             JOIN departments d ON s.department_id = d.id
             LEFT JOIN counters c ON t.counter_id = c.id
             WHERE t.user_id = ?
             ORDER BY t.created_at DESC LIMIT 20'
        );
        $stmt->execute([$user['id']]);
        Response::success($stmt->fetchAll());
    }
}
