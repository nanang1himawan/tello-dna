<?php
/**
 * Update project
 * PUT /api/projects/update.php?id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$id = $_GET['id'] ?? null;
if (!$id) {
    Response::error('Project ID is required', 400);
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = Database::getInstance()->getConnection();
    
    // Check project exists and user has permission
    $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$id]);
    $project = $stmt->fetch();
    
    if (!$project) {
        Response::notFound('Project not found');
    }
    
    // Only owner, admin, or manager can update
    $role = Auth::$user['role'];
    if ($project['owner_id'] != Auth::$user['id'] && $role !== 'admin' && $role !== 'manager') {
        Response::forbidden('You do not have permission to update this project');
    }
    
    $db->beginTransaction();
    
    $updates = [];
    $params = [];
    
    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = "name = ?";
        $params[] = trim($input['name']);
    }
    
    if (isset($input['description'])) {
        $updates[] = "description = ?";
        $params[] = $input['description'];
    }
    
    if (isset($input['color']) && preg_match('/^#[0-9A-Fa-f]{6}$/', $input['color'])) {
        $updates[] = "color = ?";
        $params[] = $input['color'];
    }
    
    // Update project fields if any
    if (!empty($updates)) {
        $params[] = $id;
        $stmt = $db->prepare("UPDATE projects SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
    }
    
    // Update members if provided
    if (isset($input['member_ids']) && is_array($input['member_ids'])) {
        // Get current owner to preserve
        $ownerId = $project['owner_id'];
        
        // Delete all non-owner members
        $stmt = $db->prepare("DELETE FROM project_members WHERE project_id = ? AND role != 'owner'");
        $stmt->execute([$id]);
        
        // Add new members
        $insertStmt = $db->prepare("
            INSERT INTO project_members (project_id, user_id, role) 
            VALUES (?, ?, 'member')
        ");
        
        foreach ($input['member_ids'] as $memberId) {
            // Don't add owner as member (they're already owner)
            if ($memberId != $ownerId) {
                $insertStmt->execute([$id, $memberId]);
            }
        }
    }
    
    $db->commit();
    
    // Get updated project with members
    $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$id]);
    $updatedProject = $stmt->fetch();
    
    // Get members
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.role, pm.role as project_role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
    ");
    $stmt->execute([$id]);
    $updatedProject['members'] = $stmt->fetchAll();

    Response::success($updatedProject, 'Project updated successfully');

} catch (PDOException $e) {
    $db->rollBack();
    Response::error('Database error: ' . $e->getMessage(), 500);
}
