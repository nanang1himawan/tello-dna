<?php
/**
 * Get user workload statistics
 * GET /api/users/workload.php
 * 
 * Query params:
 *   user_id    (optional) - Filter to specific user
 *   project_id (optional) - Filter tasks to specific project
 * 
 * Admin: sees all users
 * Manager: sees only users in projects they manage
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$role = Auth::$user['role'];
$userId = Auth::$user['id'];

// Only admin and manager can view workload
if ($role !== 'admin' && $role !== 'manager') {
    Response::forbidden('Access denied');
}

// Get optional filters
$filterUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$filterProjectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;

try {
    $db = Database::getInstance()->getConnection();
    
    // --- Fetch users ---
    if ($role === 'admin') {
        if ($filterUserId) {
            $usersSql = "SELECT id, name, email, role, avatar FROM users WHERE id = ? ORDER BY name";
            $usersStmt = $db->prepare($usersSql);
            $usersStmt->execute([$filterUserId]);
        } else {
            $usersSql = "SELECT id, name, email, role, avatar FROM users WHERE role != 'admin' ORDER BY name";
            $usersStmt = $db->query($usersSql);
        }
    } else {
        // Manager sees only users in projects they manage/own
        $usersSql = "
            SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar
            FROM users u
            JOIN project_members pm ON pm.user_id = u.id
            JOIN projects p ON pm.project_id = p.id
            WHERE (p.owner_id = ? OR EXISTS (
                SELECT 1 FROM project_members pm2 
                WHERE pm2.project_id = p.id AND pm2.user_id = ?
            ))
        ";
        $params = [$userId, $userId];

        if ($filterUserId) {
            $usersSql .= " AND u.id = ?";
            $params[] = $filterUserId;
        }

        $usersSql .= " ORDER BY u.name";
        $usersStmt = $db->prepare($usersSql);
        $usersStmt->execute($params);
    }
    
    $users = $usersStmt->fetchAll();
    
    // --- Get task counts for each user (with optional project filter) ---
    $taskCountSql = "
        SELECT 
            t.assignee_id,
            COUNT(*) as total_tasks,
            SUM(CASE WHEN col.name IN ('Done', 'Completed', 'Selesai') THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN col.name IN ('In Progress', 'Sedang Dikerjakan') THEN 1 ELSE 0 END) as in_progress_tasks,
            SUM(CASE WHEN t.due_date < CURDATE() AND col.name NOT IN ('Done', 'Completed', 'Selesai') THEN 1 ELSE 0 END) as overdue_tasks,
            SUM(CASE WHEN t.severity = 'critical' AND col.name NOT IN ('Done', 'Completed', 'Selesai') THEN 1 ELSE 0 END) as critical_tasks
        FROM tasks t
        JOIN columns col ON t.column_id = col.id
        JOIN boards b ON col.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE t.assignee_id IS NOT NULL
    ";
    $taskParams = [];

    if ($filterProjectId) {
        $taskCountSql .= " AND p.id = ?";
        $taskParams[] = $filterProjectId;
    }

    $taskCountSql .= " GROUP BY t.assignee_id";

    $taskCountStmt = $db->prepare($taskCountSql);
    $taskCountStmt->execute($taskParams);

    $taskCounts = [];
    while ($row = $taskCountStmt->fetch()) {
        $taskCounts[$row['assignee_id']] = $row;
    }
    
    // --- Merge task counts with users ---
    $result = [];
    foreach ($users as $user) {
        $counts = $taskCounts[$user['id']] ?? [
            'total_tasks' => 0,
            'completed_tasks' => 0,
            'in_progress_tasks' => 0,
            'overdue_tasks' => 0,
            'critical_tasks' => 0
        ];
        
        $pending = $counts['total_tasks'] - $counts['completed_tasks'];
        
        $result[] = [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'avatar' => $user['avatar'],
            'total_tasks' => (int)$counts['total_tasks'],
            'completed_tasks' => (int)$counts['completed_tasks'],
            'in_progress_tasks' => (int)$counts['in_progress_tasks'],
            'pending_tasks' => (int)$pending,
            'overdue_tasks' => (int)$counts['overdue_tasks'],
            'critical_tasks' => (int)$counts['critical_tasks'],
            'completion_rate' => $counts['total_tasks'] > 0 
                ? round(($counts['completed_tasks'] / $counts['total_tasks']) * 100) 
                : 0
        ];
    }
    
    // Sort by pending tasks (highest first)
    usort($result, function($a, $b) {
        return $b['pending_tasks'] - $a['pending_tasks'];
    });

    // --- Fetch available projects (for filter dropdown) ---
    if ($role === 'admin') {
        $projectsSql = "SELECT id, name, color FROM projects ORDER BY name";
        $projectsStmt = $db->query($projectsSql);
    } else {
        $projectsSql = "
            SELECT DISTINCT p.id, p.name, p.color
            FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            WHERE p.owner_id = ? OR pm.user_id = ?
            ORDER BY p.name
        ";
        $projectsStmt = $db->prepare($projectsSql);
        $projectsStmt->execute([$userId, $userId]);
    }
    $projects = $projectsStmt->fetchAll();

    // --- Fetch all users for dropdown (unfiltered) ---
    if ($role === 'admin') {
        $allUsersSql = "SELECT id, name, role FROM users WHERE role != 'admin' ORDER BY name";
        $allUsersStmt = $db->query($allUsersSql);
    } else {
        $allUsersSql = "
            SELECT DISTINCT u.id, u.name, u.role
            FROM users u
            JOIN project_members pm ON pm.user_id = u.id
            JOIN projects p ON pm.project_id = p.id
            WHERE p.owner_id = ? OR EXISTS (
                SELECT 1 FROM project_members pm2 
                WHERE pm2.project_id = p.id AND pm2.user_id = ?
            )
            ORDER BY u.name
        ";
        $allUsersStmt = $db->prepare($allUsersSql);
        $allUsersStmt->execute([$userId, $userId]);
    }
    $allUsers = $allUsersStmt->fetchAll();

    Response::success([
        'users' => $result,
        'all_users' => $allUsers,
        'projects' => $projects
    ]);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
