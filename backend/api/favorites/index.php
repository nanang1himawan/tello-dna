<?php
/**
 * Toggle/Get user favorites
 * GET /api/favorites/index.php - Get all favorites
 * POST /api/favorites/toggle.php - Toggle favorite
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

try {
    $db = Database::getInstance()->getConnection();
    
    $entityType = $_GET['type'] ?? null; // 'project', 'board', 'task'
    
    $sql = "SELECT f.*, 
            CASE 
                WHEN f.entity_type = 'project' THEN p.name
                WHEN f.entity_type = 'board' THEN b.name
                WHEN f.entity_type = 'task' THEN t.title
            END as entity_name
            FROM user_favorites f
            LEFT JOIN projects p ON f.entity_type = 'project' AND f.entity_id = p.id
            LEFT JOIN boards b ON f.entity_type = 'board' AND f.entity_id = b.id
            LEFT JOIN tasks t ON f.entity_type = 'task' AND f.entity_id = t.id
            WHERE f.user_id = ?";
    
    $params = [Auth::$user['id']];
    
    if ($entityType) {
        $sql .= " AND f.entity_type = ?";
        $params[] = $entityType;
    }
    
    $sql .= " ORDER BY f.created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $favorites = $stmt->fetchAll();
    
    Response::success($favorites);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
