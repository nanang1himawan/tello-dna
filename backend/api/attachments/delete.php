<?php
/**
 * Delete attachment
 * DELETE /api/attachments/delete.php?id=1
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
    Response::error('Attachment ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get attachment
    $stmt = $db->prepare("SELECT * FROM attachments WHERE id = ?");
    $stmt->execute([$id]);
    $attachment = $stmt->fetch();
    
    if (!$attachment) {
        Response::notFound('Attachment not found');
    }
    
    // Check permission - only uploader or admin can delete
    if ($attachment['uploaded_by'] != Auth::$user['id'] && Auth::$user['role'] !== 'admin') {
        Response::forbidden('You do not have permission to delete this attachment');
    }
    
    // Delete file from disk
    $filepath = __DIR__ . '/../../' . $attachment['file_path'];
    if (file_exists($filepath)) {
        unlink($filepath);
    }
    
    // Delete from database
    $stmt = $db->prepare("DELETE FROM attachments WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Attachment deleted successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
