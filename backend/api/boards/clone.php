<?php
/**
 * Clone a board (including columns, optionally tasks)
 * POST /api/boards/clone.php
 * Body: { board_id: 1, name: "New Board Name", include_tasks: false }
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

$boardId = $input['board_id'] ?? null;
$newName = $input['name'] ?? null;
$includeTasks = $input['include_tasks'] ?? false;

if (!$boardId) {
    Response::error('Board ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();

    // Get original board
    $stmt = $db->prepare("SELECT * FROM boards WHERE id = ?");
    $stmt->execute([$boardId]);
    $board = $stmt->fetch();

    if (!$board) {
        Response::notFound('Board not found');
    }

    // Create new board
    $stmt = $db->prepare("
        INSERT INTO boards (project_id, name, description, background_type, background_value)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $board['project_id'],
        $newName ?: $board['name'] . ' (Copy)',
        $board['description'],
        $board['background_type'] ?? 'color',
        $board['background_value'] ?? '#1a1a2e'
    ]);
    $newBoardId = $db->lastInsertId();

    // Get original columns
    $stmt = $db->prepare("SELECT * FROM columns WHERE board_id = ? ORDER BY position");
    $stmt->execute([$boardId]);
    $columns = $stmt->fetchAll();

    $columnMapping = []; // old_id => new_id

    foreach ($columns as $column) {
        $stmt = $db->prepare("
            INSERT INTO columns (board_id, name, position, color, archived, card_limit)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $newBoardId,
            $column['name'],
            $column['position'],
            $column['color'],
            $column['archived'] ?? false,
            $column['card_limit']
        ]);
        $columnMapping[$column['id']] = $db->lastInsertId();
    }

    // Optionally clone tasks
    $taskCount = 0;
    if ($includeTasks) {
        foreach ($columnMapping as $oldColumnId => $newColumnId) {
            $stmt = $db->prepare("SELECT * FROM tasks WHERE column_id = ? ORDER BY position");
            $stmt->execute([$oldColumnId]);
            $tasks = $stmt->fetchAll();

            foreach ($tasks as $task) {
                $stmt = $db->prepare("
                    INSERT INTO tasks (column_id, title, description, cover_image, cover_color, type, severity, start_date, due_date, position, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $newColumnId,
                    $task['title'],
                    $task['description'],
                    $task['cover_image'],
                    $task['cover_color'],
                    $task['type'] ?? 'task',
                    $task['severity'] ?? 'minor',
                    $task['start_date'],
                    $task['due_date'],
                    $task['position'],
                    Auth::$user['id']
                ]);
                $taskCount++;
            }
        }
    }

    $db->commit();

    Response::success([
        'board_id' => $newBoardId,
        'name' => $newName ?: $board['name'] . ' (Copy)',
        'columns_cloned' => count($columns),
        'tasks_cloned' => $taskCount
    ], 'Board cloned successfully');

} catch (PDOException $e) {
    $db->rollBack();
    Response::error('Database error: ' . $e->getMessage(), 500);
}
