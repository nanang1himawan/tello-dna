<?php
/**
 * Task Labels API
 * GET /api/labels/task.php?task_id=1 - Get labels for a task
 * POST /api/labels/task.php - Add label to task
 * DELETE /api/labels/task.php?task_id=1&label_id=1 - Remove label from task
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
            SELECT l.*
            FROM labels l
            JOIN task_labels tl ON l.id = tl.label_id
            WHERE tl.task_id = ?
            ORDER BY l.name ASC
        ");
        $stmt->execute([$taskId]);
        $labels = $stmt->fetchAll();
        
        Response::success($labels);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $taskId = $input['task_id'] ?? null;
        $labelId = $input['label_id'] ?? null;
        
        if (!$taskId || !$labelId) {
            Response::error('Task ID and Label ID are required', 400);
        }
        
        $stmt = $db->prepare("INSERT IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)");
        $stmt->execute([$taskId, $labelId]);
        
        Response::success(null, 'Label added to task');
        
    } else if ($method === 'DELETE') {
        $taskId = $_GET['task_id'] ?? null;
        $labelId = $_GET['label_id'] ?? null;
        
        if (!$taskId || !$labelId) {
            Response::error('Task ID and Label ID are required', 400);
        }
        
        $stmt = $db->prepare("DELETE FROM task_labels WHERE task_id = ? AND label_id = ?");
        $stmt->execute([$taskId, $labelId]);
        
        Response::success(null, 'Label removed from task');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
