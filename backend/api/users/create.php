<?php
/**
 * Create new user (Admin only)
 * POST /api/users/create.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Require authentication and permission
Auth::verify();
RBAC::can('create_user');

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

$validRoles = ['admin', 'manager', 'staff'];
if (!empty($input['role']) && !in_array($input['role'], $validRoles)) {
    $errors['role'] = 'Invalid role. Must be: ' . implode(', ', $validRoles);
}

if (!empty($errors)) {
    Response::error('Validation failed', 400, $errors);
}

$email = trim($input['email']);
$password = password_hash($input['password'], PASSWORD_DEFAULT);
$name = trim($input['name']);
$role = $input['role'] ?? 'staff';

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

    // Get created user
    $stmt = $db->prepare("
        SELECT id, email, name, role, avatar, created_at 
        FROM users WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    Response::created($user, 'User created successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
