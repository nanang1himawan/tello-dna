<?php
/**
 * Get reports/statistics data
 * GET /api/reports/stats.php
 * 
 * Query params:
 * - project_id: Filter by project (optional)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$projectId = $_GET['project_id'] ?? null;

$userId = Auth::$user['id'];
$role = Auth::$user['role'];

try {
    $db = Database::getInstance()->getConnection();
    
    $projectFilter = "";
    $params = [];
    
    if ($projectId) {
        $projectFilter = " AND p.id = ?";
        $params[] = $projectId;
    }
    
    // For non-admin, filter to accessible projects
    $accessFilter = "";
    if ($role !== 'admin' && $role !== 'manager') {
        $accessFilter = " AND (p.owner_id = ? OR t.assignee_id = ? OR EXISTS (
            SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?
        ))";
        $params[] = $userId;
        $params[] = $userId;
        $params[] = $userId;
    }
    
    // Issues by Status (column)
    $stmt = $db->prepare("
        SELECT c.name as status, COUNT(*) as count, c.color
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE 1=1 $projectFilter $accessFilter
        GROUP BY c.id, c.name, c.color
        ORDER BY c.position
    ");
    $stmt->execute($params);
    $byStatus = $stmt->fetchAll();
    
    // Issues by Type
    $stmt = $db->prepare("
        SELECT COALESCE(t.type, 'task') as type, COUNT(*) as count
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE 1=1 $projectFilter $accessFilter
        GROUP BY t.type
        ORDER BY count DESC
    ");
    $stmt->execute($params);
    $byType = $stmt->fetchAll();
    
    // Issues by Severity
    $stmt = $db->prepare("
        SELECT t.severity, COUNT(*) as count
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE 1=1 $projectFilter $accessFilter
        GROUP BY t.severity
        ORDER BY FIELD(t.severity, 'critical', 'major', 'minor')
    ");
    $stmt->execute($params);
    $bySeverity = $stmt->fetchAll();
    
    // Issues by Assignee (top 10)
    $stmt = $db->prepare("
        SELECT u.name as assignee, COUNT(*) as count
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.assignee_id IS NOT NULL $projectFilter $accessFilter
        GROUP BY t.assignee_id, u.name
        ORDER BY count DESC
        LIMIT 10
    ");
    $stmt->execute($params);
    $byAssignee = $stmt->fetchAll();
    
    // Sprint Progress (if project specified)
    $sprintProgress = [];
    if ($projectId) {
        $stmt = $db->prepare("
            SELECT s.id, s.name, s.status,
                   COUNT(t.id) as total_tasks,
                   SUM(CASE WHEN LOWER(c.name) IN ('done', 'selesai', 'completed') THEN 1 ELSE 0 END) as completed_tasks
            FROM sprints s
            LEFT JOIN tasks t ON t.sprint_id = s.id
            LEFT JOIN columns c ON t.column_id = c.id
            WHERE s.project_id = ?
            GROUP BY s.id, s.name, s.status
            ORDER BY FIELD(s.status, 'active', 'planning', 'completed'), s.created_at DESC
        ");
        $stmt->execute([$projectId]);
        $sprintProgress = $stmt->fetchAll();
    }
    
    // Weekly completion trend (last 4 weeks)
    $stmt = $db->prepare("
        SELECT 
            DATE_FORMAT(t.actual_end_date, '%Y-%W') as week,
            COUNT(*) as count
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE t.actual_end_date IS NOT NULL
        AND t.actual_end_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
        $projectFilter $accessFilter
        GROUP BY week
        ORDER BY week
    ");
    $stmt->execute($params);
    $weeklyTrend = $stmt->fetchAll();
    
    // Total counts
    $stmt = $db->prepare("
        SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN LOWER(c.name) IN ('done', 'selesai', 'completed') THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN t.due_date < CURDATE() AND LOWER(c.name) NOT IN ('done', 'selesai', 'completed') THEN 1 ELSE 0 END) as overdue_tasks
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE 1=1 $projectFilter $accessFilter
    ");
    $stmt->execute($params);
    $totals = $stmt->fetch();

    Response::success([
        'totals' => $totals,
        'by_status' => $byStatus,
        'by_type' => $byType,
        'by_severity' => $bySeverity,
        'by_assignee' => $byAssignee,
        'sprint_progress' => $sprintProgress,
        'weekly_trend' => $weeklyTrend,
    ]);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
