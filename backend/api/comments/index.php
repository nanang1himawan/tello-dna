<?php
/**
 * Get comments for a task
 * GET /api/comments/index.php?task_id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$taskId = $_GET['task_id'] ?? null;
if (!$taskId) {
    Response::error('Task ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT c.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$taskId]);
    $comments = $stmt->fetchAll();

    Response::success($comments);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
