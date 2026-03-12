<?php
/**
 * Mark notification(s) as read
 * POST /api/notifications/read.php
 * 
 * Body:
 * - id: single notification ID, OR
 * - all: true to mark all as read
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/notification.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$input = json_decode(file_get_contents('php://input'), true);

try {
    if (isset($input['all']) && $input['all'] === true) {
        Notification::markAllAsRead(Auth::$user['id']);
        Response::success(null, 'All notifications marked as read');
    } else if (isset($input['id'])) {
        Notification::markAsRead($input['id'], Auth::$user['id']);
        Response::success(null, 'Notification marked as read');
    } else {
        Response::error('Missing id or all parameter', 400);
    }

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
