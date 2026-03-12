<?php
/**
 * Toggle checklist item completion
 * PUT /api/checklists/toggle-item.php?id=1
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

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM checklist_items WHERE id = ?");
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    
    if (!$item) {
        Response::notFound('Item not found');
    }
    
    // Toggle completion - handle boolean from DB properly
    $currentStatus = (int)$item['is_completed'];
    $newStatus = $currentStatus === 1 ? 0 : 1;  // Toggle: 1->0, 0->1
    $completedAt = $newStatus === 1 ? date('Y-m-d H:i:s') : null;
    $completedBy = $newStatus === 1 ? Auth::$user['id'] : null;
    $newProgress = $newStatus === 1 ? 100 : 0;  // Auto progress: 100% when checked, 0% when unchecked
    
    $stmt = $db->prepare("UPDATE checklist_items SET is_completed = ?, completed_at = ?, completed_by = ?, progress = ? WHERE id = ?");
    $stmt->execute([$newStatus, $completedAt, $completedBy, $newProgress, $id]);
    
    // Get updated item
    $stmt = $db->prepare("
        SELECT ci.*, u.name as completed_by_name
        FROM checklist_items ci
        LEFT JOIN users u ON ci.completed_by = u.id
        WHERE ci.id = ?
    ");
    $stmt->execute([$id]);
    $updatedItem = $stmt->fetch();

    Response::success($updatedItem, $newStatus ? 'Item completed' : 'Item uncompleted');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
