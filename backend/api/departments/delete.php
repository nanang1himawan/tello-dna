<?php
/**
 * Delete department (Admin only)
 * DELETE /api/departments/delete.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

// Only allow DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if department exists
    $stmt = $db->prepare("SELECT id, name FROM departments WHERE id = ?");
    $stmt->execute([$id]);
    $department = $stmt->fetch();
    
    if (!$department) {
        Response::notFound('Department not found');
    }

    // Check if department has members
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE department_id = ?");
    $stmt->execute([$id]);
    $memberCount = $stmt->fetch()['count'];

    if ($memberCount > 0) {
        Response::error("Cannot delete department with {$memberCount} member(s). Please reassign members first.", 400);
    }

    // Delete department
    $stmt = $db->prepare("DELETE FROM departments WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, "Department '{$department['name']}' deleted successfully");

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
