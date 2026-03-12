<?php
/**
 * Add a new column to a board
 * POST /api/boards/add_column.php
 * 
 * Request body:
 * {
 *   "board_id": 1,
 *   "name": "New Column",
 *   "color": "#6366f1"
 * }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['board_id'])) {
    Response::error('Board ID is required', 400);
}

if (empty($input['name'])) {
    Response::error('Column name is required', 400);
}

$boardId = (int) $input['board_id'];
$name = trim($input['name']);
$color = $input['color'] ?? '#6366f1';

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify user has access to this board's project
    $stmt = $db->prepare("
        SELECT b.id, b.project_id 
        FROM boards b
        JOIN project_members pm ON b.project_id = pm.project_id
        WHERE b.id = ? AND pm.user_id = ?
    ");
    $stmt->execute([$boardId, Auth::$user['id']]);
    $board = $stmt->fetch();
    
    if (!$board) {
        Response::forbidden('You do not have access to this board');
    }
    
    // Get the max position for existing columns
    $stmt = $db->prepare("SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM columns WHERE board_id = ?");
    $stmt->execute([$boardId]);
    $result = $stmt->fetch();
    $position = (int) $result['next_position'];
    
    // Insert new column
    $stmt = $db->prepare("INSERT INTO columns (board_id, name, color, position) VALUES (?, ?, ?, ?)");
    $stmt->execute([$boardId, $name, $color, $position]);
    $columnId = $db->lastInsertId();
    
    // Return the new column data
    Response::success([
        'id' => $columnId,
        'board_id' => $boardId,
        'name' => $name,
        'color' => $color,
        'position' => $position
    ], 'Column added successfully');
    
} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
