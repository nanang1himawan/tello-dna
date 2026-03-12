<?php
/**
 * Task Dependencies API
 * GET /api/tasks/dependencies.php?task_id=1 - Get dependencies for a task
 * POST /api/tasks/dependencies.php - Create dependency
 * DELETE /api/tasks/dependencies.php?id=1 - Remove dependency
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

Auth::verify();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'GET') {
        $taskId = $_GET['task_id'] ?? null;
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        // Get tasks that this task depends on (blockers)
        $stmtBlocking = $db->prepare("
            SELECT td.*, t.title as task_title, t.type as task_type, 
                   c.name as column_name, u.name as created_by_name
            FROM task_dependencies td
            JOIN tasks t ON td.depends_on_id = t.id
            JOIN columns c ON t.column_id = c.id
            LEFT JOIN users u ON td.created_by = u.id
            WHERE td.task_id = ?
            ORDER BY td.created_at DESC
        ");
        $stmtBlocking->execute([$taskId]);
        $blocking = $stmtBlocking->fetchAll();
        
        // Get tasks that are blocked by this task
        $stmtBlocked = $db->prepare("
            SELECT td.*, t.title as task_title, t.type as task_type,
                   c.name as column_name, u.name as created_by_name
            FROM task_dependencies td
            JOIN tasks t ON td.task_id = t.id
            JOIN columns c ON t.column_id = c.id
            LEFT JOIN users u ON td.created_by = u.id
            WHERE td.depends_on_id = ?
            ORDER BY td.created_at DESC
        ");
        $stmtBlocked->execute([$taskId]);
        $blocked = $stmtBlocked->fetchAll();
        
        Response::success([
            'blocking' => $blocking,   // Tasks that block this task
            'blocked_by' => $blocked   // Tasks blocked by this task
        ]);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $taskId = $input['task_id'] ?? null;
        $dependsOnId = $input['depends_on_id'] ?? null;
        $type = $input['type'] ?? 'blocks';
        
        if (!$taskId || !$dependsOnId) {
            Response::error('Task ID and depends_on_id are required', 400);
        }
        
        if ($taskId == $dependsOnId) {
            Response::error('A task cannot depend on itself', 400);
        }
        
        // Validate type
        if (!in_array($type, ['blocks', 'is_blocked_by', 'relates_to'])) {
            $type = 'blocks';
        }
        
        // Check for circular dependency
        $stmtCircular = $db->prepare("
            SELECT id FROM task_dependencies 
            WHERE task_id = ? AND depends_on_id = ?
        ");
        $stmtCircular->execute([$dependsOnId, $taskId]);
        if ($stmtCircular->fetch()) {
            Response::error('Circular dependency detected', 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO task_dependencies (task_id, depends_on_id, dependency_type, created_by)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$taskId, $dependsOnId, $type, Auth::$user['id']]);
        
        // Log activity
        require_once __DIR__ . '/../../helpers/activity.php';
        
        // Get the blocking task title
        $stmtTitle = $db->prepare("SELECT title FROM tasks WHERE id = ?");
        $stmtTitle->execute([$dependsOnId]);
        $blockingTitle = $stmtTitle->fetchColumn();
        
        ActivityLogger::log($taskId, Auth::$user['id'], 'dependency_added', 'dependency', null, $blockingTitle);
        
        Response::created([
            'id' => $db->lastInsertId()
        ], 'Dependency created');
        
    } else if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Dependency ID is required', 400);
        }
        
        $stmt = $db->prepare("DELETE FROM task_dependencies WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Dependency removed');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        Response::error('This dependency already exists', 409);
    }
    Response::error('Database error: ' . $e->getMessage(), 500);
}
