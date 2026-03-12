<?php
/**
 * Add item to checklist
 * POST /api/checklists/add-item.php
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

if (empty($input['checklist_id'])) {
    Response::error('Checklist ID is required', 400);
}

if (empty($input['content'])) {
    Response::error('Item content is required', 400);
}

$checklistId = $input['checklist_id'];
$content = trim($input['content']);

try {
    $db = Database::getInstance()->getConnection();
    
    // Verify checklist exists
    $stmt = $db->prepare("SELECT id FROM checklists WHERE id = ?");
    $stmt->execute([$checklistId]);
    if (!$stmt->fetch()) {
        Response::notFound('Checklist not found');
    }
    
    // Get next position
    $stmt = $db->prepare("SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM checklist_items WHERE checklist_id = ?");
    $stmt->execute([$checklistId]);
    $position = $stmt->fetch()['next_pos'];
    
    // Create item
    $stmt = $db->prepare("INSERT INTO checklist_items (checklist_id, content, position) VALUES (?, ?, ?)");
    $stmt->execute([$checklistId, $content, $position]);
    $itemId = $db->lastInsertId();
    
    // Get created item
    $stmt = $db->prepare("SELECT * FROM checklist_items WHERE id = ?");
    $stmt->execute([$itemId]);
    $item = $stmt->fetch();

    Response::created($item, 'Item added successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
