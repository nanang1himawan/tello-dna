<?php
/**
 * Toggle/Get task watchers
 * GET /api/tasks/watchers.php?task_id=1
 * POST /api/tasks/watchers.php (toggle watch)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

Auth::verify();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'GET') {
        $taskId = $_GET['task_id'] ?? null;
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        $stmt = $db->prepare("
            SELECT u.id, u.name, u.avatar
            FROM task_watchers tw
            JOIN users u ON tw.user_id = u.id
            WHERE tw.task_id = ?
        ");
        $stmt->execute([$taskId]);
        $watchers = $stmt->fetchAll();
        
        // Check if current user is watching
        $isWatching = false;
        foreach ($watchers as $w) {
            if ($w['id'] == Auth::$user['id']) {
                $isWatching = true;
                break;
            }
        }
        
        Response::success([
            'watchers' => $watchers,
            'is_watching' => $isWatching,
            'count' => count($watchers)
        ]);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $taskId = $input['task_id'] ?? null;
        
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        // Toggle watch status
        $stmt = $db->prepare("SELECT id FROM task_watchers WHERE task_id = ? AND user_id = ?");
        $stmt->execute([$taskId, Auth::$user['id']]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            $stmt = $db->prepare("DELETE FROM task_watchers WHERE id = ?");
            $stmt->execute([$existing['id']]);
            Response::success(['is_watching' => false], 'Stopped watching');
        } else {
            $stmt = $db->prepare("INSERT INTO task_watchers (task_id, user_id) VALUES (?, ?)");
            $stmt->execute([$taskId, Auth::$user['id']]);
            Response::success(['is_watching' => true], 'Now watching');
        }
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
