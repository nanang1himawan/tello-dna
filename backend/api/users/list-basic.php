<?php
/**
 * Get basic user list for assignment purposes
 * GET /api/users/list-basic.php
 * 
 * This endpoint returns only basic user info (id, name, avatar)
 * and is accessible by all authenticated users for task assignment
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

// Require authentication (no RBAC restriction needed for basic list)
Auth::verify();

try {
    $db = Database::getInstance()->getConnection();
    
    // Get search param (optional)
    $search = $_GET['search'] ?? '';

    // Build query - only return basic info needed for assignment
    $where = '';
    $params = [];
    
    if (!empty($search)) {
        $where = "WHERE name LIKE ?";
        $params[] = "%$search%";
    }
    
    // Get users with basic info only
    $stmt = $db->prepare("
        SELECT id, name, avatar
        FROM users
        $where
        ORDER BY name ASC
        LIMIT 200
    ");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    Response::success([
        'users' => $users
    ]);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
