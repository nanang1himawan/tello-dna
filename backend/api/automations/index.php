<?php
/**
 * Automation Rules API
 * GET /api/automations/index.php?board_id=1 - List automations
 * POST /api/automations/index.php - Create automation
 * PUT /api/automations/index.php?id=1 - Update automation
 * DELETE /api/automations/index.php?id=1 - Delete automation
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
            SELECT a.*, u.name as creator_name
            FROM automations a
            LEFT JOIN users u ON a.created_by = u.id
            WHERE a.board_id = ?
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$boardId]);
        $automations = $stmt->fetchAll();
        
        // Parse JSON configs
        foreach ($automations as &$automation) {
            $automation['trigger_config'] = $automation['trigger_config'] ? json_decode($automation['trigger_config'], true) : null;
            $automation['action_config'] = json_decode($automation['action_config'], true);
        }
        
        Response::success($automations);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $boardId = $input['board_id'] ?? null;
        $name = $input['name'] ?? null;
        $triggerType = $input['trigger_type'] ?? null;
        $triggerConfig = $input['trigger_config'] ?? null;
        $actionType = $input['action_type'] ?? null;
        $actionConfig = $input['action_config'] ?? null;
        
        if (!$boardId || !$name || !$triggerType || !$actionType || !$actionConfig) {
            Response::error('Required fields: board_id, name, trigger_type, action_type, action_config', 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO automations (board_id, name, trigger_type, trigger_config, action_type, action_config, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $boardId,
            $name,
            $triggerType,
            $triggerConfig ? json_encode($triggerConfig) : null,
            $actionType,
            json_encode($actionConfig),
            Auth::$user['id']
        ]);
        
        Response::created([
            'id' => $db->lastInsertId(),
            'name' => $name
        ], 'Automation created');
        
    } else if ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Automation ID is required', 400);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = $input['name'];
        }
        if (isset($input['is_active'])) {
            $updates[] = "is_active = ?";
            $params[] = $input['is_active'] ? 1 : 0;
        }
        if (isset($input['trigger_config'])) {
            $updates[] = "trigger_config = ?";
            $params[] = json_encode($input['trigger_config']);
        }
        if (isset($input['action_config'])) {
            $updates[] = "action_config = ?";
            $params[] = json_encode($input['action_config']);
        }
        
        if (empty($updates)) {
            Response::error('No fields to update', 400);
        }
        
        $params[] = $id;
        $stmt = $db->prepare("UPDATE automations SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        
        Response::success(null, 'Automation updated');
        
    } else if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Automation ID is required', 400);
        }
        
        $stmt = $db->prepare("DELETE FROM automations WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Automation deleted');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
