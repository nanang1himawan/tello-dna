<?php
/**
 * Update checklist item
 * PUT /api/checklists/update-item.php?id=1
 * 
 * Body: { content?: string, progress?: int (0-100) }
 * When progress = 100, auto-complete is triggered
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Item ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if item exists
    $stmt = $db->prepare("SELECT * FROM checklist_items WHERE id = ?");
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    
    if (!$item) {
        Response::notFound('Checklist item not found');
    }
    
    // Build update query based on provided fields
    $updates = [];
    $params = [];
    
    if (isset($input['content'])) {
        $updates[] = "content = ?";
        $params[] = $input['content'];
    }
    
    if (isset($input['progress'])) {
        $progress = max(0, min(100, (int)$input['progress']));
        $updates[] = "progress = ?";
        $params[] = $progress;
        
        // Auto-complete when progress reaches 100
        if ($progress >= 100 && !$item['is_completed']) {
            $updates[] = "is_completed = 1";
            $updates[] = "completed_at = NOW()";
            $updates[] = "completed_by = ?";
            $params[] = Auth::$user['id'];
        }
        // Auto-uncomplete when progress goes below 100 (if previously completed)
        else if ($progress < 100 && $item['is_completed']) {
            $updates[] = "is_completed = 0";
            $updates[] = "completed_at = NULL";
            $updates[] = "completed_by = NULL";
        }
    }
    
    if (empty($updates)) {
        Response::error('No fields to update', 400);
    }
    
    $params[] = $id;
    $sql = "UPDATE checklist_items SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    // Return updated item with user info
    $stmt = $db->prepare("
        SELECT ci.*, u.name as completed_by_name
        FROM checklist_items ci
        LEFT JOIN users u ON ci.completed_by = u.id
        WHERE ci.id = ?
    ");
    $stmt->execute([$id]);
    $updated = $stmt->fetch();
    
    Response::success($updated);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
