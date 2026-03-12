<?php
/**
 * Project Invitation API
 * POST /api/projects/invite.php - Send invitation
 * Body: { project_id: 1, email: "user@example.com" }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Check permission (admin/manager only)
if (!in_array(Auth::$user['role'], ['admin', 'manager'])) {
    Response::error('Permission denied', 403);
}

$input = json_decode(file_get_contents('php://input'), true);

$projectId = $input['project_id'] ?? null;
$email = $input['email'] ?? null;
$role = $input['role'] ?? 'member';

if (!$projectId || !$email) {
    Response::error('Project ID and email are required', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error('Invalid email address', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get project
    $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    $project = $stmt->fetch();
    
    if (!$project) {
        Response::notFound('Project not found');
    }
    
    // Check if user exists
    $stmt = $db->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        // User exists, add directly to project
        $stmt = $db->prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?");
        $stmt->execute([$projectId, $existingUser['id']]);
        
        if ($stmt->fetch()) {
            Response::error('User is already a member of this project', 400);
        }
        
        $stmt = $db->prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)");
        $stmt->execute([$projectId, $existingUser['id'], $role]);
        
        // Send notification email
        EmailHelper::sendProjectInvitation(
            $email,
            $project['name'],
            Auth::$user['name']
        );
        
        // Create in-app notification
        require_once __DIR__ . '/../../helpers/notification.php';
        Notification::create(
            $existingUser['id'],
            'project',
            'Ditambahkan ke Project',
            Auth::$user['name'] . ' menambahkan Anda ke project "' . $project['name'] . '"',
            ['project_id' => $projectId]
        );
        
        Response::success([
            'status' => 'added',
            'user_id' => $existingUser['id'],
            'user_name' => $existingUser['name']
        ], 'User added to project');
    } else {
        // User doesn't exist, send invitation email
        // Generate invite token
        $token = bin2hex(random_bytes(32));
        
        // Store pending invitation (you may want to create an invitations table)
        // For now, just send email
        EmailHelper::sendProjectInvitation(
            $email,
            $project['name'],
            Auth::$user['name'],
            $token
        );
        
        Response::success([
            'status' => 'invited',
            'email' => $email
        ], 'Invitation sent to ' . $email);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
