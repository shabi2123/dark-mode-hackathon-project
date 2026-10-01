<?php
class AuthController {
    public static function register(): void {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = new Validator($data);
        $validator
            ->required('name', 'Name')
            ->required('email', 'Email')
            ->email('email')
            ->required('password', 'Password')
            ->minLength('password', 6, 'Password');
        $validator->validate();
        
        $db = Database::getConnection();
        
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$data['email']]);
        if ($stmt->fetch()) {
            Response::error('Email already registered', 409);
        }
        
        $stmt = $db->prepare(
            'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            trim($data['name']),
            strtolower(trim($data['email'])),
            $data['phone'] ?? null,
            password_hash($data['password'], PASSWORD_BCRYPT),
            'customer'
        ]);
        
        $userId = (int) $db->lastInsertId();
        
        if (session_status() === PHP_SESSION_NONE) session_start();
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_role'] = 'customer';
        $_SESSION['user_name'] = trim($data['name']);
        $_SESSION['user_email'] = strtolower(trim($data['email']));
        
        Response::success([
            'id' => $userId,
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'role' => 'customer'
        ], 'Registration successful', 201);
    }
    
    public static function login(): void {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = new Validator($data);
        $validator
            ->required('email', 'Email')
            ->required('password', 'Password');
        $validator->validate();
        
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ? AND status = ?');
        $stmt->execute([strtolower(trim($data['email'])), 'active']);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }
        
        if (session_status() === PHP_SESSION_NONE) session_start();
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        
        Response::success([
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role']
        ], 'Login successful');
    }
    
    public static function me(): void {
        $user = AuthMiddleware::authenticate();
        Response::success($user);
    }
    
    public static function logout(): void {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_destroy();
        Response::success(null, 'Logged out successfully');
    }
}
