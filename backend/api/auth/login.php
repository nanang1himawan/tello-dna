<?php
/**
 * Login API Endpoint
 * POST /api/auth/login.php
 * 
 * Features:
 * - Generates session_token stored in database (single device login)
 * - Sets last_activity timestamp
 * - Returns long-lived token (7 days)
 */

// CORS must be first to handle preflight OPTIONS request
require_once __DIR__ . '/../../config/cors.php';

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/jwt.php';
require_once __DIR__ . '/../../helpers/response.php';

// Session configuration
define('SESSION_EXPIRY_DAYS', 7);
define('IDLE_TIMEOUT_HOURS', 2);

// Only allow POST (OPTIONS already handled in cors.php)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (empty($input['email']) || empty($input['password'])) {
    Response::error('Email and password are required', 400);
}

$email = trim($input['email']);
$password = $input['password'];

try {
    $db = Database::getInstance()->getConnection();
    
    // Find user by email
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        Response::error('Invalid email or password', 401);
    }

    // Verify password
    if (!password_verify($password, $user['password'])) {
        Response::error('Invalid email or password', 401);
    }

    // Generate unique session token
    $sessionToken = bin2hex(random_bytes(32));
    
    // Update user's session_token and last_activity
    // This invalidates any existing session on other devices
    $stmt = $db->prepare("
        UPDATE users 
        SET session_token = ?, last_activity = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$sessionToken, $user['id']]);

    // Generate JWT with session token embedded
    $expiry = time() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60);
    $accessToken = JWT::encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'session_token' => $sessionToken
    ], SESSION_EXPIRY_DAYS * 24 * 60 * 60); // 7 days expiry

    // Return user data and token
    Response::success([
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'avatar' => $user['avatar']
        ],
        'access_token' => $accessToken,
        'expires_in' => SESSION_EXPIRY_DAYS * 24 * 60 * 60, // seconds
        'expires_at' => date('Y-m-d H:i:s', $expiry),
        'idle_timeout_hours' => IDLE_TIMEOUT_HOURS
    ], 'Login successful');

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
