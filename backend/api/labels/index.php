<?php
/**
 * Labels API
 * GET /api/labels/index.php?board_id=1 - List labels for board
 * POST /api/labels/index.php - Create label
 * PUT /api/labels/index.php?id=1 - Update label
 * DELETE /api/labels/index.php?id=1 - Delete label
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

Auth::verify();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'GET') {
        $boardId = $_GET['board_id'] ?? null;
        if (!$boardId) {
            Response::error('Board ID is required', 400);
        }
        
        $stmt = $db->prepare("
            SELECT l.*, 
                (SELECT COUNT(*) FROM task_labels tl WHERE tl.label_id = l.id) as task_count
            FROM labels l
            WHERE l.board_id = ?
            ORDER BY l.name ASC
        ");
        $stmt->execute([$boardId]);
        $labels = $stmt->fetchAll();
        
        Response::success($labels);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $boardId = $input['board_id'] ?? null;
        $name = trim($input['name'] ?? '');
        $color = $input['color'] ?? '#6366f1';
        
        if (!$boardId || !$name) {
            Response::error('Board ID and name are required', 400);
        }
        
        $stmt = $db->prepare("INSERT INTO labels (board_id, name, color) VALUES (?, ?, ?)");
        $stmt->execute([$boardId, $name, $color]);
        
        Response::created([
            'id' => $db->lastInsertId(),
            'name' => $name,
            'color' => $color
        ], 'Label created');
        
    } else if ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Label ID is required', 400);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = trim($input['name']);
        }
        if (isset($input['color'])) {
            $updates[] = "color = ?";
            $params[] = $input['color'];
        }
        
        if (empty($updates)) {
            Response::error('No fields to update', 400);
        }
        
        $params[] = $id;
        $stmt = $db->prepare("UPDATE labels SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        
        Response::success(null, 'Label updated');
        
    } else if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Label ID is required', 400);
        }
        
        $stmt = $db->prepare("DELETE FROM labels WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Label deleted');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        Response::error('Label with this name already exists', 409);
    }
    Response::error('Database error: ' . $e->getMessage(), 500);
}
