<?php
class ServiceController {
    public static function index(): void {
        $db = Database::getConnection();
        $departmentId = $_GET['department_id'] ?? null;
        
        $sql = 'SELECT s.*, d.name as department_name, d.code as department_code 
                FROM services s 
                JOIN departments d ON s.department_id = d.id 
                WHERE s.status = "active"';
        $params = [];
        
        if ($departmentId) {
            $sql .= ' AND s.department_id = ?';
            $params[] = $departmentId;
        }
        $sql .= ' ORDER BY d.name, s.name';
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $services = $stmt->fetchAll();
        foreach ($services as &$s) {
            $s['requirements'] = !empty($s['requirements']) ? json_decode($s['requirements'], true) : [];
        }
        Response::success($services);
    }
    
    public static function show(int $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT s.*, d.name as department_name, d.code as department_code 
             FROM services s JOIN departments d ON s.department_id = d.id 
             WHERE s.id = ?'
        );
        $stmt->execute([$id]);
        $service = $stmt->fetch();
        if (!$service) Response::notFound('Service not found');
        $service['requirements'] = !empty($service['requirements']) ? json_decode($service['requirements'], true) : [];
        Response::success($service);
    }
    
    public static function slots(int $id): void {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT s.avg_duration_minutes, s.max_daily_appointments, d.working_hours_start, d.working_hours_end 
             FROM services s JOIN departments d ON s.department_id = d.id WHERE s.id = ?'
        );
        $stmt->execute([$id]);
        $service = $stmt->fetch();
        if (!$service) Response::notFound('Service not found');
        
        $stmt = $db->prepare(
            'SELECT start_time FROM appointments 
             WHERE service_id = ? AND appointment_date = ? AND status NOT IN ("cancelled", "missed")'
        );
        $stmt->execute([$id, $date]);
        $booked = array_column($stmt->fetchAll(), 'start_time');
        
        $slots = [];
        $start = new DateTime($service['working_hours_start']);
        $end = new DateTime($service['working_hours_end']);
        $duration = (int) $service['avg_duration_minutes'];
        $maxPerSlot = (int) $service['max_daily_appointments'];
        
        while ($start < $end) {
            $timeStr = $start->format('H:i');
            $bookedCount = count(array_filter($booked, fn($t) => substr($t, 0, 5) === $timeStr));
            
            if ($bookedCount < $maxPerSlot) {
                $slotEnd = clone $start;
                $slotEnd->modify("+{$duration} minutes");
                $slots[] = [
                    'start_time' => $timeStr,
                    'end_time' => $slotEnd->format('H:i'),
                    'available' => $maxPerSlot - $bookedCount
                ];
            }
            $start->modify("+{$duration} minutes");
        }
        
        Response::success($slots);
    }
    
    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $validator = new Validator($data);
        $validator->required('name')->required('department_id')->integer('department_id');
        $validator->validate();
        
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO services (department_id, name, description, avg_duration_minutes, max_daily_appointments) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['department_id'],
            $data['name'],
            $data['description'] ?? null,
            $data['avg_duration_minutes'] ?? 10,
            $data['max_daily_appointments'] ?? 20
        ]);
        
        Response::success(['id' => (int) $db->lastInsertId()], 'Service created', 201);
    }
    
    public static function update(int $id): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();
        
        $fields = [];
        $values = [];
        foreach (['name', 'description', 'department_id', 'avg_duration_minutes', 'max_daily_appointments', 'status'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = ?";
                $values[] = $data[$field];
            }
        }
        if (empty($fields)) Response::error('No fields to update');
        
        $values[] = $id;
        $stmt = $db->prepare('UPDATE services SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($values);
        
        Response::success(null, 'Service updated');
    }
    
    public static function delete(int $id): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM services WHERE id = ?');
        $stmt->execute([$id]);
        Response::success(null, 'Service deleted');
    }
}
