<?php
/**
 * Delete checklist
 * DELETE /api/checklists/delete.php?id=1
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
    Response::error('Checklist ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT * FROM checklists WHERE id = ?");
    $stmt->execute([$id]);
    $checklist = $stmt->fetch();
    
    if (!$checklist) {
        Response::notFound('Checklist not found');
    }
    
    // Delete checklist (items will cascade delete)
    $stmt = $db->prepare("DELETE FROM checklists WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Checklist deleted successfully');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
