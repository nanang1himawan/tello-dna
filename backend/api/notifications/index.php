<?php
/**
 * Get notifications for current user
 * GET /api/notifications/index.php
 * 
 * Query params:
 * - unread_only: 1 to get only unread
 * - limit: max results (default 20)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/notification.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === '1';
$limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;

try {
    $notifications = Notification::getForUser(Auth::$user['id'], $unreadOnly, $limit);
    $unreadCount = Notification::getUnreadCount(Auth::$user['id']);
    
    // Parse data JSON
    foreach ($notifications as &$notif) {
        $notif['data'] = $notif['data'] ? json_decode($notif['data'], true) : null;
    }

    Response::success([
        'notifications' => $notifications,
        'unread_count' => (int)$unreadCount
    ]);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
