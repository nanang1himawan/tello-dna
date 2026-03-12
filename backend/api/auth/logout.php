<?php
/**
 * Logout API Endpoint
 * POST /api/auth/logout.php
 * 
 * Clears session_token in database
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Get current user (optional - doesn't fail if session expired)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!empty($authHeader) && preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
    $token = $matches[1];
    $payload = JWT::decode($token);
    
    if ($payload && isset($payload['user_id'])) {
        try {
            $db = Database::getInstance()->getConnection();
            
            // Clear session_token to invalidate session
            $stmt = $db->prepare("
                UPDATE users 
                SET session_token = NULL, last_activity = NULL 
                WHERE id = ?
            ");
            $stmt->execute([$payload['user_id']]);
            
        } catch (PDOException $e) {
            // Ignore database errors on logout
        }
    }
}

Response::success(null, 'Logged out successfully');
