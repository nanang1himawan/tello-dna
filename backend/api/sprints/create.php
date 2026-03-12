<?php
/**
 * Create new sprint
 * POST /api/sprints/create.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Only admin/manager can create sprints
if (Auth::$user['role'] !== 'admin' && Auth::$user['role'] !== 'manager') {
    Response::forbidden('Only admin and manager can create sprints');
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['project_id'])) {
    Response::error('Project ID is required', 400);
}

if (empty($input['name'])) {
    Response::error('Sprint name is required', 400);
}

$projectId = $input['project_id'];
$name = trim($input['name']);
$goal = $input['goal'] ?? null;
$startDate = $input['start_date'] ?? null;
$endDate = $input['end_date'] ?? null;

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify project exists
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) {
        Response::notFound('Project not found');
    }
    
    // Create sprint
    $stmt = $db->prepare("
        INSERT INTO sprints (project_id, name, goal, start_date, end_date, status) 
        VALUES (?, ?, ?, ?, ?, 'planning')
    ");
    $stmt->execute([$projectId, $name, $goal, $startDate, $endDate]);
    $sprintId = $db->lastInsertId();
    
    // Get created sprint
    $stmt = $db->prepare("SELECT * FROM sprints WHERE id = ?");
    $stmt->execute([$sprintId]);
    $sprint = $stmt->fetch();

    Response::created($sprint, 'Sprint created successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
