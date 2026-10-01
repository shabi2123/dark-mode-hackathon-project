<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/QueueService.php';

class TokenService {
    /**
     * Generate the next token number for a department today
     */
    public static function generateTokenNumber(int $departmentId): string {
        $db = Database::getConnection();

        // 1. Get department code
        $stmt = $db->prepare('SELECT code FROM departments WHERE id = ?');
        $stmt->execute([$departmentId]);
        $dept = $stmt->fetch();
        $code = $dept ? $dept['code'] : 'GEN';

        $prefix = TOKEN_PREFIX_MAP[$code] ?? strtoupper(substr($code, 0, 3));

        // 2. Count tokens generated today for services in this department
        $today = date('Y-m-d');
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM tokens t
             JOIN services s ON t.service_id = s.id
             WHERE s.department_id = ? AND DATE(t.created_at) = ?'
        );
        $stmt->execute([$departmentId, $today]);
        $sequence = (int)$stmt->fetchColumn() + 1;

        return sprintf('%s-%03d', $prefix, $sequence);
    }

    /**
     * Create a new walk-in or appointment token with Service Readiness and Smart Counter Matching
     */
    public static function createToken(
        int $userId,
        int $serviceId,
        string $type = 'walk_in',
        ?int $appointmentId = null,
        int $readinessPercentage = 100,
        string $readinessStatus = 'READY',
        $missingRequirements = null
    ): array {
        if (is_array($missingRequirements)) {
            $missingRequirements = json_encode($missingRequirements, JSON_UNESCAPED_UNICODE);
        }

        $db = Database::getConnection();

        // Check if user already has an active waiting/called token
        $stmt = $db->prepare(
            'SELECT id, token_number FROM tokens 
             WHERE user_id = ? AND status IN ("waiting", "called", "in_service")'
        );
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();
        if ($existing) {
            throw new Exception("You already have an active token ({$existing['token_number']}). Please wait or cancel it first.");
        }

        // Get department for service
        $stmt = $db->prepare('SELECT department_id, name FROM services WHERE id = ?');
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch();
        if (!$service) {
            throw new Exception("Service not found");
        }
        $deptId = (int)$service['department_id'];

        $tokenNumber = self::generateTokenNumber($deptId);

        // Count people ahead
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM tokens WHERE service_id = ? AND status = "waiting"'
        );
        $stmt->execute([$serviceId]);
        $peopleAhead = (int)$stmt->fetchColumn();

        $queuePosition = $peopleAhead + 1;
        $estWait = QueueService::calculateEstimatedWait($serviceId, $peopleAhead);

        // Smart Counter Matching: identify optimal active compatible counter
        $bestCounter = QueueService::findBestCompatibleCounter($serviceId);
        $assignedCounterId = $bestCounter ? (int)$bestCounter['id'] : null;
        $assignedCounterName = $bestCounter ? $bestCounter['name'] : 'First Available Counter';

        $stmt = $db->prepare(
            'INSERT INTO tokens (token_number, user_id, service_id, counter_id, appointment_id, queue_position, estimated_wait_minutes, status, type, readiness_percentage, readiness_status, missing_requirements) 
             VALUES (?, ?, ?, ?, ?, ?, ?, "waiting", ?, ?, ?, ?)'
        );
        $stmt->execute([
            $tokenNumber,
            $userId,
            $serviceId,
            $assignedCounterId,
            $appointmentId,
            $queuePosition,
            $estWait,
            $type,
            $readinessPercentage,
            $readinessStatus,
            $missingRequirements
        ]);

        $tokenId = (int)$db->lastInsertId();

        // Audit log
        $notes = "Token generated ({$type}). Readiness: {$readinessStatus} ({$readinessPercentage}%). Routed to: {$assignedCounterName}";
        self::logHistory($tokenId, $assignedCounterId, null, 'created', $notes);

        // Notify user
        $notifStmt = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "queue")');
        $notifStmt->execute([
            $userId,
            'Token Generated',
            "Your digital token {$tokenNumber} is ready. Position: #{$queuePosition}, Est. Wait: {$estWait} mins. Compatible Counter: {$assignedCounterName}. Readiness: {$readinessStatus}."
        ]);

        return [
            'id' => $tokenId,
            'token_number' => $tokenNumber,
            'queue_position' => $queuePosition,
            'estimated_wait_minutes' => $estWait,
            'status' => 'waiting',
            'type' => $type,
            'assigned_counter' => $assignedCounterName,
            'readiness_percentage' => $readinessPercentage,
            'readiness_status' => $readinessStatus,
            'missing_requirements' => $missingRequirements
        ];
    }

    /**
     * Record action in queue history
     */
    public static function logHistory(int $tokenId, ?int $counterId, ?int $staffId, string $action, ?string $notes = null): void {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT INTO queue_history (token_id, counter_id, staff_id, action, notes) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$tokenId, $counterId, $staffId, $action, $notes]);
    }
}
