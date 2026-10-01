<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

class QueueService {
    /**
     * Smart Counter Matching:
     * Find compatible active counters for a service and select the best candidate (lowest workload).
     */
    public static function findBestCompatibleCounter(int $serviceId): ?array {
        $db = Database::getConnection();

        // 1. Find counters mapped to this service via counter_services that are active
        $stmt = $db->prepare(
            'SELECT c.*, 
                    (SELECT COUNT(*) FROM tokens t WHERE t.counter_id = c.id AND t.status IN ("waiting", "called", "in_service")) as current_workload
             FROM counters c
             JOIN counter_services cs ON c.id = cs.counter_id
             WHERE cs.service_id = ? AND c.status IN ("available", "busy")
             ORDER BY current_workload ASC, c.id ASC
             LIMIT 1'
        );
        $stmt->execute([$serviceId]);
        $best = $stmt->fetch();

        if ($best) {
            return $best;
        }

        // Fallback: any counter mapped to this service regardless of status
        $stmt = $db->prepare(
            'SELECT c.*, 0 as current_workload 
             FROM counters c
             JOIN counter_services cs ON c.id = cs.counter_id
             WHERE cs.service_id = ?
             ORDER BY c.id ASC
             LIMIT 1'
        );
        $stmt->execute([$serviceId]);
        $fallback = $stmt->fetch();

        return $fallback ?: null;
    }

