<?php
/**
 * Update user
 * PUT /api/users/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow PUT
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

// Require authentication
Auth::verify();

// Get user ID
$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('User ID is required', 400);
}

// Check permission - can update own profile or need update_user permission
if (Auth::$user['id'] != $id) {
    RBAC::can('update_user');
}

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if user exists
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        Response::notFound('User not found');
    }

    // Build update query
    $updates = [];
    $params = [];

    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = "name = ?";
        $params[] = trim($input['name']);
    }

    if (isset($input['email']) && !empty(trim($input['email']))) {
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 400);
        }
        
        // Check if email is taken by another user
        $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $checkStmt->execute([trim($input['email']), $id]);
        if ($checkStmt->fetch()) {
            Response::error('Email already in use', 409);
        }
        
        $updates[] = "email = ?";
        $params[] = trim($input['email']);
    }

    if (isset($input['password']) && !empty($input['password'])) {
        if (strlen($input['password']) < 6) {
            Response::error('Password must be at least 6 characters', 400);
        }
        $updates[] = "password = ?";
        $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
    }

    // Only admin can change roles
    if (isset($input['role'])) {
        if (Auth::$user['role'] !== 'admin') {
            Response::forbidden('Only admin can change user roles');
        }
        $validRoles = ['admin', 'manager', 'staff'];
        if (!in_array($input['role'], $validRoles)) {
            Response::error('Invalid role', 400);
        }
        $updates[] = "role = ?";
        $params[] = $input['role'];
    }

    if (isset($input['avatar'])) {
        $updates[] = "avatar = ?";
        $params[] = $input['avatar'];
    }

    // Handle department assignment (admin only)
    if (array_key_exists('department_id', $input)) {
        if (Auth::$user['role'] !== 'admin') {
            Response::forbidden('Only admin can change user departments');
        }
        $updates[] = "department_id = ?";
        $params[] = $input['department_id'] ?: null;
    }

    if (empty($updates)) {
        Response::error('No valid fields to update', 400);
    }

    $params[] = $id;
    $stmt = $db->prepare("
        UPDATE users 
        SET " . implode(', ', $updates) . "
        WHERE id = ?
    ");
    $stmt->execute($params);

    // Get updated user
    $stmt = $db->prepare("
        SELECT id, email, name, role, avatar, created_at, updated_at 
        FROM users WHERE id = ?
    ");
    $stmt->execute([$id]);
    $updatedUser = $stmt->fetch();

    Response::success($updatedUser, 'User updated successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
