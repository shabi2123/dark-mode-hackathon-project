<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/TokenService.php';

class AppointmentService {
    /**
     * Generate appointment number: APT-YYYYMMDD-XXX
     */
    public static function generateAppointmentNumber(): string {
        $db = Database::getConnection();
        $dateStr = date('Ymd');
        $stmt = $db->prepare('SELECT COUNT(*) FROM appointments WHERE DATE(created_at) = CURDATE()');
        $stmt->execute();
        $seq = (int)$stmt->fetchColumn() + 1;
        return sprintf('APT-%s-%03d', $dateStr, $seq);
    }

    /**
     * Book appointment with readiness check data
     */
    public static function book(
        int $userId,
        int $serviceId,
        string $date,
        string $startTime,
        ?string $notes = null,
        int $readinessPercentage = 100,
        string $readinessStatus = 'READY',
        $missingRequirements = null
    ): array {
        if (is_array($missingRequirements)) {
            $missingRequirements = json_encode($missingRequirements, JSON_UNESCAPED_UNICODE);
        }

        $db = Database::getConnection();

        // 1. Validate date not in the past
        if ($date < date('Y-m-d')) {
            throw new Exception('Cannot book an appointment for a past date');
        }

        // 2. Check user appointment count for the day
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM appointments 
             WHERE user_id = ? AND appointment_date = ? AND status NOT IN ("cancelled", "missed")'
        );
        $stmt->execute([$userId, $date]);
        $userDailyCount = (int)$stmt->fetchColumn();
        if ($userDailyCount >= MAX_APPOINTMENTS_PER_USER_PER_DAY) {
            throw new Exception('Maximum appointments reached for this date (' . MAX_APPOINTMENTS_PER_USER_PER_DAY . ')');
        }

        // 3. Prevent duplicate active booking for same user and service on same date
        $stmt = $db->prepare(
            'SELECT id FROM appointments 
             WHERE user_id = ? AND service_id = ? AND appointment_date = ? AND status NOT IN ("cancelled", "missed")'
        );
        $stmt->execute([$userId, $serviceId, $date]);
        if ($stmt->fetch()) {
            throw new Exception('You already have a booking for this service on this date');
        }

        // 4. Get service & department info
        $stmt = $db->prepare(
            'SELECT s.avg_duration_minutes, s.max_daily_appointments, d.working_hours_start, d.working_hours_end 
             FROM services s JOIN departments d ON s.department_id = d.id WHERE s.id = ?'
        );
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch();
        if (!$service) {
            throw new Exception('Service not found');
        }

        // 5. Validate within working hours
        $startDt = new DateTime("{$date} {$startTime}");
        $duration = (int)$service['avg_duration_minutes'];
        $endDt = clone $startDt;
        $endDt->modify("+{$duration} minutes");
        $endTime = $endDt->format('H:i:s');

        $whStart = new DateTime("{$date} {$service['working_hours_start']}");
        $whEnd = new DateTime("{$date} {$service['working_hours_end']}");

        if ($startDt < $whStart || $endDt > $whEnd) {
            throw new Exception('Selected time is outside working hours');
        }

        // 6. Check slot capacity (prevent overbooking)
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM appointments 
             WHERE service_id = ? AND appointment_date = ? AND start_time = ? AND status NOT IN ("cancelled", "missed")'
        );
        $stmt->execute([$serviceId, $date, $startTime]);
        $slotCount = (int)$stmt->fetchColumn();
        $maxPerSlot = (int)$service['max_daily_appointments'];
        if ($slotCount >= $maxPerSlot) {
            throw new Exception('This time slot is fully booked');
        }

        // 7. Insert appointment with readiness status
        $aptNumber = self::generateAppointmentNumber();
        $stmt = $db->prepare(
            'INSERT INTO appointments (user_id, service_id, appointment_date, start_time, end_time, status, appointment_number, notes, readiness_percentage, readiness_status, missing_requirements) 
             VALUES (?, ?, ?, ?, ?, "booked", ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId,
            $serviceId,
            $date,
            $startTime,
            $endTime,
            $aptNumber,
            $notes,
            $readinessPercentage,
            $readinessStatus,
            $missingRequirements
        ]);

        $aptId = (int)$db->lastInsertId();

        // Notification
        $notifStmt = $db->prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "appointment")');
        $notifStmt->execute([
            $userId,
            'Appointment Confirmed',
            "Your appointment {$aptNumber} is confirmed for {$date} at {$startTime}. Document Readiness: {$readinessStatus}."
        ]);

        return [
            'id' => $aptId,
            'appointment_number' => $aptNumber,
            'appointment_date' => $date,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'status' => 'booked',
            'readiness_percentage' => $readinessPercentage,
            'readiness_status' => $readinessStatus
        ];
    }

    /**
     * Check-in an appointment on arrival
     */
    public static function checkIn(int $aptId, int $userId): array {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?');
        $stmt->execute([$aptId, $userId]);
        $apt = $stmt->fetch();
        if (!$apt) {
            throw new Exception('Appointment not found');
        }

        if ($apt['status'] === 'checked_in' || $apt['status'] === 'waiting') {
            throw new Exception('Appointment already checked in');
        }

        if (!in_array($apt['status'], ['booked', 'confirmed', 'rescheduled'])) {
            throw new Exception("Cannot check in an appointment with status: {$apt['status']}");
        }

        // Check if date is today
        $today = date('Y-m-d');
        if ($apt['appointment_date'] !== $today) {
            throw new Exception("Check-in is only available on the day of the appointment ({$apt['appointment_date']})");
        }

        // Generate token for checked-in appointment, passing along customer readiness info
        $token = TokenService::createToken(
            $userId,
            (int)$apt['service_id'],
            'appointment',
            $aptId,
            (int)$apt['readiness_percentage'],
            $apt['readiness_status'],
            $apt['missing_requirements']
        );

        // Update appointment status
        $stmt = $db->prepare(
            'UPDATE appointments SET status = "checked_in", check_in_time = CURRENT_TIMESTAMP WHERE id = ?'
        );
        $stmt->execute([$aptId]);

        return [
            'appointment_id' => $aptId,
            'status' => 'checked_in',
            'token' => $token
        ];
    }
}
