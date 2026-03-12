<?php
/**
 * Get attachments for a task
 * GET /api/attachments/index.php?task_id=1
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
        SELECT a.*, u.name as uploader_name, u.avatar as uploader_avatar
        FROM attachments a
        JOIN users u ON a.uploaded_by = u.id
        WHERE a.task_id = ?
        ORDER BY a.created_at DESC
    ");
    $stmt->execute([$taskId]);
    $attachments = $stmt->fetchAll();
    
    // Add full URL for each attachment
    $baseUrl = 'http://localhost:8080/project-gemini/project-03/backend/';
    foreach ($attachments as &$att) {
        $att['url'] = $baseUrl . $att['file_path'];
        $att['size_formatted'] = formatBytes($att['file_size']);
    }

    Response::success($attachments);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}
