<?php
/**
 * Delete comment
 * DELETE /api/comments/delete.php?id=1
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
    Response::error('Comment ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM comments WHERE id = ?");
    $stmt->execute([$id]);
    $comment = $stmt->fetch();
    
    if (!$comment) {
        Response::notFound('Comment not found');
    }
    
    // Only author or admin can delete
    if ($comment['user_id'] != Auth::$user['id'] && Auth::$user['role'] !== 'admin') {
        Response::forbidden('You can only delete your own comments');
    }
    
    // Delete attachment file if exists
    if (!empty($comment['attachment_path'])) {
        $filepath = __DIR__ . '/../../' . $comment['attachment_path'];
        if (file_exists($filepath)) {
            unlink($filepath);
        }
    }
    
    $stmt = $db->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Comment deleted successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
