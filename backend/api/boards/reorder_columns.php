<?php
/**
 * Reorder columns in a board
 * POST /api/boards/reorder_columns.php
 * 
 * Request body:
 * {
 *   "board_id": 1,
 *   "column_ids": [3, 1, 2, 4, 5]  // Array of column IDs in new order
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

if (empty($input['column_ids']) || !is_array($input['column_ids'])) {
    Response::error('Column IDs array is required', 400);
}

$boardId = (int) $input['board_id'];
$columnIds = $input['column_ids'];

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
    
    // Verify all column IDs belong to this board
    $placeholders = implode(',', array_fill(0, count($columnIds), '?'));
    $stmt = $db->prepare("
        SELECT id FROM columns 
        WHERE board_id = ? AND id IN ($placeholders)
    ");
    $stmt->execute(array_merge([$boardId], $columnIds));
    $existingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($existingColumns) !== count($columnIds)) {
        Response::error('Some column IDs are invalid or do not belong to this board', 400);
    }
    
    // Update positions
    $db->beginTransaction();
    
    $updateStmt = $db->prepare("UPDATE columns SET position = ? WHERE id = ? AND board_id = ?");
    
    foreach ($columnIds as $position => $columnId) {
        $updateStmt->execute([$position, $columnId, $boardId]);
    }
    
    $db->commit();
    
    Response::success(null, 'Columns reordered successfully');
    
} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    Response::error('Database error: ' . $e->getMessage(), 500);
}
