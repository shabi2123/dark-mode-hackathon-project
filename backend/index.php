<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Validator.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/RoleMiddleware.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/DepartmentController.php';
require_once __DIR__ . '/controllers/ServiceController.php';
require_once __DIR__ . '/controllers/AppointmentController.php';
require_once __DIR__ . '/controllers/QueueController.php';
require_once __DIR__ . '/controllers/StaffController.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/controllers/NotificationController.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Remove /api prefix if present
$uri = preg_replace('#^/api#', '', $uri);

try {
    // ------------------------------------
    // Auth Routes
    // ------------------------------------
    if ($uri === '/auth/register' && $method === 'POST') {
        AuthController::register();
    } elseif ($uri === '/auth/login' && $method === 'POST') {
        AuthController::login();
    } elseif ($uri === '/auth/me' && $method === 'GET') {
        AuthController::me();
    } elseif ($uri === '/auth/logout' && $method === 'POST') {
        AuthController::logout();
    }

    // ------------------------------------
    // Department Routes
    // ------------------------------------
    elseif ($uri === '/departments' && $method === 'GET') {
        DepartmentController::index();
    } elseif (preg_match('#^/departments/(\d+)$#', $uri, $m) && $method === 'GET') {
        DepartmentController::show((int)$m[1]);
    } elseif ($uri === '/departments' && $method === 'POST') {
        DepartmentController::store();
    } elseif (preg_match('#^/departments/(\d+)$#', $uri, $m) && $method === 'PUT') {
        DepartmentController::update((int)$m[1]);
    } elseif (preg_match('#^/departments/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        DepartmentController::delete((int)$m[1]);
    }

    // ------------------------------------
    // Service Routes
    // ------------------------------------
    elseif ($uri === '/services' && $method === 'GET') {
        ServiceController::index();
    } elseif (preg_match('#^/services/(\d+)/slots$#', $uri, $m) && $method === 'GET') {
        ServiceController::slots((int)$m[1]);
    } elseif (preg_match('#^/services/(\d+)$#', $uri, $m) && $method === 'GET') {
        ServiceController::show((int)$m[1]);
    } elseif ($uri === '/services' && $method === 'POST') {
        ServiceController::store();
    } elseif (preg_match('#^/services/(\d+)$#', $uri, $m) && $method === 'PUT') {
        ServiceController::update((int)$m[1]);
    } elseif (preg_match('#^/services/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        ServiceController::delete((int)$m[1]);
    }

    // ------------------------------------
    // Appointment Routes
    // ------------------------------------
    elseif ($uri === '/appointments' && $method === 'GET') {
        AppointmentController::index();
    } elseif ($uri === '/appointments' && $method === 'POST') {
        AppointmentController::store();
    } elseif (preg_match('#^/appointments/(\d+)$#', $uri, $m) && $method === 'GET') {
        AppointmentController::show((int)$m[1]);
    } elseif (preg_match('#^/appointments/(\d+)$#', $uri, $m) && ($method === 'PATCH' || $method === 'PUT')) {
        AppointmentController::update((int)$m[1]);
    } elseif (preg_match('#^/appointments/(\d+)/check-in$#', $uri, $m) && $method === 'POST') {
        AppointmentController::checkIn((int)$m[1]);
    }

    // ------------------------------------
    // Queue Routes (Customer)
    // ------------------------------------
    elseif ($uri === '/queue/join' && $method === 'POST') {
        QueueController::join();
    } elseif ($uri === '/queue/status' && $method === 'GET') {
        QueueController::status();
    } elseif ($uri === '/queue/cancel' && $method === 'POST') {
        QueueController::cancel();
    } elseif ($uri === '/queue/history' && $method === 'GET') {
        QueueController::history();
    }

    // ------------------------------------
    // Staff Routes
    // ------------------------------------
    elseif ($uri === '/staff/queue' && $method === 'GET') {
        StaffController::queue();
    } elseif ($uri === '/staff/counter' && $method === 'GET') {
        StaffController::myCounter();
    } elseif ($uri === '/staff/counter/status' && ($method === 'PATCH' || $method === 'POST')) {
        StaffController::updateCounterStatus();
    } elseif ($uri === '/staff/call-next' && $method === 'POST') {
        StaffController::callNext();
    } elseif ($uri === '/staff/recall' && $method === 'POST') {
        StaffController::recall();
    } elseif ($uri === '/staff/skip' && $method === 'POST') {
        StaffController::skip();
    } elseif ($uri === '/staff/start-service' && $method === 'POST') {
        StaffController::startService();
    } elseif ($uri === '/staff/complete-service' && $method === 'POST') {
        StaffController::completeService();
    }

    // ------------------------------------
    // Admin Routes
    // ------------------------------------
    elseif ($uri === '/admin/dashboard' && $method === 'GET') {
        AdminController::dashboard();
    } elseif ($uri === '/admin/queue-monitor' && $method === 'GET') {
        AdminController::queueMonitor();
    } elseif ($uri === '/admin/counters' && $method === 'GET') {
        AdminController::listCounters();
    } elseif ($uri === '/admin/counters' && $method === 'POST') {
        AdminController::createCounter();
    } elseif (preg_match('#^/admin/counters/(\d+)$#', $uri, $m) && $method === 'PUT') {
        AdminController::updateCounter((int)$m[1]);
    } elseif (preg_match('#^/admin/counters/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        AdminController::deleteCounter((int)$m[1]);
    } elseif ($uri === '/admin/staff' && $method === 'GET') {
        AdminController::listStaff();
    } elseif ($uri === '/admin/analytics' && $method === 'GET') {
        AdminController::analytics();
    } elseif ($uri === '/admin/settings' && $method === 'GET') {
        AdminController::getSettings();
    } elseif ($uri === '/admin/settings' && ($method === 'PUT' || $method === 'POST')) {
        AdminController::updateSettings();
    }

    // ------------------------------------
    // Notification Routes
    // ------------------------------------
    elseif ($uri === '/notifications' && $method === 'GET') {
        NotificationController::index();
    } elseif (preg_match('#^/notifications/(\d+)/read$#', $uri, $m) && $method === 'POST') {
        NotificationController::markRead((int)$m[1]);
    } elseif ($uri === '/notifications/read-all' && $method === 'POST') {
        NotificationController::markAllRead();
    }

    // ------------------------------------
    // Catch-All 404
    // ------------------------------------
    else {
        Response::notFound('Endpoint not found: ' . $method . ' ' . $uri);
    }
} catch (PDOException $e) {
    error_log('Database error: ' . $e->getMessage());
    Response::error('A database error occurred: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    error_log('Application error: ' . $e->getMessage());
    Response::error($e->getMessage(), 400);
}
