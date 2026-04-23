<?php
/**
 * Get dashboard statistics
 * GET /api/dashboard/stats.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

try {
    $db = Database::getInstance()->getConnection();
    $userId = Auth::$user['id'];
    $role = Auth::$user['role'];
    
    // Total projects (user can access)
    if ($role === 'admin') {
        $stmt = $db->query("SELECT COUNT(*) as count FROM projects");
    } else {
        $stmt = $db->prepare("
            SELECT COUNT(DISTINCT p.id) as count 
            FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            WHERE p.owner_id = ? OR pm.user_id = ?
        ");
        $stmt->execute([$userId, $userId]);
    }
    $totalProjects = $stmt->fetch()['count'];
    
    // Tasks by status (for user)
    $stmt = $db->prepare("
        SELECT c.name as column_name, COUNT(t.id) as count
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        WHERE t.assignee_id = ? OR t.created_by = ?
        GROUP BY c.name
        ORDER BY MIN(c.position)
    ");
    $stmt->execute([$userId, $userId]);
    $tasksByStatus = $stmt->fetchAll();
    
    // My open tasks
    $stmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        WHERE (t.assignee_id = ? OR t.created_by = ?)
        AND c.name NOT IN ('Done', 'Closed', 'Completed')
    ");
    $stmt->execute([$userId, $userId]);
    $myOpenTasks = $stmt->fetch()['count'];
    
    // Overdue tasks
    $stmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        WHERE (t.assignee_id = ? OR t.created_by = ?)
        AND t.due_date < CURDATE()
        AND c.name NOT IN ('Done', 'Closed', 'Completed')
    ");
    $stmt->execute([$userId, $userId]);
    $overdueTasks = $stmt->fetch()['count'];
    
    // Due this week
    $stmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        WHERE (t.assignee_id = ? OR t.created_by = ?)
        AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND c.name NOT IN ('Done', 'Closed', 'Completed')
    ");
    $stmt->execute([$userId, $userId]);
    $dueThisWeek = $stmt->fetch()['count'];
    
    // Recent activity (audit logs)
    $stmt = $db->prepare("
        SELECT al.*, u.name as user_name
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $recentActivity = $stmt->fetchAll();
    
    // Tasks by severity (for charts)
    $stmt = $db->prepare("
        SELECT severity, COUNT(*) as count 
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        WHERE (t.assignee_id = ? OR t.created_by = ?)
        AND c.name NOT IN ('Done', 'Closed', 'Completed')
        GROUP BY severity
    ");
    $stmt->execute([$userId, $userId]);
    $tasksBySeverity = $stmt->fetchAll();
    
    // Team members (if admin/manager)
    $teamSize = 0;
    if ($role === 'admin' || $role === 'manager') {
        $stmt = $db->query("SELECT COUNT(*) as count FROM users");
        $teamSize = $stmt->fetch()['count'];
    }

    Response::success([
        'total_projects' => (int)$totalProjects,
        'my_open_tasks' => (int)$myOpenTasks,
        'overdue_tasks' => (int)$overdueTasks,
        'due_this_week' => (int)$dueThisWeek,
        'team_size' => (int)$teamSize,
        'tasks_by_status' => $tasksByStatus,
        'tasks_by_severity' => $tasksBySeverity,
        'recent_activity' => $recentActivity
    ]);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
