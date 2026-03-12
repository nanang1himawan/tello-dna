<?php
/**
 * Move task between columns or reorder (for drag-and-drop)
 * POST /api/tasks/move.php
 * 
 * Body: { task_id, column_id, position }
 * 
 * Auto-fills actual dates:
 * - actual_start_date: when task moves to "In Progress" column
 * - actual_end_date: when task moves to "Done" column
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

if (empty($input['task_id'])) {
    Response::error('Task ID is required', 400);
}

if (!isset($input['column_id'])) {
    Response::error('Column ID is required', 400);
}

if (!isset($input['position'])) {
    Response::error('Position is required', 400);
}

$taskId = $input['task_id'];
$newColumnId = $input['column_id'];
$newPosition = (int)$input['position'];

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    // Get current task
    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        Response::notFound('Task not found');
    }
    
    $oldColumnId = $task['column_id'];
    $oldPosition = $task['position'];
    
    // Get new column name to check for auto-fill dates
    $stmt = $db->prepare("SELECT name FROM columns WHERE id = ?");
    $stmt->execute([$newColumnId]);
    $newColumn = $stmt->fetch();
    $newColumnName = strtolower($newColumn['name'] ?? '');
    
    // If moving to different column
    if ($oldColumnId != $newColumnId) {
        // Remove from old column (shift positions down)
        $stmt = $db->prepare("
            UPDATE tasks 
            SET position = position - 1 
            WHERE column_id = ? AND position > ?
        ");
        $stmt->execute([$oldColumnId, $oldPosition]);
        
        // Make room in new column (shift positions up)
        $stmt = $db->prepare("
            UPDATE tasks 
            SET position = position + 1 
            WHERE column_id = ? AND position >= ?
        ");
        $stmt->execute([$newColumnId, $newPosition]);
        
        // Move task to new column
        $stmt = $db->prepare("
            UPDATE tasks 
            SET column_id = ?, position = ? 
            WHERE id = ?
        ");
        $stmt->execute([$newColumnId, $newPosition, $taskId]);
        
        // Auto-fill actual dates based on column
        $today = date('Y-m-d');
        
        // Auto-fill actual_start_date when moving to "In Progress" type columns
        $inProgressColumns = ['in progress', 'sedang dikerjakan', 'progress', 'wip', 'doing'];
        if (in_array($newColumnName, $inProgressColumns) && empty($task['actual_start_date'])) {
            $stmt = $db->prepare("UPDATE tasks SET actual_start_date = ? WHERE id = ? AND actual_start_date IS NULL");
            $stmt->execute([$today, $taskId]);
        }
        
        // Auto-fill actual_end_date when moving to "Done" type columns
        $doneColumns = ['done', 'selesai', 'completed', 'complete', 'finished'];
        if (in_array($newColumnName, $doneColumns)) {
            // Set actual_end_date if not set
            if (empty($task['actual_end_date'])) {
                $stmt = $db->prepare("UPDATE tasks SET actual_end_date = ? WHERE id = ? AND actual_end_date IS NULL");
                $stmt->execute([$today, $taskId]);
            }
            // Also set actual_start_date if not set (task went directly to done)
            if (empty($task['actual_start_date'])) {
                $stmt = $db->prepare("UPDATE tasks SET actual_start_date = ? WHERE id = ? AND actual_start_date IS NULL");
                $stmt->execute([$today, $taskId]);
            }
            // Set status_actual to 100%
            $stmt = $db->prepare("UPDATE tasks SET status_actual = 100 WHERE id = ?");
            $stmt->execute([$taskId]);
        }
        
    } else {
        // Reordering within same column
        if ($newPosition > $oldPosition) {
            // Moving down
            $stmt = $db->prepare("
                UPDATE tasks 
                SET position = position - 1 
                WHERE column_id = ? AND position > ? AND position <= ?
            ");
            $stmt->execute([$oldColumnId, $oldPosition, $newPosition]);
        } else if ($newPosition < $oldPosition) {
            // Moving up
            $stmt = $db->prepare("
                UPDATE tasks 
                SET position = position + 1 
                WHERE column_id = ? AND position >= ? AND position < ?
            ");
            $stmt->execute([$oldColumnId, $newPosition, $oldPosition]);
        }
        
        // Update task position
        $stmt = $db->prepare("UPDATE tasks SET position = ? WHERE id = ?");
        $stmt->execute([$newPosition, $taskId]);
    }
    
    $db->commit();
    
    // Get updated task
    $stmt = $db->prepare("
        SELECT t.*, u.name as assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $movedTask = $stmt->fetch();

    Response::success($movedTask, 'Task moved successfully');

} catch (PDOException $e) {
    $db->rollBack();
    Response::error('Database error: ' . $e->getMessage(), 500);
}
