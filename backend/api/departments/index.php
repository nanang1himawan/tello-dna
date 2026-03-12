<?php
/**
 * Get all departments
 * GET /api/departments/index.php
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

try {
    $db = Database::getInstance()->getConnection();
    
    // Get all departments
    $stmt = $db->query("
        SELECT d.*, COUNT(u.id) as member_count 
        FROM departments d 
        LEFT JOIN users u ON u.department_id = d.id 
        GROUP BY d.id 
        ORDER BY d.name ASC
    ");
    $departments = $stmt->fetchAll();

    Response::success($departments);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}
