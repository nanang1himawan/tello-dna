<?php
/**
 * Register API Endpoint
 * POST /api/auth/register.php
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

// Validate input
$errors = [];

if (empty($input['email'])) {
    $errors['email'] = 'Email is required';
} elseif (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Invalid email format';
}

if (empty($input['password'])) {
    $errors['password'] = 'Password is required';
} elseif (strlen($input['password']) < 6) {
    $errors['password'] = 'Password must be at least 6 characters';
}

if (empty($input['name'])) {
    $errors['name'] = 'Name is required';
}

if (!empty($errors)) {
    Response::error('Validation failed', 400, $errors);
}

$email = trim($input['email']);
$password = password_hash($input['password'], PASSWORD_DEFAULT);
$name = trim($input['name']);
$role = 'staff'; // Default role for self-registration

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        Response::error('Email already registered', 409);
    }

    // Create user
    $stmt = $db->prepare("
        INSERT INTO users (email, password, name, role) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$email, $password, $name, $role]);
    
    $userId = $db->lastInsertId();

    // Generate tokens
    $accessToken = JWT::encode([
        'user_id' => $userId,
        'email' => $email,
        'role' => $role
    ]);

    $refreshToken = JWT::encodeRefresh([
        'user_id' => $userId
    ]);

    Response::created([
        'user' => [
            'id' => $userId,
            'email' => $email,
            'name' => $name,
            'role' => $role,
            'avatar' => null
        ],
        'access_token' => $accessToken,
        'refresh_token' => $refreshToken,
        'expires_in' => JWT_EXPIRY
    ], 'Registration successful');

} catch (PDOException $e) {
    error_log($e->getMessage());
    Response::error('Database error', 500);
}
