<?php
/**
 * Get single project with boards
 * GET /api/projects/show.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Project ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get project
    $stmt = $db->prepare("
        SELECT p.*, u.name as owner_name
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $project = $stmt->fetch();
    
    if (!$project) {
        Response::notFound('Project not found');
    }
    
    // Get boards
    $stmt = $db->prepare("SELECT * FROM boards WHERE project_id = ? ORDER BY created_at ASC");
    $stmt->execute([$id]);
    $project['boards'] = $stmt->fetchAll();
    
    // Get members
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.avatar, pm.role as project_role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
    ");
    $stmt->execute([$id]);
    $project['members'] = $stmt->fetchAll();

    Response::success($project);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
