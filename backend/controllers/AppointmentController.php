<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/AppointmentService.php';

class AppointmentController {
    /**
     * List appointments
     */
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $params = [];
        $sql = 'SELECT a.*, s.name as service_name, s.avg_duration_minutes, d.name as department_name, d.code as department_code, u.name as user_name, u.email as user_email, u.phone as user_phone, t.token_number, t.status as token_status
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                JOIN departments d ON s.department_id = d.id
                JOIN users u ON a.user_id = u.id
                LEFT JOIN tokens t ON a.id = t.appointment_id';

        if ($user['role'] === 'customer') {
            $sql .= ' WHERE a.user_id = ?';
            $params[] = $user['id'];
        } else {
            // Staff / admin can filter
            $where = [];
            if (!empty($_GET['date'])) {
                $where[] = 'a.appointment_date = ?';
                $params[] = $_GET['date'];
            }
            if (!empty($_GET['service_id'])) {
                $where[] = 'a.service_id = ?';
                $params[] = $_GET['service_id'];
            }
            if (!empty($_GET['status'])) {
                $where[] = 'a.status = ?';
                $params[] = $_GET['status'];
            }
            if (!empty($where)) {
                $sql .= ' WHERE ' . implode(' AND ', $where);
            }
        }

        $sql .= ' ORDER BY a.appointment_date DESC, a.start_time DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    /**
     * Show single appointment
     */
    public static function show(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT a.*, s.name as service_name, s.avg_duration_minutes, d.name as department_name, d.code as department_code, u.name as user_name, u.email as user_email, t.token_number, t.status as token_status
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             JOIN departments d ON s.department_id = d.id
             JOIN users u ON a.user_id = u.id
             LEFT JOIN tokens t ON a.id = t.appointment_id
             WHERE a.id = ?'
        );
        $stmt->execute([$id]);
        $apt = $stmt->fetch();

        if (!$apt) {
            Response::notFound('Appointment not found');
        }

        if ($user['role'] === 'customer' && (int)$apt['user_id'] !== (int)$user['id']) {
            Response::forbidden('Access denied');
        }

        Response::success($apt);
    }

    /**
     * Book appointment
     */
    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = new Validator($data);
        $validator
            ->required('service_id', 'Service')
            ->integer('service_id', 'Service')
            ->required('appointment_date', 'Date')
            ->date('appointment_date', 'Date')
            ->required('start_time', 'Time')
            ->time('start_time', 'Time');
        $validator->validate();

        try {
            $result = AppointmentService::book(
                (int)$user['id'],
                (int)$data['service_id'],
                $data['appointment_date'],
                $data['start_time'],
                $data['notes'] ?? null,
                isset($data['readiness_percentage']) ? (int)$data['readiness_percentage'] : 100,
                $data['readiness_status'] ?? 'READY',
                $data['missing_requirements'] ?? null
            );
            Response::success($result, 'Appointment booked successfully', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /**
     * Cancel or reschedule appointment
     */
    public static function update(int $id): void {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $apt = $stmt->fetch();
        if (!$apt) {
            Response::notFound('Appointment not found');
        }

        if ($user['role'] === 'customer' && (int)$apt['user_id'] !== (int)$user['id']) {
            Response::forbidden('Access denied');
        }

        $action = $data['action'] ?? null;

        if ($action === 'cancel') {
            if (in_array($apt['status'], ['completed', 'cancelled', 'in_service'])) {
                Response::error("Cannot cancel an appointment that is {$apt['status']}");
            }

            $stmt = $db->prepare('UPDATE appointments SET status = "cancelled" WHERE id = ?');
            $stmt->execute([$id]);

            // Cancel any associated active token
            $stmt = $db->prepare('UPDATE tokens SET status = "cancelled" WHERE appointment_id = ? AND status = "waiting"');
            $stmt->execute([$id]);

            // Add notification
            $notif = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "appointment")');
            $notif->execute([$apt['user_id'], 'Appointment Cancelled', "Your appointment {$apt['appointment_number']} has been cancelled."]);

            Response::success(null, 'Appointment cancelled');
        } elseif ($action === 'reschedule') {
            $validator = new Validator($data);
            $validator
                ->required('appointment_date', 'Date')
                ->date('appointment_date', 'Date')
                ->required('start_time', 'Time')
                ->time('start_time', 'Time');
            $validator->validate();

            if (in_array($apt['status'], ['completed', 'cancelled', 'in_service'])) {
                Response::error("Cannot reschedule an appointment that is {$apt['status']}");
            }

            // Check availability for new date/time
            $stmt = $db->prepare(
                'SELECT COUNT(*) FROM appointments 
                 WHERE service_id = ? AND appointment_date = ? AND start_time = ? AND id != ? AND status NOT IN ("cancelled", "missed")'
            );
            $stmt->execute([$apt['service_id'], $data['appointment_date'], $data['start_time'], $id]);
            if ((int)$stmt->fetchColumn() >= 20) {
                Response::error('Selected slot is full');
            }

            // Calculate new end time based on service duration
            $sStmt = $db->prepare('SELECT avg_duration_minutes FROM services WHERE id = ?');
            $sStmt->execute([$apt['service_id']]);
            $duration = (int)$sStmt->fetchColumn() ?: 15;
            $dt = new DateTime("{$data['appointment_date']} {$data['start_time']}");
            $dt->modify("+{$duration} minutes");
            $newEndTime = $dt->format('H:i:s');

            $stmt = $db->prepare(
                'UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ?, status = "rescheduled" WHERE id = ?'
            );
            $stmt->execute([$data['appointment_date'], $data['start_time'], $newEndTime, $id]);

            Response::success(null, 'Appointment rescheduled');
        } else {
            Response::error('Invalid action. Use "cancel" or "reschedule".');
        }
    }

    /**
     * Check-in on arrival
     */
    public static function checkIn(int $id): void {
        $user = AuthMiddleware::authenticate();
        try {
            $res = AppointmentService::checkIn($id, (int)$user['id']);
            Response::success($res, 'Checked in successfully! Your token has been generated.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
}
