<?php
/**
 * Upload file attachment
 * POST /api/attachments/upload.php
 * 
 * Multipart form data:
 * - file: The file to upload
 * - task_id: Associated task ID
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    Response::error('No file uploaded or upload error', 400);
}

$taskId = $_POST['task_id'] ?? null;
if (!$taskId) {
    Response::error('Task ID is required', 400);
}

$file = $_FILES['file'];
$maxSize = 10 * 1024 * 1024; // 10MB

if ($file['size'] > $maxSize) {
    Response::error('File too large. Max 10MB allowed.', 400);
}

// Allowed file types
$allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    Response::error('File type not allowed', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify task exists
    $stmt = $db->prepare("SELECT id FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    if (!$stmt->fetch()) {
        Response::notFound('Task not found');
    }
    
    // Create uploads directory if not exists
    $uploadDir = __DIR__ . '/../../uploads/attachments/' . date('Y/m');
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . '/' . $filename;
    $relativePath = 'uploads/attachments/' . date('Y/m') . '/' . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        Response::error('Failed to save file', 500);
    }
    
    // Save to database
    $stmt = $db->prepare("
        INSERT INTO attachments (task_id, filename, original_name, file_path, file_size, mime_type, uploaded_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $taskId,
        $filename,
        $file['name'],
        $relativePath,
        $file['size'],
        $mimeType,
        Auth::$user['id']
    ]);
    
    $attachmentId = $db->lastInsertId();
    
    // Get created attachment
    $stmt = $db->prepare("
        SELECT a.*, u.name as uploader_name
        FROM attachments a
        JOIN users u ON a.uploaded_by = u.id
        WHERE a.id = ?
    ");
    $stmt->execute([$attachmentId]);
    $attachment = $stmt->fetch();

    Response::created($attachment, 'File uploaded successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
