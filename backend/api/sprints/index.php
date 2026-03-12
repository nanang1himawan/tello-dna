<?php
/**
 * Get all sprints for a project with their tasks
 * GET /api/sprints/index.php?project_id=1
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
    
    // Get sprints
    $stmt = $db->prepare("
        SELECT s.*,
               (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id) as task_count,
               (SELECT COUNT(*) FROM tasks t JOIN columns c ON t.column_id = c.id 
                WHERE t.sprint_id = s.id AND LOWER(c.name) IN ('done', 'selesai', 'completed')) as completed_count
        FROM sprints s
        WHERE s.project_id = ?
        ORDER BY 
            CASE s.status 
                WHEN 'active' THEN 1 
                WHEN 'planning' THEN 2 
                ELSE 3 
            END,
            s.start_date DESC
    ");
    $stmt->execute([$projectId]);
    $sprints = $stmt->fetchAll();
    
    // Get tasks for each sprint
    foreach ($sprints as &$sprint) {
        $stmt = $db->prepare("
            SELECT t.*, 
                   u.name as assignee_name,
                   c.name as column_name
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN columns c ON t.column_id = c.id
            WHERE t.sprint_id = ?
            ORDER BY t.created_at ASC
        ");
        $stmt->execute([$sprint['id']]);
        $sprint['tasks'] = $stmt->fetchAll();
    }

    Response::success($sprints);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
