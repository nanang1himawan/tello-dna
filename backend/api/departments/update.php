<?php
/**
 * Update department (Admin only)
 * PUT /api/departments/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow PUT
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

// Require authentication and admin role
Auth::verify();
Auth::requireRole(['admin']);

// Get department ID
$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Department ID is required', 400);
}

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if department exists
    $stmt = $db->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$id]);
    $department = $stmt->fetch();
    
    if (!$department) {
        Response::notFound('Department not found');
    }

    // Build update query
    $updates = [];
    $params = [];

    if (isset($input['name']) && !empty(trim($input['name']))) {
        // Check if name is taken by another department
        $checkStmt = $db->prepare("SELECT id FROM departments WHERE name = ? AND id != ?");
        $checkStmt->execute([trim($input['name']), $id]);
        if ($checkStmt->fetch()) {
            Response::error('Department name already exists', 409);
        }
        
        $updates[] = "name = ?";
        $params[] = trim($input['name']);
    }

    if (isset($input['color'])) {
        if (preg_match('/^#[0-9A-Fa-f]{6}$/', $input['color'])) {
            $updates[] = "color = ?";
            $params[] = $input['color'];
        }
    }

    if (isset($input['description'])) {
        $updates[] = "description = ?";
        $params[] = $input['description'];
    }

    if (empty($updates)) {
        Response::error('No valid fields to update', 400);
    }

    $params[] = $id;
    $stmt = $db->prepare("
        UPDATE departments 
        SET " . implode(', ', $updates) . "
        WHERE id = ?
    ");
    $stmt->execute($params);

    // Get updated department
    $stmt = $db->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$id]);
    $updatedDepartment = $stmt->fetch();

    Response::success($updatedDepartment, 'Department updated successfully');

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
