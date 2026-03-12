<?php
/**
 * Get all projects
 * GET /api/projects/index.php
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
    $userId = Auth::$user['id'];
    $role = Auth::$user['role'];
    
    // Admin sees all projects, others see:
    // - Projects they own
    // - Projects where they are members
    // - Projects where they have assigned tasks
    if ($role === 'admin' || $role === 'manager') {
        $stmt = $db->query("
            SELECT p.*, u.name as owner_name,
                   (SELECT COUNT(*) FROM boards WHERE project_id = p.id) as board_count,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            ORDER BY p.created_at DESC
        ");
    } else {
        $stmt = $db->prepare("
            SELECT DISTINCT p.*, u.name as owner_name,
                   (SELECT COUNT(*) FROM boards WHERE project_id = p.id) as board_count,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN project_members pm ON pm.project_id = p.id
            LEFT JOIN boards b ON b.project_id = p.id
            LEFT JOIN columns c ON c.board_id = b.id
            LEFT JOIN tasks t ON t.column_id = c.id AND t.assignee_id = ?
            WHERE p.owner_id = ? OR pm.user_id = ? OR t.assignee_id = ?
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$userId, $userId, $userId, $userId]);
    }
    
    $projects = $stmt->fetchAll();

    Response::success($projects);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
