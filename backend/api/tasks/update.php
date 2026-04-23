<?php
/**
 * Update task
 * PUT /api/tasks/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/activity.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Task ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$id]);
    $task = $stmt->fetch();
    
    if (!$task) {
        Response::notFound('Task not found');
    }
    
    // Permission check: only assignee, creator, or admin/manager can update
    $canUpdate = false;
    $userId = Auth::$user['id'];
    $role = Auth::$user['role'];
    
    if ($role === 'admin' || $role === 'manager') {
        $canUpdate = true;
    } else if ($task['created_by'] == $userId || $task['assignee_id'] == $userId) {
        $canUpdate = true;
    }
    
    if (!$canUpdate) {
        Response::forbidden('You do not have permission to update this task');
    }
    
    $updates = [];
    $params = [];
    
    if (isset($input['title']) && !empty(trim($input['title']))) {
        $updates[] = "title = ?";
        $params[] = trim($input['title']);
    }
    
    if (array_key_exists('description', $input)) {
        $updates[] = "description = ?";
        $params[] = $input['description'];
    }
    
    // Issue type
    if (isset($input['type']) && in_array($input['type'], ['epic', 'story', 'task', 'bug'])) {
        $updates[] = "type = ?";
        $params[] = $input['type'];
    }
    
    if (isset($input['severity']) && in_array($input['severity'], ['critical', 'major', 'minor'])) {
        $updates[] = "severity = ?";
        $params[] = $input['severity'];
    }
    
    // Parent (for Epic hierarchy)
    if (array_key_exists('parent_id', $input)) {
        $updates[] = "parent_id = ?";
        $params[] = $input['parent_id'] ?: null;
    }
    
    // Sprint
    if (array_key_exists('sprint_id', $input)) {
        $updates[] = "sprint_id = ?";
        $params[] = $input['sprint_id'] ?: null;
    }
    
    // Plan dates
    if (array_key_exists('start_date', $input)) {
        $updates[] = "start_date = ?";
        $params[] = $input['start_date'] ?: null;
    }
    
    if (array_key_exists('due_date', $input)) {
        $updates[] = "due_date = ?";
        $params[] = $input['due_date'] ?: null;
    }
    
    // Actual dates
    if (array_key_exists('actual_start_date', $input)) {
        $updates[] = "actual_start_date = ?";
        $params[] = $input['actual_start_date'] ?: null;
    }
    
    if (array_key_exists('actual_end_date', $input)) {
        $updates[] = "actual_end_date = ?";
        $params[] = $input['actual_end_date'] ?: null;
    }
    
    // Status percentages
    if (array_key_exists('status_plan', $input)) {
        $updates[] = "status_plan = ?";
        $params[] = max(0, min(100, (int)$input['status_plan']));
    }
    
    if (array_key_exists('status_actual', $input)) {
        $updates[] = "status_actual = ?";
        $params[] = max(0, min(100, (int)$input['status_actual']));
    }
    
    if (array_key_exists('assignee_id', $input)) {
        $updates[] = "assignee_id = ?";
        $params[] = $input['assignee_id'] ?: null;
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update', 400);
    }
    
    $params[] = $id;
    $stmt = $db->prepare("UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?");
    $stmt->execute($params);
    
    // Get updated task with relations
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
    $stmt->execute([$id]);
    $updatedTask = $stmt->fetch();

    // Notify if assignee changed
    if (isset($input['assignee_id']) && $input['assignee_id'] != $task['assignee_id'] && $input['assignee_id'] != Auth::$user['id']) {
        require_once __DIR__ . '/../../helpers/notification.php';
        Notification::create(
            $input['assignee_id'],
            'assign',
            'Penugasan Task',
            Auth::$user['name'] . ' menugaskan task "' . ($input['title'] ?? $task['title']) . '" kepada Anda',
            ['task_id' => $id]
        );
    }

    // Log activity for changes
    $fieldsToLog = ['title', 'description', 'type', 'severity', 'due_date', 'status_actual'];
    foreach ($fieldsToLog as $field) {
        if (isset($input[$field]) && $input[$field] != $task[$field]) {
            ActivityLogger::logUpdated($id, Auth::$user['id'], $field, $task[$field], $input[$field]);
        }
    }
    
    // Log assignee change
    if (isset($input['assignee_id']) && $input['assignee_id'] != $task['assignee_id']) {
        // Get old assignee name
        $oldAssignee = null;
        if ($task['assignee_id']) {
            $stmtOld = $db->prepare("SELECT name FROM users WHERE id = ?");
            $stmtOld->execute([$task['assignee_id']]);
            $oldAssignee = $stmtOld->fetchColumn();
        }
        // Get new assignee name
        $newAssignee = null;
        if ($input['assignee_id']) {
            $stmtNew = $db->prepare("SELECT name FROM users WHERE id = ?");
            $stmtNew->execute([$input['assignee_id']]);
            $newAssignee = $stmtNew->fetchColumn();
        }
        ActivityLogger::logAssigned($id, Auth::$user['id'], $oldAssignee, $newAssignee);
    }

    Response::success($updatedTask, 'Task updated successfully');

} catch (PDOException $e) {
    error_log($e->getMessage());
    Response::error('Database error', 500);
}
