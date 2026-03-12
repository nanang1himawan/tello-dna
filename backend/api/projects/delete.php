<?php
/**
 * Delete project
 * DELETE /api/projects/delete.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    Response::error('Method not allowed', 405);
}

Auth::verify();
RBAC::can('delete_project');

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Project ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$id]);
    $project = $stmt->fetch();
    
    if (!$project) {
        Response::notFound('Project not found');
    }
    
    // Only owner or admin can delete
    if ($project['owner_id'] != Auth::$user['id'] && Auth::$user['role'] !== 'admin') {
        Response::forbidden('You do not have permission to delete this project');
    }
    
    $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, "Project '{$project['name']}' deleted successfully");

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
