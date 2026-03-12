<?php
/**
 * Custom Fields API
 * GET /api/custom-fields/index.php?board_id=1 - List definitions
 * POST /api/custom-fields/index.php - Create definition
 * DELETE /api/custom-fields/index.php?id=1 - Delete definition
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
            SELECT cfd.*, u.name as creator_name
            FROM custom_field_definitions cfd
            LEFT JOIN users u ON cfd.created_by = u.id
            WHERE cfd.board_id = ?
            ORDER BY cfd.position ASC
        ");
        $stmt->execute([$boardId]);
        $fields = $stmt->fetchAll();
        
        // Parse JSON options
        foreach ($fields as &$field) {
            $field['options'] = $field['options'] ? json_decode($field['options'], true) : null;
        }
        
        Response::success($fields);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $boardId = $input['board_id'] ?? null;
        $name = $input['name'] ?? null;
        $fieldType = $input['field_type'] ?? 'text';
        $options = $input['options'] ?? null;
        $isRequired = $input['is_required'] ?? false;
        
        if (!$boardId || !$name) {
            Response::error('Board ID and name are required', 400);
        }
        
        // Get max position
        $stmt = $db->prepare("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM custom_field_definitions WHERE board_id = ?");
        $stmt->execute([$boardId]);
        $position = $stmt->fetch()['pos'];
        
        $stmt = $db->prepare("
            INSERT INTO custom_field_definitions (board_id, name, field_type, options, is_required, position, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $boardId,
            $name,
            $fieldType,
            $options ? json_encode($options) : null,
            $isRequired ? 1 : 0,
            $position,
            Auth::$user['id']
        ]);
        
        Response::created([
            'id' => $db->lastInsertId(),
            'name' => $name,
            'field_type' => $fieldType
        ], 'Custom field created');
        
    } else if ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Field ID is required', 400);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = $input['name'];
        }
        if (isset($input['options'])) {
            $updates[] = "options = ?";
            $params[] = json_encode($input['options']);
        }
        if (isset($input['is_required'])) {
            $updates[] = "is_required = ?";
            $params[] = $input['is_required'] ? 1 : 0;
        }
        
        if (empty($updates)) {
            Response::error('No fields to update', 400);
        }
        
        $params[] = $id;
        $stmt = $db->prepare("UPDATE custom_field_definitions SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        
        Response::success(null, 'Field updated');
        
    } else if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Field ID is required', 400);
        }
        
        $stmt = $db->prepare("DELETE FROM custom_field_definitions WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Field deleted');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
