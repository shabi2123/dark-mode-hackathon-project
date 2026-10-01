<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class NotificationController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
        );
        $stmt->execute([$user['id']]);
        Response::success($stmt->fetchAll());
    }

    public static function markRead(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $user['id']]);
        Response::success(null, 'Notification marked as read');
    }

    public static function markAllRead(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        Response::success(null, 'All notifications marked as read');
    }
}
