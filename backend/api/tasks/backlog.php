<?php
/**
 * Get backlog tasks (not assigned to any sprint) for a project
 * GET /api/tasks/backlog.php?project_id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$projectId = $_GET['project_id'] ?? null;
if (!$projectId) {
    Response::error('Project ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get tasks from this project that are not in any sprint
    $stmt = $db->prepare("
        SELECT t.*, 
               u.name as assignee_name,
               c.name as column_name
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE b.project_id = ?
        AND (t.sprint_id IS NULL OR t.sprint_id = 0)
        ORDER BY t.created_at DESC
    ");
    $stmt->execute([$projectId]);
    $tasks = $stmt->fetchAll();

    Response::success($tasks);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
