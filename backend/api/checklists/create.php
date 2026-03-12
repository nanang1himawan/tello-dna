<?php
/**
 * Create new checklist
 * POST /api/checklists/create.php
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

if (empty($input['title'])) {
    Response::error('Checklist title is required', 400);
}

$taskId = $input['task_id'];
$title = trim($input['title']);

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify task exists
    $stmt = $db->prepare("SELECT id FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    if (!$stmt->fetch()) {
        Response::notFound('Task not found');
    }
    
    // Get next position
    $stmt = $db->prepare("SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM checklists WHERE task_id = ?");
    $stmt->execute([$taskId]);
    $position = $stmt->fetch()['next_pos'];
    
    // Create checklist
    $stmt = $db->prepare("INSERT INTO checklists (task_id, title, position) VALUES (?, ?, ?)");
    $stmt->execute([$taskId, $title, $position]);
    $checklistId = $db->lastInsertId();
    
    // Get created checklist
    $stmt = $db->prepare("SELECT * FROM checklists WHERE id = ?");
    $stmt->execute([$checklistId]);
    $checklist = $stmt->fetch();
    $checklist['items'] = [];
    $checklist['total_items'] = 0;
    $checklist['completed_items'] = 0;

    Response::created($checklist, 'Checklist created successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
