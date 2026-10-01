<?php
class Response {
    public static function json($data, int $status = 200): void {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    public static function success($data = null, string $message = 'Success', int $status = 200): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }
    
    public static function error(string $message, int $status = 400, $errors = null): void {
        $response = [
            'success' => false,
            'message' => $message
        ];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        self::json($response, $status);
    }
    
    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }
    
    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }
    
    public static function notFound(string $message = 'Not found'): void {
        self::error($message, 404);
    }
    
    public static function validationError(array $errors): void {
        self::error('Validation failed', 422, $errors);
    }
}
