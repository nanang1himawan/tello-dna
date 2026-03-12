<?php
/**
 * Update checklist
 * PUT /api/checklists/update.php?id=1
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
    Response::error('Checklist ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);
$title = $input['title'] ?? null;

if (!$title) {
    Response::error('Title is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if checklist exists
    $stmt = $db->prepare("SELECT * FROM checklists WHERE id = ?");
    $stmt->execute([$id]);
    $checklist = $stmt->fetch();
    
    if (!$checklist) {
        Response::notFound('Checklist not found');
    }
    
    // Update checklist
    $stmt = $db->prepare("UPDATE checklists SET title = ? WHERE id = ?");
    $stmt->execute([$title, $id]);
    
    // Return updated checklist
    $stmt = $db->prepare("SELECT * FROM checklists WHERE id = ?");
    $stmt->execute([$id]);
    $updated = $stmt->fetch();
    
    Response::success($updated);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
