<?php
/**
 * Import Board from JSON
 * POST /api/boards/import.php
 * Body: { project_id: 1, data: { ... exported JSON ... } }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Check permission (admin/manager only)
if (!in_array(Auth::$user['role'], ['admin', 'manager'])) {
    Response::error('Permission denied', 403);
}

$input = json_decode(file_get_contents('php://input'), true);

$projectId = $input['project_id'] ?? null;
$importData = $input['data'] ?? null;

if (!$projectId || !$importData) {
    Response::error('Project ID and data are required', 400);
}

// Validate import data structure
if (!isset($importData['board']) || !isset($importData['columns'])) {
    Response::error('Invalid import data format', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    // Verify project exists
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) {
        Response::notFound('Project not found');
    }
    
    $boardData = $importData['board'];
    
    // Create board
    $stmt = $db->prepare("
        INSERT INTO boards (project_id, name, description, background_type, background_value)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $projectId,
        $boardData['name'] . ' (Imported)',
        $boardData['description'] ?? '',
        $boardData['background_type'] ?? 'color',
        $boardData['background_value'] ?? '#1a1a2e'
    ]);
    $boardId = $db->lastInsertId();
    
    // Create columns and build name-to-id mapping
    $columnMapping = [];
    foreach ($importData['columns'] as $columnData) {
        $stmt = $db->prepare("
            INSERT INTO columns (board_id, name, position, color, card_limit)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $boardId,
            $columnData['name'],
            $columnData['position'] ?? 0,
            $columnData['color'] ?? '#6366f1',
            $columnData['card_limit'] ?? null
        ]);
        $columnMapping[$columnData['name']] = $db->lastInsertId();
    }
    
    // Import tasks if present
    $taskCount = 0;
    if (isset($importData['tasks']) && is_array($importData['tasks'])) {
        foreach ($importData['tasks'] as $taskData) {
            $columnName = $taskData['column_name'] ?? null;
            $columnId = $columnMapping[$columnName] ?? null;
            
            // Skip if column not found
            if (!$columnId) {
                continue;
            }
            
            $stmt = $db->prepare("
                INSERT INTO tasks (column_id, title, description, type, severity, start_date, due_date, created_by, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $columnId,
                $taskData['title'],
                $taskData['description'] ?? '',
                $taskData['type'] ?? 'task',
                $taskData['severity'] ?? 'minor',
                !empty($taskData['start_date']) ? $taskData['start_date'] : null,
                !empty($taskData['due_date']) ? $taskData['due_date'] : null,
                Auth::$user['id'],
                $taskCount
            ]);
            $taskCount++;
        }
    }
    
    $db->commit();
    
    Response::created([
        'board_id' => $boardId,
        'name' => $boardData['name'] . ' (Imported)',
        'columns_imported' => count($columnMapping),
        'tasks_imported' => $taskCount
    ], 'Board imported successfully');

} catch (PDOException $e) {
    $db->rollBack();
    Response::error('Database error: ' . $e->getMessage(), 500);
}
