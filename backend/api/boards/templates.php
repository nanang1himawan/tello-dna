<?php
/**
 * Get/List board templates
 * GET /api/boards/templates.php
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
    
    // Get system templates and user's custom templates
    $stmt = $db->prepare("
        SELECT t.*, u.name as creator_name
        FROM board_templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.is_system = 1 OR t.created_by = ?
        ORDER BY t.is_system DESC, t.name ASC
    ");
    $stmt->execute([Auth::$user['id']]);
    $templates = $stmt->fetchAll();

    // Decode structure JSON
    foreach ($templates as &$template) {
        $template['structure'] = json_decode($template['structure'], true);
    }

    Response::success($templates);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
