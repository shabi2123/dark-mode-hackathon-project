<?php
class RoleMiddleware {
    public static function requireRole(array $user, string ...$roles): void {
        if (!in_array($user['role'], $roles)) {
            Response::forbidden('You do not have permission to access this resource');
        }
    }
    
    public static function requireStaff(array $user): void {
        self::requireRole($user, 'staff', 'manager', 'admin');
    }
    
    public static function requireAdmin(array $user): void {
        self::requireRole($user, 'manager', 'admin');
    }
}
