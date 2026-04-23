<?php
/**
 * Refresh Token API Endpoint
 * POST /api/auth/refresh.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/jwt.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['refresh_token'])) {
    Response::error('Refresh token is required', 400);
}

$refreshToken = $input['refresh_token'];
$payload = JWT::decode($refreshToken);

if ($payload === null) {
    Response::error('Invalid or expired refresh token', 401);
}

// Verify it's a refresh token
if (!isset($payload['type']) || $payload['type'] !== 'refresh') {
    Response::error('Invalid token type', 401);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get user
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        Response::error('User not found', 404);
    }

    // Generate new tokens
    $newAccessToken = JWT::encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'session_token' => $user['session_token']
    ]);

    $newRefreshToken = JWT::encodeRefresh([
        'user_id' => $user['id']
    ]);

    Response::success([
        'access_token' => $newAccessToken,
        'refresh_token' => $newRefreshToken,
        'expires_in' => JWT_EXPIRY
    ], 'Token refreshed successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
