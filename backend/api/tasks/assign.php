<?php
/**
 * Assign task to user
 * POST /api/tasks/assign.php
 * 
 * Body: { task_id, assignee_id }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['task_id'])) {
    Response::error('Task ID is required', 400);
}

$taskId = $input['task_id'];
$assigneeId = $input['assignee_id'] ?? null; // null to unassign

try {
    $db = Database::getInstance()->getConnection();
    
    // Get task
    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        Response::notFound('Task not found');
    }
    
    $oldAssigneeId = $task['assignee_id'];
    
    // If assigning to someone, verify user exists
    $assigneeName = null;
    if ($assigneeId) {
        $stmt = $db->prepare("SELECT id, name FROM users WHERE id = ?");
        $stmt->execute([$assigneeId]);
        $assignee = $stmt->fetch();
        
        if (!$assignee) {
            Response::notFound('User not found');
        }
        $assigneeName = $assignee['name'];
    }
    
    // Update task
    $stmt = $db->prepare("UPDATE tasks SET assignee_id = ? WHERE id = ?");
    $stmt->execute([$assigneeId, $taskId]);
    
    // Log the assignment
    AuditLog::log(
        'task',
        $taskId,
        'assign',
        Auth::$user['id'],
        ['assignee_id' => $oldAssigneeId],
        ['assignee_id' => $assigneeId, 'assignee_name' => $assigneeName]
    );
    
    // Get updated task
    $stmt = $db->prepare("
        SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $updatedTask = $stmt->fetch();

    $message = $assigneeName 
        ? "Task berhasil di-assign ke {$assigneeName}" 
        : "Task berhasil di-unassign";
    
    Response::success($updatedTask, $message);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