    /**
     * Get list of all compatible counters for a service
     */
    public static function getCompatibleCounters(int $serviceId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT c.*, u.name as staff_name 
             FROM counters c
             JOIN counter_services cs ON c.id = cs.counter_id
             LEFT JOIN users u ON c.staff_id = u.id
             WHERE cs.service_id = ?
             ORDER BY c.id ASC'
        );
        $stmt->execute([$serviceId]);
        return $stmt->fetchAll();
    }

    /**
     * Calculate deterministic estimated waiting time based on active compatible counters.
     */
    public static function calculateEstimatedWait(int $serviceId, int $peopleAhead): int {
        $db = Database::getConnection();

        // 1. Get service avg duration
        $stmt = $db->prepare('SELECT avg_duration_minutes, department_id FROM services WHERE id = ?');
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch();
        $avgDuration = $service ? (int)$service['avg_duration_minutes'] : DEFAULT_SERVICE_DURATION;
        $deptId = $service ? (int)$service['department_id'] : 1;

        // 2. Count active compatible counters for this specific service
        $stmt = $db->prepare(
            'SELECT COUNT(DISTINCT c.id) 
             FROM counters c
             JOIN counter_services cs ON c.id = cs.counter_id
             WHERE cs.service_id = ? AND c.status IN ("available", "busy")'
        );
        $stmt->execute([$serviceId]);
        $activeCounters = (int)$stmt->fetchColumn();

        if ($activeCounters <= 0) {
            // Check if there are any counters active in the department
            $stmt = $db->prepare('SELECT COUNT(*) FROM counters WHERE department_id = ? AND status IN ("available", "busy")');
            $stmt->execute([$deptId]);
            $activeCounters = (int)$stmt->fetchColumn();
        }

        $activeCounters = max(1, $activeCounters);

        // 3. Formula: (People Ahead * Avg Service Duration) / Active Compatible Counters
        $waitMinutes = (int) ceil(($peopleAhead * $avgDuration) / $activeCounters);
        return max(0, $waitMinutes);
    }

    /**
     * Get number of people ahead of a specific token
     */
    public static function getPeopleAhead(int $tokenId, int $serviceId, string $createdAt): int {
        $db = Database::getConnection();
        
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM tokens 
             WHERE service_id = ? 
               AND status = "waiting" 
               AND (created_at < ? OR (created_at = ? AND id < ?))'
        );
        $stmt->execute([$serviceId, $createdAt, $createdAt, $tokenId]);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Update estimated wait times for all waiting tokens in a department
     */
    public static function recalculateDepartmentQueue(int $departmentId): void {
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT t.id, t.service_id, t.created_at, s.avg_duration_minutes 
             FROM tokens t
             JOIN services s ON t.service_id = s.id
             WHERE s.department_id = ? AND t.status = "waiting"
             ORDER BY t.created_at ASC, t.id ASC'
        );
        $stmt->execute([$departmentId]);
        $tokens = $stmt->fetchAll();

        $peopleAheadByService = [];
        foreach ($tokens as $token) {
            $sId = $token['service_id'];
            $pos = $peopleAheadByService[$sId] ?? 0;
            $estWait = self::calculateEstimatedWait($sId, $pos);

            $updateStmt = $db->prepare(
                'UPDATE tokens SET queue_position = ?, estimated_wait_minutes = ? WHERE id = ?'
            );
            $updateStmt->execute([$pos + 1, $estWait, $token['id']]);

            $peopleAheadByService[$sId] = $pos + 1;
        }
    }

    /**
     * Queue Rescue:
     * When a counter goes on Break or Closed, seamlessly re-assign all tokens assigned to this counter
     * to another active compatible counter without customer losing their place in line!
     */
    public static function rescueCounterQueue(int $counterId): int {
        $db = Database::getConnection();

        // 1. Get counter details
        $stmt = $db->prepare('SELECT * FROM counters WHERE id = ?');
        $stmt->execute([$counterId]);
        $counter = $stmt->fetch();
        if (!$counter) return 0;

        // 2. Find any tokens currently waiting or called on this counter
        $stmt = $db->prepare('SELECT * FROM tokens WHERE counter_id = ? AND status IN ("waiting", "called")');
        $stmt->execute([$counterId]);
        $affectedTokens = $stmt->fetchAll();

        $rescuedCount = 0;
        foreach ($affectedTokens as $tok) {
            // Find another active compatible counter for this token's service
            $stmt = $db->prepare(
                'SELECT c.* 
                 FROM counters c
                 JOIN counter_services cs ON c.id = cs.counter_id
                 WHERE cs.service_id = ? AND c.id != ? AND c.status IN ("available", "busy")
                 ORDER BY c.id ASC
                 LIMIT 1'
            );
            $stmt->execute([$tok['service_id'], $counterId]);
            $alternativeCounter = $stmt->fetch();

            $newCounterId = $alternativeCounter ? (int)$alternativeCounter['id'] : null;
            $newCounterName = $alternativeCounter ? $alternativeCounter['name'] : 'Next Available Counter';

            // If token was already called, reset status back to waiting so alternative counter can call it
            $newStatus = $tok['status'] === 'called' ? 'waiting' : $tok['status'];

            $upStmt = $db->prepare('UPDATE tokens SET counter_id = ?, status = ? WHERE id = ?');
            $upStmt->execute([$newCounterId, $newStatus, $tok['id']]);

            // Audit log the rescue
            $historyStmt = $db->prepare(
                'INSERT INTO queue_history (token_id, counter_id, action, notes) VALUES (?, ?, "recalled", ?)'
            );
            $historyStmt->execute([
                $tok['id'],
                $newCounterId,
                "Queue Rescue: Reassigned from {$counter['name']} (paused/closed) to {$newCounterName}"
            ]);

            // Notify customer
            $notif = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "queue")');
            $notif->execute([
                $tok['user_id'],
                'Queue Update (Counter Rescued)',
                "{$counter['name']} has paused service. Your token {$tok['token_number']} has been safely reassigned to {$newCounterName}. You have not lost your place in line!"
            ]);

            $rescuedCount++;
        }

        // Clear current token on the closing counter
        $clearStmt = $db->prepare('UPDATE counters SET current_token_id = NULL WHERE id = ?');
        $clearStmt->execute([$counterId]);

        // Recalculate queue for department
        self::recalculateDepartmentQueue((int)$counter['department_id']);

        return $rescuedCount;
    }
}
