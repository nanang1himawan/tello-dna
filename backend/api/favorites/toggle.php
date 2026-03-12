<?php
/**
 * Toggle favorite status
 * POST /api/favorites/toggle.php
 * Body: { entity_type: 'project'|'board'|'task', entity_id: 1 }
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

$entityType = $input['entity_type'] ?? null;
$entityId = $input['entity_id'] ?? null;

if (!$entityType || !$entityId) {
    Response::error('Entity type and ID are required', 400);
}

if (!in_array($entityType, ['project', 'board', 'task'])) {
    Response::error('Invalid entity type', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if already favorited
    $stmt = $db->prepare("SELECT id FROM user_favorites WHERE user_id = ? AND entity_type = ? AND entity_id = ?");
    $stmt->execute([Auth::$user['id'], $entityType, $entityId]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Remove favorite
        $stmt = $db->prepare("DELETE FROM user_favorites WHERE id = ?");
        $stmt->execute([$existing['id']]);
        Response::success(['is_favorite' => false], 'Removed from favorites');
    } else {
        // Add favorite
        $stmt = $db->prepare("INSERT INTO user_favorites (user_id, entity_type, entity_id) VALUES (?, ?, ?)");
        $stmt->execute([Auth::$user['id'], $entityType, $entityId]);
        Response::success(['is_favorite' => true], 'Added to favorites');
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
