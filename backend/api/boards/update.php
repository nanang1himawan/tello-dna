<?php
/**
 * Update board
 * PUT /api/boards/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$boardId = $_GET['id'] ?? null;
if (!$boardId) {
    Response::error('Board ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();

    // Check if board exists
    $stmt = $db->prepare("SELECT b.*, p.id as project_id FROM boards b JOIN projects p ON b.project_id = p.id WHERE b.id = ?");
    $stmt->execute([$boardId]);
    $board = $stmt->fetch();

    if (!$board) {
        Response::notFound('Board not found');
    }

    // Check permission (admin/manager only)
    if (!in_array(Auth::$user['role'], ['admin', 'manager'])) {
        Response::error('Permission denied', 403);
    }

    // Build update query
    $updates = [];
    $params = [];

    if (isset($input['name'])) {
        $updates[] = "name = ?";
        $params[] = $input['name'];
    }

    if (isset($input['description'])) {
        $updates[] = "description = ?";
        $params[] = $input['description'];
    }

    if (isset($input['background_type'])) {
        $updates[] = "background_type = ?";
        $params[] = $input['background_type'];
    }

    if (isset($input['background_value'])) {
        $updates[] = "background_value = ?";
        $params[] = $input['background_value'];
    }

    if (empty($updates)) {
        Response::error('No fields to update', 400);
    }

    $params[] = $boardId;
    $sql = "UPDATE boards SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // Return updated board
    $stmt = $db->prepare("SELECT * FROM boards WHERE id = ?");
    $stmt->execute([$boardId]);
    $updatedBoard = $stmt->fetch();

    Response::success($updatedBoard, 'Board updated successfully');

} catch (PDOException $e) {
    error_log($e->getMessage());
    Response::error('Database error', 500);
}
