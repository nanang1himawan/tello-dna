<?php
/**
 * Delete sprint
 * DELETE /api/sprints/delete.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Only admin can delete sprints
if (Auth::$user['role'] !== 'admin') {
    Response::forbidden('Only admin can delete sprints');
}

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Sprint ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM sprints WHERE id = ?");
    $stmt->execute([$id]);
    $sprint = $stmt->fetch();
    
    if (!$sprint) {
        Response::notFound('Sprint not found');
    }
    
    // Remove sprint_id from tasks (move back to backlog)
    $stmt = $db->prepare("UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?");
    $stmt->execute([$id]);
    
    // Delete sprint
    $stmt = $db->prepare("DELETE FROM sprints WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Sprint deleted successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
