<?php
/**
 * Delete user (Admin only)
 * DELETE /api/users/delete.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    Response::error('Method not allowed', 405);
}

// Require authentication and permission
Auth::verify();
RBAC::can('delete_user');

// Get user ID
$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('User ID is required', 400);
}

// Prevent self-deletion
if (Auth::$user['id'] == $id) {
    Response::error('Cannot delete your own account', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if user exists
    $stmt = $db->prepare("SELECT id, name FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        Response::notFound('User not found');
    }

    // Delete user
    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, "User '{$user['name']}' deleted successfully");

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
