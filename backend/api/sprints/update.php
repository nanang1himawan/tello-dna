<?php
/**
 * Update sprint
 * PUT /api/sprints/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Only admin/manager can update sprints
if (Auth::$user['role'] !== 'admin' && Auth::$user['role'] !== 'manager') {
    Response::forbidden('Only admin and manager can update sprints');
}

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Sprint ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM sprints WHERE id = ?");
    $stmt->execute([$id]);
    $sprint = $stmt->fetch();
    
    if (!$sprint) {
        Response::notFound('Sprint not found');
    }
    
    $updates = [];
    $params = [];
    
    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = "name = ?";
        $params[] = trim($input['name']);
    }
    
    if (array_key_exists('goal', $input)) {
        $updates[] = "goal = ?";
        $params[] = $input['goal'];
    }
    
    if (array_key_exists('start_date', $input)) {
        $updates[] = "start_date = ?";
        $params[] = $input['start_date'] ?: null;
    }
    
    if (array_key_exists('end_date', $input)) {
        $updates[] = "end_date = ?";
        $params[] = $input['end_date'] ?: null;
    }
    
    if (isset($input['status']) && in_array($input['status'], ['planning', 'active', 'completed'])) {
        // Only one active sprint per project
        if ($input['status'] === 'active') {
            $db->prepare("UPDATE sprints SET status = 'planning' WHERE project_id = ? AND status = 'active'")->execute([$sprint['project_id']]);
        }
        $updates[] = "status = ?";
        $params[] = $input['status'];
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update', 400);
    }
    
    $params[] = $id;
    $stmt = $db->prepare("UPDATE sprints SET " . implode(', ', $updates) . " WHERE id = ?");
    $stmt->execute($params);
    
    $stmt = $db->prepare("SELECT * FROM sprints WHERE id = ?");
    $stmt->execute([$id]);
    $updatedSprint = $stmt->fetch();

    Response::success($updatedSprint, 'Sprint updated successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
