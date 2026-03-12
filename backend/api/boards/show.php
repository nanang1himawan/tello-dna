<?php
/**
 * Get board with columns and tasks
 * GET /api/boards/show.php?id=1
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
    Response::error('Board ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get board
    $stmt = $db->prepare("
        SELECT b.*, p.name as project_name, p.color as project_color
        FROM boards b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = ?
    ");
    $stmt->execute([$id]);
    $board = $stmt->fetch();
    
    if (!$board) {
        Response::notFound('Board not found');
    }
    
    // Get columns with tasks
    $stmt = $db->prepare("SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC");
    $stmt->execute([$id]);
    $columns = $stmt->fetchAll();
    
    // Get tasks for each column
    $taskStmt = $db->prepare("
        SELECT t.*, 
               u.name as assignee_name, 
               u.avatar as assignee_avatar,
               c.name as creator_name
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        JOIN users c ON t.created_by = c.id
        WHERE t.column_id = ?
        ORDER BY t.position ASC
    ");
    
    // Labels for each task
    $labelStmt = $db->prepare("
        SELECT l.* FROM labels l
        JOIN task_labels tl ON l.id = tl.label_id
        WHERE tl.task_id = ?
        ORDER BY l.name ASC
    ");
    
    foreach ($columns as &$column) {
        $taskStmt->execute([$column['id']]);
        $column['tasks'] = $taskStmt->fetchAll();
        
        // Add labels to each task
        foreach ($column['tasks'] as &$task) {
            $labelStmt->execute([$task['id']]);
            $task['labels'] = $labelStmt->fetchAll();
        }
    }
    
    $board['columns'] = $columns;

    Response::success($board);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
