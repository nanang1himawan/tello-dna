<?php
/**
 * Get single user
 * GET /api/users/show.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

// Require authentication
Auth::verify();

// Get user ID
$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('User ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT id, email, name, role, avatar, created_at, updated_at 
        FROM users 
        WHERE id = ?
    ");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        Response::notFound('User not found');
    }

    Response::success($user);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
