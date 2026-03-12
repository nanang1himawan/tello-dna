<?php
/**
 * Create new task
 * POST /api/tasks/create.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['column_id'])) {
    Response::error('Column ID is required', 400);
}

if (empty($input['title'])) {
    Response::error('Task title is required', 400);
}

$columnId = $input['column_id'];
$title = trim($input['title']);
$description = $input['description'] ?? null;
$type = $input['type'] ?? 'task';
$severity = $input['severity'] ?? 'minor';
$parentId = !empty($input['parent_id']) ? $input['parent_id'] : null;
$sprintId = !empty($input['sprint_id']) ? $input['sprint_id'] : null;
$startDate = !empty($input['start_date']) ? $input['start_date'] : null;
$dueDate = !empty($input['due_date']) ? $input['due_date'] : null;
$assigneeId = !empty($input['assignee_id']) ? $input['assignee_id'] : null;
$statusPlan = $input['status_plan'] ?? 0;
$statusActual = $input['status_actual'] ?? 0;

// Validate type
if (!in_array($type, ['epic', 'story', 'task', 'bug'])) {
    $type = 'task';
}

// Validate severity
if (!in_array($severity, ['critical', 'major', 'minor'])) {
    $severity = 'minor';
}

// Validate status percentages
$statusPlan = max(0, min(100, (int)$statusPlan));
$statusActual = max(0, min(100, (int)$statusActual));

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify column exists
    $stmt = $db->prepare("SELECT id FROM columns WHERE id = ?");
    $stmt->execute([$columnId]);
    if (!$stmt->fetch()) {
        Response::notFound('Column not found');
    }
    
    // Get next position
    $stmt = $db->prepare("SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE column_id = ?");
    $stmt->execute([$columnId]);
    $position = $stmt->fetch()['next_pos'];
    
    // Create task
    $stmt = $db->prepare("
        INSERT INTO tasks (column_id, title, type, description, severity, parent_id, sprint_id, start_date, due_date, position, assignee_id, created_by, status_plan, status_actual) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$columnId, $title, $type, $description, $severity, $parentId, $sprintId, $startDate, $dueDate, $position, $assigneeId, Auth::$user['id'], $statusPlan, $statusActual]);
    $taskId = $db->lastInsertId();
    
    // Get created task with parent info
    $stmt = $db->prepare("
        SELECT t.*, 
               u.name as assignee_name,
               p.title as parent_title,
               s.name as sprint_name
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN tasks p ON t.parent_id = p.id
        LEFT JOIN sprints s ON t.sprint_id = s.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    // Log the creation
    AuditLog::log('task', $taskId, 'create', Auth::$user['id'], null, [
        'title' => $title,
        'type' => $type,
        'column_id' => $columnId,
        'severity' => $severity
    ]);

    // Log activity
    require_once __DIR__ . '/../../helpers/activity.php';
    ActivityLogger::logCreated($taskId, Auth::$user['id'], $title);

    Response::created($task, 'Task created successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
