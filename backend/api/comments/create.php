<?php
/**
 * Create new comment
 * POST /api/comments/create.php
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

if (empty($input['task_id'])) {
    Response::error('Task ID is required', 400);
}

if (empty($input['content'])) {
    Response::error('Comment content is required', 400);
}

$taskId = $input['task_id'];
$content = trim($input['content']);

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify task exists and get info
    $stmt = $db->prepare("
        SELECT t.*, c.name as column_name, b.project_id, p.name as project_name
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        Response::notFound('Task not found');
    }
    
    // Create comment
    $attachmentName = $input['attachment_name'] ?? null;
    $attachmentPath = $input['attachment_path'] ?? null;
    
    $stmt = $db->prepare("
        INSERT INTO comments (task_id, user_id, content, attachment_name, attachment_path) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$taskId, Auth::$user['id'], $content, $attachmentName, $attachmentPath]);
    $commentId = $db->lastInsertId();
    
    // Get created comment
    $stmt = $db->prepare("
        SELECT c.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();
    
    // Notify task assignee and creator (if not self)
    $notifyUsers = [];
    if ($task['assignee_id'] && $task['assignee_id'] != Auth::$user['id']) {
        $notifyUsers[] = (int)$task['assignee_id'];
    }
    if ($task['created_by'] != Auth::$user['id'] && !in_array((int)$task['created_by'], $notifyUsers)) {
        $notifyUsers[] = (int)$task['created_by'];
    }
    
    foreach ($notifyUsers as $userId) {
        Notification::create(
            $userId,
            'comment',
            'New Comment',
            Auth::$user['name'] . ' commented on "' . $task['title'] . '"',
            ['task_id' => $taskId, 'comment_id' => $commentId, 'project_id' => $task['project_id'], 'project_name' => $task['project_name']]
        );
    }
    
    // Parse @mentions and notify mentioned users
    if (preg_match_all('/@\[([^\]]+)\]/', $content, $matches)) {
        $mentionedNames = array_unique($matches[1]);
        
        foreach ($mentionedNames as $mentionedName) {
            $mentionedName = trim($mentionedName);
            if (empty($mentionedName)) continue;
            
            // Look up user by name
            $stmtUser = $db->prepare("SELECT id FROM users WHERE name = ? LIMIT 1");
            $stmtUser->execute([$mentionedName]);
            $mentionedUser = $stmtUser->fetch();
            
            if ($mentionedUser && $mentionedUser['id'] != Auth::$user['id'] && !in_array((int)$mentionedUser['id'], $notifyUsers)) {
                Notification::create(
                    $mentionedUser['id'],
                    'mention',
                    'You were mentioned',
                    Auth::$user['name'] . ' mentioned you on "' . $task['title'] . '"',
                    ['task_id' => $taskId, 'comment_id' => $commentId, 'project_id' => $task['project_id'], 'project_name' => $task['project_name']]
                );
            }
        }
    }

    Response::created($comment, 'Comment added successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
