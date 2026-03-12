<?php
/**
 * Create new project
 * POST /api/projects/create.php
 * 
 * Only admin can create projects
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

// Only admin can create projects
if (Auth::$user['role'] !== 'admin') {
    Response::forbidden('Only admin can create projects');
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['name'])) {
    Response::error('Project name is required', 400);
}

$name = trim($input['name']);
$description = $input['description'] ?? null;
$color = $input['color'] ?? '#6366f1';
$memberIds = $input['member_ids'] ?? []; // Array of user IDs to add as members
$template = $input['template'] ?? 'kanban'; // Template type: kanban or daily-task
$customColumns = $input['custom_columns'] ?? null; // Custom columns for daily-task template

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    // Create project
    $stmt = $db->prepare("
        INSERT INTO projects (name, description, color, owner_id) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$name, $description, $color, Auth::$user['id']]);
    $projectId = $db->lastInsertId();
    
    // Add owner as member
    $stmt = $db->prepare("
        INSERT INTO project_members (project_id, user_id, role) 
        VALUES (?, ?, 'owner')
    ");
    $stmt->execute([$projectId, Auth::$user['id']]);
    
    // Add other members
    if (!empty($memberIds)) {
        $insertMemberStmt = $db->prepare("
            INSERT INTO project_members (project_id, user_id, role) 
            VALUES (?, ?, 'member')
        ");
        foreach ($memberIds as $memberId) {
            // Don't add owner again
            if ($memberId != Auth::$user['id']) {
                $insertMemberStmt->execute([$projectId, $memberId]);
            }
        }
    }
    
    // Create default board with columns
    $stmt = $db->prepare("INSERT INTO boards (project_id, name) VALUES (?, 'Main Board')");
    $stmt->execute([$projectId]);
    $boardId = $db->lastInsertId();
    
    // Create columns based on template
    if ($template === 'daily-task' && !empty($customColumns)) {
        // Use custom columns from user
        $defaultColumns = [];
        foreach ($customColumns as $idx => $col) {
            $colName = $col['name'] ?? 'Column ' . ($idx + 1);
            $colColor = $col['color'] ?? '#6366f1';
            $defaultColumns[] = [$colName, $colColor, $idx];
        }
    } else {
        // Use default kanban columns
        $defaultColumns = [
            ['Backlog', '#64748b', 0],
            ['To Do', '#3b82f6', 1],
            ['In Progress', '#f59e0b', 2],
            ['Review', '#8b5cf6', 3],
            ['Done', '#10b981', 4]
        ];
    }
    
    $stmt = $db->prepare("INSERT INTO columns (board_id, name, color, position) VALUES (?, ?, ?, ?)");
    foreach ($defaultColumns as $col) {
        $stmt->execute([$boardId, $col[0], $col[1], $col[2]]);
    }
    
    $db->commit();
    
    // Get created project with members
    $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    $project = $stmt->fetch();
    
    // Get members
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.role, pm.role as project_role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
    ");
    $stmt->execute([$projectId]);
    $project['members'] = $stmt->fetchAll();

    Response::created($project, 'Project created successfully');

} catch (PDOException $e) {
    $db->rollBack();
    Response::error('Database error: ' . $e->getMessage(), 500);
}
