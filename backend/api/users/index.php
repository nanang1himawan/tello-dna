<?php
/**
 * Get all users
 * GET /api/users/index.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

// Require authentication
Auth::verify();

// Check permission - only admin and manager can list all users
RBAC::can('view_users');

try {
    $db = Database::getInstance()->getConnection();
    
    // Get pagination params
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
    $offset = ($page - 1) * $limit;
    
    // Get search param
    $search = $_GET['search'] ?? '';
    $role = $_GET['role'] ?? '';

    // Build query
    $where = [];
    $params = [];
    
    if (!empty($search)) {
        $where[] = "(name LIKE ? OR email LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    if (!empty($role) && in_array($role, ['admin', 'manager', 'staff'])) {
        $where[] = "role = ?";
        $params[] = $role;
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Get total count
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM users $whereClause");
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];
    
    // Get users with department info
    $stmt = $db->prepare("
        SELECT u.id, u.email, u.name, u.role, u.avatar, u.department_id, u.created_at,
               d.name as department_name, d.color as department_color
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        " . ($whereClause ? str_replace('name', 'u.name', str_replace('email', 'u.email', str_replace('role', 'u.role', $whereClause))) : '') . "
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $params[] = $limit;
    $params[] = $offset;
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    Response::success([
        'users' => $users,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]
    ]);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
