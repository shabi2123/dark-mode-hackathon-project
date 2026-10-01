<?php
class AuthMiddleware {
    public static function authenticate(): array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['user_id'])) {
            Response::unauthorized('Please log in to continue');
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'role' => $_SESSION['user_role'],
            'name' => $_SESSION['user_name'],
            'email' => $_SESSION['user_email']
        ];
    }
    
    public static function optional(): ?array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['user_id'])) {
            return null;
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'role' => $_SESSION['user_role'],
            'name' => $_SESSION['user_name'],
            'email' => $_SESSION['user_email']
        ];
    }
}
