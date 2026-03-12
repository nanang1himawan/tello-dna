<?php
/**
 * Delete task
 * DELETE /api/tasks/delete.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Task ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$id]);
    $task = $stmt->fetch();
    
    if (!$task) {
        Response::notFound('Task not found');
    }
    
    // Check permission - only creator, assignee, admin, or manager can delete
    $canDelete = false;
    $role = Auth::$user['role'];
    $userId = Auth::$user['id'];
    
    if ($role === 'admin' || $role === 'manager') {
        $canDelete = true;
    } else if ($task['created_by'] == $userId || $task['assignee_id'] == $userId) {
        $canDelete = true;
    }
    
    if (!$canDelete) {
        Response::forbidden('You do not have permission to delete this task');
    }
    
    $columnId = $task['column_id'];
    $position = $task['position'];
    
    // Delete task
    $stmt = $db->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->execute([$id]);
    
    // Shift positions
    $stmt = $db->prepare("
        UPDATE tasks 
        SET position = position - 1 
        WHERE column_id = ? AND position > ?
    ");
    $stmt->execute([$columnId, $position]);

    Response::success(null, 'Task deleted successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
