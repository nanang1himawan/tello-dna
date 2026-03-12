<?php
/**
 * Create board (with optional template)
 * POST /api/boards/create.php
 * Body: { project_id: 1, name: "Board Name", template_id: 1 (optional) }
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

$projectId = $input['project_id'] ?? null;
$name = $input['name'] ?? null;
$description = $input['description'] ?? '';
$templateId = $input['template_id'] ?? null;
$backgroundType = $input['background_type'] ?? 'color';
$backgroundValue = $input['background_value'] ?? '#1a1a2e';

if (!$projectId || !$name) {
    Response::error('Project ID and name are required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();

    // Check if project exists
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) {
        Response::notFound('Project not found');
    }

    // Create board
    $stmt = $db->prepare("
        INSERT INTO boards (project_id, name, description, background_type, background_value)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$projectId, $name, $description, $backgroundType, $backgroundValue]);
    $boardId = $db->lastInsertId();

    // If template specified, create columns from template
    if ($templateId) {
        $stmt = $db->prepare("SELECT structure FROM board_templates WHERE id = ?");
        $stmt->execute([$templateId]);
        $template = $stmt->fetch();

        if ($template) {
            $structure = json_decode($template['structure'], true);
            $position = 0;

            foreach ($structure['columns'] ?? [] as $columnDef) {
                $stmt = $db->prepare("
                    INSERT INTO columns (board_id, name, position, color)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([
                    $boardId,
                    $columnDef['name'],
                    $position++,
                    $columnDef['color'] ?? '#6366f1'
                ]);
            }
        }
    } else {
        // Create default columns if no template
        $defaultColumns = [
            ['name' => 'Backlog', 'color' => '#6b7280'],
            ['name' => 'To Do', 'color' => '#6366f1'],
            ['name' => 'In Progress', 'color' => '#f59e0b'],
            ['name' => 'Done', 'color' => '#10b981'],
        ];

        foreach ($defaultColumns as $position => $col) {
            $stmt = $db->prepare("
                INSERT INTO columns (board_id, name, position, color)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$boardId, $col['name'], $position, $col['color']]);
        }
    }

    $db->commit();

    // Return created board with columns
    $stmt = $db->prepare("
        SELECT b.*, 
            (SELECT COUNT(*) FROM columns WHERE board_id = b.id) as column_count
        FROM boards b WHERE b.id = ?
    ");
    $stmt->execute([$boardId]);
    $newBoard = $stmt->fetch();

    Response::created($newBoard, 'Board created successfully');

} catch (PDOException $e) {
    $db->rollBack();
    Response::error('Database error: ' . $e->getMessage(), 500);
}
