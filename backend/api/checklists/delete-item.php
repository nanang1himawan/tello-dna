<?php
/**
 * Delete checklist item
 * DELETE /api/checklists/delete-item.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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
    
    $stmt = $db->prepare("DELETE FROM checklist_items WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Item deleted successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
