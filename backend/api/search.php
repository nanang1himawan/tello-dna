<?php
/**
 * Search API
 * GET /api/search.php?q=keyword - Search tasks and projects
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

Auth::verify();

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    Response::success(['tasks' => [], 'projects' => []]);
}

try {
    $db = Database::getInstance()->getConnection();
    $userId = Auth::$user['id'];
    $searchTerm = '%' . $query . '%';
    
    // Search tasks
    $taskStmt = $db->prepare("
        SELECT 
            t.id, t.title, t.type, t.severity,
            p.id as project_id, p.name as project_name,
            u.name as assignee_name
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE (t.title LIKE ? OR t.description LIKE ?)
        ORDER BY t.updated_at DESC
        LIMIT 10
    ");
    $taskStmt->execute([$searchTerm, $searchTerm]);
    $tasks = $taskStmt->fetchAll();
    
    // Search projects
    $projectStmt = $db->prepare("
        SELECT id, name, `key`, description
        FROM projects
        WHERE name LIKE ? OR `key` LIKE ? OR description LIKE ?
        ORDER BY name ASC
        LIMIT 5
    ");
    $projectStmt->execute([$searchTerm, $searchTerm, $searchTerm]);
    $projects = $projectStmt->fetchAll();
    
    Response::success([
        'tasks' => $tasks,
        'projects' => $projects
    ]);

} catch (PDOException $e) {
    Response::error('Search failed: ' . $e->getMessage(), 500);
}
