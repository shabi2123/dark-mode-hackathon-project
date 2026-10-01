<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class AdminController {
    /**
     * Dashboard KPI overview
     */
    public static function dashboard(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        $today = date('Y-m-d');

        // 1. Total appointments today
        $stmt = $db->prepare('SELECT COUNT(*) FROM appointments WHERE appointment_date = ?');
        $stmt->execute([$today]);
        $totalAppointmentsToday = (int)$stmt->fetchColumn();

        // 2. Walk-in visitors today
        $stmt = $db->prepare('SELECT COUNT(*) FROM tokens WHERE type = "walk_in" AND DATE(created_at) = ?');
        $stmt->execute([$today]);
        $walkInsToday = (int)$stmt->fetchColumn();

        // 3. Current waiting customers
        $stmt = $db->query('SELECT COUNT(*) FROM tokens WHERE status = "waiting"');
        $currentWaiting = (int)$stmt->fetchColumn();

        // 4. Active counters (available or busy)
        $stmt = $db->query('SELECT COUNT(*) FROM counters WHERE status IN ("available", "busy")');
        $activeCounters = (int)$stmt->fetchColumn();

        // Total counters
        $stmt = $db->query('SELECT COUNT(*) FROM counters');
        $totalCounters = (int)$stmt->fetchColumn();

        // 5. Completed services today
        $stmt = $db->prepare('SELECT COUNT(*) FROM tokens WHERE status = "completed" AND DATE(completed_at) = ?');
        $stmt->execute([$today]);
        $completedToday = (int)$stmt->fetchColumn();

        // 6. Missed appointments today
        $stmt = $db->prepare('SELECT COUNT(*) FROM appointments WHERE appointment_date = ? AND status IN ("missed", "cancelled")');
        $stmt->execute([$today]);
        $missedToday = (int)$stmt->fetchColumn();

        // 7. Average waiting time (in minutes) for completed/called tokens today
        $stmt = $db->prepare(
            'SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, called_at)) 
             FROM tokens 
             WHERE called_at IS NOT NULL AND DATE(created_at) = ?'
        );
        $stmt->execute([$today]);
        $avgWaitTime = round((float)($stmt->fetchColumn() ?: 8), 1);

        // 8. Average service duration (in minutes) for completed tokens today
        $stmt = $db->prepare(
            'SELECT AVG(TIMESTAMPDIFF(MINUTE, service_started_at, completed_at)) 
             FROM tokens 
             WHERE service_started_at IS NOT NULL AND completed_at IS NOT NULL AND DATE(created_at) = ?'
        );
        $stmt->execute([$today]);
        $avgServiceDuration = round((float)($stmt->fetchColumn() ?: 12), 1);

        // 9. Busiest department today
        $stmt = $db->prepare(
            'SELECT d.name, COUNT(t.id) as token_count 
             FROM departments d
             JOIN services s ON d.id = s.department_id
             JOIN tokens t ON s.id = t.service_id
             WHERE DATE(t.created_at) = ?
             GROUP BY d.id
             ORDER BY token_count DESC LIMIT 1'
        );
        $stmt->execute([$today]);
        $busiestDept = $stmt->fetch() ?: ['name' => 'Customer Service', 'token_count' => 0];

        // 10. Busiest service today
        $stmt = $db->prepare(
            'SELECT s.name, COUNT(t.id) as token_count 
             FROM services s
             JOIN tokens t ON s.id = t.service_id
             WHERE DATE(t.created_at) = ?
             GROUP BY s.id
             ORDER BY token_count DESC LIMIT 1'
        );
        $stmt->execute([$today]);
        $busiestService = $stmt->fetch() ?: ['name' => 'Account Opening', 'token_count' => 0];

        // 11. Readiness KPIs
        $stmt = $db->prepare('SELECT COUNT(*) FROM tokens WHERE readiness_status != "READY" AND DATE(created_at) = ?');
        $stmt->execute([$today]);
        $readinessIssuesToday = (int)$stmt->fetchColumn();

        $stmt = $db->prepare(
            'SELECT 
               COUNT(*) as total_completed,
               COUNT(CASE WHEN readiness_status = "READY" THEN 1 END) as ready_completed
             FROM tokens 
             WHERE status = "completed" AND DATE(completed_at) = ?'
        );
        $stmt->execute([$today]);
        $fvcData = $stmt->fetch();
        $totalComp = (int)($fvcData['total_completed'] ?? 0);
        $readyComp = (int)($fvcData['ready_completed'] ?? 0);
        $firstVisitCompletionRate = $totalComp > 0 ? round(($readyComp / $totalComp) * 100, 1) : 100.0;

        // 12. Hourly visitor distribution (for peak hours)
        $hourlyStmt = $db->prepare(
            'SELECT HOUR(created_at) as hour, COUNT(*) as count 
             FROM tokens 
             WHERE DATE(created_at) = ?
             GROUP BY HOUR(created_at)
             ORDER BY hour ASC'
        );
        $hourlyStmt->execute([$today]);
        $hourlyData = $hourlyStmt->fetchAll();

        // 13. Recent activity / queue events
        $historyStmt = $db->query(
            'SELECT qh.*, t.token_number, c.name as counter_name, u.name as staff_name 
             FROM queue_history qh
             JOIN tokens t ON qh.token_id = t.id
             LEFT JOIN counters c ON qh.counter_id = c.id
             LEFT JOIN users u ON qh.staff_id = u.id
             ORDER BY qh.created_at DESC LIMIT 10'
        );
        $recentActivity = $historyStmt->fetchAll();

        Response::success([
            'kpis' => [
                'total_appointments_today' => $totalAppointmentsToday,
                'walk_in_visitors_today' => $walkInsToday,
                'current_waiting_customers' => $currentWaiting,
                'active_counters' => $activeCounters,
                'total_counters' => $totalCounters,
                'completed_services_today' => $completedToday,
                'missed_appointments_today' => $missedToday,
                'average_waiting_time_mins' => $avgWaitTime,
                'average_service_duration_mins' => $avgServiceDuration,
                'busiest_department' => $busiestDept['name'],
                'busiest_service' => $busiestService['name'],
                'readiness_issues_today' => $readinessIssuesToday,
                'first_visit_completion_rate' => $firstVisitCompletionRate
            ],
            'hourly_distribution' => $hourlyData,
            'recent_activity' => $recentActivity
        ]);
    }

    /**
     * Live Queue Monitor across all branches / departments
     */
    public static function queueMonitor(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        // All active counters
        $stmt = $db->query(
            'SELECT c.*, d.name as department_name, d.code as department_code, u.name as staff_name,
                    t.token_number as current_token_number, t.status as current_token_status,
                    s.name as current_service_name
             FROM counters c
             JOIN departments d ON c.department_id = d.id
             LEFT JOIN users u ON c.staff_id = u.id
             LEFT JOIN tokens t ON c.current_token_id = t.id
             LEFT JOIN services s ON t.service_id = s.id
             ORDER BY c.id ASC'
        );
        $counters = $stmt->fetchAll();

        // All waiting tokens
        $stmt = $db->query(
            'SELECT t.*, s.name as service_name, d.name as department_name, u.name as customer_name
             FROM tokens t
             JOIN services s ON t.service_id = s.id
             JOIN departments d ON s.department_id = d.id
             JOIN users u ON t.user_id = u.id
             WHERE t.status IN ("waiting", "called", "in_service")
             ORDER BY t.created_at ASC'
        );
        $activeTokens = $stmt->fetchAll();

        // Department breakdown
        $stmt = $db->query(
            'SELECT d.id, d.name, d.code,
                    COUNT(DISTINCT CASE WHEN t.status = "waiting" THEN t.id END) as waiting_count,
                    COUNT(DISTINCT CASE WHEN c.status IN ("available", "busy") THEN c.id END) as active_counters,
                    COUNT(DISTINCT c.id) as total_counters
             FROM departments d
             LEFT JOIN services s ON d.id = s.department_id
             LEFT JOIN tokens t ON s.id = t.service_id
             LEFT JOIN counters c ON d.id = c.department_id
             WHERE d.status = "active"
             GROUP BY d.id
             ORDER BY d.name ASC'
        );
        $departments = $stmt->fetchAll();

        Response::success([
            'counters' => $counters,
            'active_tokens' => $activeTokens,
            'departments' => $departments
        ]);
    }

    /**
     * Counter management
     */
    public static function listCounters(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        $stmt = $db->query(
            'SELECT c.*, d.name as department_name, u.name as staff_name, u.email as staff_email
             FROM counters c
             JOIN departments d ON c.department_id = d.id
             LEFT JOIN users u ON c.staff_id = u.id
             ORDER BY c.id ASC'
        );
        Response::success($stmt->fetchAll());
    }

    public static function createCounter(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = new Validator($data);
        $validator->required('name')->required('department_id')->integer('department_id');
        $validator->validate();

        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO counters (name, department_id, staff_id, status) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $data['name'],
            $data['department_id'],
            $data['staff_id'] ?? null,
            $data['status'] ?? 'closed'
        ]);

        Response::success(['id' => (int)$db->lastInsertId()], 'Counter created', 201);
    }

    public static function updateCounter(int $id): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();

        $fields = [];
        $values = [];
        foreach (['name', 'department_id', 'staff_id', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $values[] = $data[$field] === '' ? null : $data[$field];
            }
        }
        if (empty($fields)) Response::error('No fields to update');

        $values[] = $id;
        $stmt = $db->prepare('UPDATE counters SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($values);

        Response::success(null, 'Counter updated');
    }

    public static function deleteCounter(int $id): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM counters WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Counter deleted');
    }

    /**
     * Staff management
     */
    public static function listStaff(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        $stmt = $db->query(
            'SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
                    c.id as counter_id, c.name as counter_name, d.name as department_name,
                    COUNT(DISTINCT qh.id) as total_served_today
             FROM users u
             LEFT JOIN counters c ON u.id = c.staff_id
             LEFT JOIN departments d ON c.department_id = d.id
             LEFT JOIN queue_history qh ON u.id = qh.staff_id AND qh.action = "completed" AND DATE(qh.created_at) = CURDATE()
             WHERE u.role IN ("staff", "manager")
             GROUP BY u.id
             ORDER BY u.role DESC, u.name ASC'
        );
        Response::success($stmt->fetchAll());
    }

    /**
     * Analytics reporting
     */
    public static function analytics(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        // 1. Service breakdown
        $stmt = $db->query(
            'SELECT s.name, COUNT(t.id) as token_count, 
                    AVG(TIMESTAMPDIFF(MINUTE, t.service_started_at, t.completed_at)) as avg_duration,
                    COUNT(CASE WHEN t.status = "completed" THEN 1 END) as completed_count,
                    COUNT(CASE WHEN t.status = "skipped" THEN 1 END) as skipped_count
             FROM services s
             LEFT JOIN tokens t ON s.id = t.service_id
             GROUP BY s.id
             ORDER BY token_count DESC'
        );
        $serviceBreakdown = $stmt->fetchAll();

        // 2. Department wait time analysis
        $stmt = $db->query(
            'SELECT d.name as department_name, 
                    COUNT(t.id) as total_tokens,
                    AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.called_at)) as avg_wait_time
             FROM departments d
             JOIN services s ON d.id = s.department_id
             LEFT JOIN tokens t ON s.id = t.service_id
             GROUP BY d.id
             ORDER BY total_tokens DESC'
        );
        $departmentWait = $stmt->fetchAll();

        // 3. Weekly trend (last 7 days)
        $stmt = $db->query(
            'SELECT DATE(created_at) as date, 
                    COUNT(*) as total_tokens,
                    COUNT(CASE WHEN type = "appointment" THEN 1 END) as appointments,
                    COUNT(CASE WHEN type = "walk_in" THEN 1 END) as walk_ins,
                    COUNT(CASE WHEN status = "completed" THEN 1 END) as completed
             FROM tokens
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC'
        );
        $weeklyTrend = $stmt->fetchAll();

        Response::success([
            'service_breakdown' => $serviceBreakdown,
            'department_wait' => $departmentWait,
            'weekly_trend' => $weeklyTrend
        ]);
    }

    /**
     * Branch Settings (operating hours, check-in window, branch configuration)
     */
    public static function getSettings(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $db = Database::getConnection();

        $stmt = $db->query('SELECT id, name, code, working_hours_start, working_hours_end FROM departments ORDER BY id');
        $depts = $stmt->fetchAll();

        Response::success([
            'branch_name' => 'BankFlow Main Branch (Downtown)',
            'branch_code' => 'BF-001',
            'check_in_window_minutes' => CHECK_IN_WINDOW_MINUTES,
            'polling_interval_seconds' => POLLING_INTERVAL_SECONDS,
            'max_appointments_per_user_per_day' => MAX_APPOINTMENTS_PER_USER_PER_DAY,
            'departments' => $depts
        ]);
    }

    public static function updateSettings(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();

        if (!empty($data['departments']) && is_array($data['departments'])) {
            $stmt = $db->prepare('UPDATE departments SET working_hours_start = ?, working_hours_end = ? WHERE id = ?');
            foreach ($data['departments'] as $d) {
                if (!empty($d['id'])) {
                    $stmt->execute([
                        $d['working_hours_start'] ?? '08:00:00',
                        $d['working_hours_end'] ?? '16:00:00',
                        $d['id']
                    ]);
                }
            }
        }

        Response::success(null, 'Branch settings updated successfully');
    }
}
