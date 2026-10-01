<?php
class DepartmentController {
    public static function index(): void {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM departments WHERE status = "active" ORDER BY name');
        Response::success($stmt->fetchAll());
    }
    
    public static function show(int $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM departments WHERE id = ?');
        $stmt->execute([$id]);
        $dept = $stmt->fetch();
        if (!$dept) Response::notFound('Department not found');
        Response::success($dept);
    }
    
    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $validator = new Validator($data);
        $validator->required('name')->required('code');
        $validator->validate();
        
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO departments (name, code, description, working_hours_start, working_hours_end) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['name'],
            strtoupper($data['code']),
            $data['description'] ?? null,
            $data['working_hours_start'] ?? '08:00:00',
            $data['working_hours_end'] ?? '16:00:00'
        ]);
        
        Response::success(['id' => (int) $db->lastInsertId()], 'Department created', 201);
    }
    
    public static function update(int $id): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();
        
        $fields = [];
        $values = [];
        foreach (['name', 'code', 'description', 'working_hours_start', 'working_hours_end', 'status'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = ?";
                $values[] = $data[$field];
            }
        }
        if (empty($fields)) Response::error('No fields to update');
        
        $values[] = $id;
        $stmt = $db->prepare('UPDATE departments SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($values);
        
        Response::success(null, 'Department updated');
    }
    
    public static function delete(int $id): void {
        $user = AuthMiddleware::authenticate();
        RoleMiddleware::requireAdmin($user);
        
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM departments WHERE id = ?');
        $stmt->execute([$id]);
        
        Response::success(null, 'Department deleted');
    }
}
