<?php
/**
 * Get/Add/Remove task members
 * GET /api/tasks/members.php?task_id=1
 * POST /api/tasks/members.php (add member)
 * DELETE /api/tasks/members.php?task_id=1&user_id=2
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/notification.php';

Auth::verify();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'GET') {
        // Get members of a task
        $taskId = $_GET['task_id'] ?? null;
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        $stmt = $db->prepare("
            SELECT u.id, u.name, u.email, u.avatar, u.role, tm.joined_at
            FROM task_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.task_id = ?
            ORDER BY tm.joined_at ASC
        ");
        $stmt->execute([$taskId]);
        $members = $stmt->fetchAll();
        
        Response::success($members);
        
    } else if ($method === 'POST') {
        // Add member to task
        $input = json_decode(file_get_contents('php://input'), true);
        
        $taskId = $input['task_id'] ?? null;
        $userId = $input['user_id'] ?? null;
        
        if (!$taskId || !$userId) {
            Response::error('Task ID and User ID are required', 400);
        }
        
        // Verify task exists
        $stmt = $db->prepare("SELECT t.*, c.board_id FROM tasks t JOIN columns c ON t.column_id = c.id WHERE t.id = ?");
        $stmt->execute([$taskId]);
        $task = $stmt->fetch();
        if (!$task) {
            Response::notFound('Task not found');
        }
        
        // Verify user exists
        $stmt = $db->prepare("SELECT id, name FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::notFound('User not found');
        }
        
        // Add member
        $stmt = $db->prepare("INSERT IGNORE INTO task_members (task_id, user_id) VALUES (?, ?)");
        $stmt->execute([$taskId, $userId]);
        
        // Also update assignee_id for backward compatibility (use first member)
        if ($stmt->rowCount() > 0) {
            $stmt = $db->prepare("SELECT user_id FROM task_members WHERE task_id = ? ORDER BY joined_at ASC LIMIT 1");
            $stmt->execute([$taskId]);
            $firstMember = $stmt->fetch();
            if ($firstMember) {
                $db->prepare("UPDATE tasks SET assignee_id = ? WHERE id = ?")->execute([$firstMember['user_id'], $taskId]);
            }
            
            // Notify the added user
            if ($userId != Auth::$user['id']) {
                Notification::create(
                    $userId,
                    'assign',
                    'Ditambahkan ke Task',
                    Auth::$user['name'] . ' menambahkan Anda ke task "' . $task['title'] . '"',
                    ['task_id' => $taskId]
                );
            }
        }
        
        Response::success(['message' => 'Member added successfully']);
        
    } else if ($method === 'DELETE') {
        // Remove member from task
        $taskId = $_GET['task_id'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        
        if (!$taskId || !$userId) {
            Response::error('Task ID and User ID are required', 400);
        }
        
        $stmt = $db->prepare("DELETE FROM task_members WHERE task_id = ? AND user_id = ?");
        $stmt->execute([$taskId, $userId]);
        
        // Update assignee_id to next available member or null
        $stmt = $db->prepare("SELECT user_id FROM task_members WHERE task_id = ? ORDER BY joined_at ASC LIMIT 1");
        $stmt->execute([$taskId]);
        $firstMember = $stmt->fetch();
        $newAssigneeId = $firstMember ? $firstMember['user_id'] : null;
        $db->prepare("UPDATE tasks SET assignee_id = ? WHERE id = ?")->execute([$newAssigneeId, $taskId]);
        
        Response::success(['message' => 'Member removed successfully']);
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
