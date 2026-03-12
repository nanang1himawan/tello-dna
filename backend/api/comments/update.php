<?php
/**
 * Update comment
 * PUT /api/comments/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/notification.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Comment ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['content'])) {
    Response::error('Comment content is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get comment and verify ownership
    $stmt = $db->prepare("SELECT * FROM comments WHERE id = ?");
    $stmt->execute([$id]);
    $comment = $stmt->fetch();
    
    if (!$comment) {
        Response::notFound('Comment not found');
    }
    
    // Only owner can edit
    if ($comment['user_id'] != Auth::$user['id']) {
        Response::error('You can only edit your own comments', 403);
    }
    
    // Update comment
    $content = trim($input['content']);
    $attachmentName = $input['attachment_name'] ?? null;
    $attachmentPath = $input['attachment_path'] ?? null;
    
    $stmt = $db->prepare("
        UPDATE comments 
        SET content = ?, attachment_name = ?, attachment_path = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$content, $attachmentName, $attachmentPath, $id]);
    
    // Get updated comment
    $stmt = $db->prepare("
        SELECT c.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $stmt->execute([$id]);
    $updatedComment = $stmt->fetch();
    
    // Parse @mentions and notify mentioned users
    if (preg_match_all('/@\[([^\]]+)\]/', $content, $matches)) {
        $mentionedNames = array_unique($matches[1]);
        
        // Get task info for notification context
        $stmtTask = $db->prepare("
            SELECT t.id, t.title, p.name as project_name 
            FROM tasks t 
            JOIN comments cm ON cm.task_id = t.id
            JOIN columns col ON t.column_id = col.id
            JOIN boards b ON col.board_id = b.id
            JOIN projects p ON b.project_id = p.id
            WHERE cm.id = ?
        ");
        $stmtTask->execute([$id]);
        $task = $stmtTask->fetch();
        
        if ($task) {
            foreach ($mentionedNames as $mentionedName) {
                $mentionedName = trim($mentionedName);
                if (empty($mentionedName)) continue;
                
                // Look up user by name
                $stmtUser = $db->prepare("SELECT id FROM users WHERE name = ? LIMIT 1");
                $stmtUser->execute([$mentionedName]);
                $mentionedUser = $stmtUser->fetch();
                
                if ($mentionedUser && $mentionedUser['id'] != Auth::$user['id']) {
                    Notification::create(
                        $mentionedUser['id'],
                        'mention',
                        'You were mentioned',
                        Auth::$user['name'] . ' mentioned you on "' . $task['title'] . '"',
                        ['task_id' => $task['id'], 'comment_id' => (int)$id, 'project_name' => $task['project_name']]
                    );
                }
            }
        }
    }

    Response::success($updatedComment, 'Comment updated successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
