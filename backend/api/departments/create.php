<?php
/**
 * Create new department (Admin only)
 * POST /api/departments/create.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Require authentication and admin role
Auth::verify();
Auth::requireRole(['admin']);

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (empty($input['name'])) {
    Response::error('Department name is required', 400);
}

$name = trim($input['name']);
$color = $input['color'] ?? '#6366f1';
$description = $input['description'] ?? null;

// Validate color format
if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
    $color = '#6366f1';
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if department already exists
    $stmt = $db->prepare("SELECT id FROM departments WHERE name = ?");
    $stmt->execute([$name]);
    
    if ($stmt->fetch()) {
        Response::error('Department already exists', 409);
    }

    // Create department
    $stmt = $db->prepare("
        INSERT INTO departments (name, color, description) 
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$name, $color, $description]);
    
    $departmentId = $db->lastInsertId();

    // Get created department
    $stmt = $db->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$departmentId]);
    $department = $stmt->fetch();

    Response::created($department, 'Department created successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
