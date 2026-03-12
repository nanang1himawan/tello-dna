<?php
/**
 * Get tasks for calendar view
 * GET /api/tasks/calendar.php
 * 
 * Query params:
 * - start: Start date (Y-m-d)
 * - end: End date (Y-m-d)
 * - project_id: Filter by project (optional)
 * - my_tasks: If "true", only show tasks assigned to current user (default: false)
 * - view: "plan" (default) or "actual" - determines which dates to use
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$start = $_GET['start'] ?? date('Y-m-01');
$end = $_GET['end'] ?? date('Y-m-t');
$projectId = $_GET['project_id'] ?? null;
$myTasksOnly = filter_var($_GET['my_tasks'] ?? false, FILTER_VALIDATE_BOOLEAN);
$view = $_GET['view'] ?? 'plan'; // 'plan' or 'actual'

$userId = Auth::$user['id'];
$role = Auth::$user['role'];

try {
    $db = Database::getInstance()->getConnection();
    
    // First, get the list of project IDs the user has access to
    if ($role === 'admin' || $role === 'manager') {
        $accessibleProjects = null; // null means all
    } else {
        $projectStmt = $db->prepare("
            SELECT DISTINCT p.id 
            FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id
            LEFT JOIN boards b ON b.project_id = p.id
            LEFT JOIN columns c ON c.board_id = b.id
            LEFT JOIN tasks t ON t.column_id = c.id
            WHERE p.owner_id = ? OR pm.user_id = ? OR t.assignee_id = ?
        ");
        $projectStmt->execute([$userId, $userId, $userId]);
        $accessibleProjects = $projectStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($accessibleProjects)) {
            Response::success([]);
        }
    }
    
    // Determine date fields based on view
    if ($view === 'actual') {
        $startField = 'actual_start_date';
        $endField = 'actual_end_date';
    } else {
        $startField = 'start_date';
        $endField = 'due_date';
    }
    
    // Now fetch tasks
    $sql = "
        SELECT DISTINCT t.*, 
               c.name as column_name, c.color as column_color,
               b.name as board_name, b.id as board_id,
               p.name as project_name, p.id as project_id, p.color as project_color,
               u.name as assignee_name, u.avatar as assignee_avatar
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE (t.due_date IS NOT NULL OR t.start_date IS NOT NULL OR t.actual_start_date IS NOT NULL)
    ";
    
    // Date filter
    $sql .= " AND (
            (t.start_date BETWEEN ? AND ?) OR
            (t.due_date BETWEEN ? AND ?) OR
            (t.start_date <= ? AND t.due_date >= ?) OR
            (t.actual_start_date BETWEEN ? AND ?) OR
            (t.actual_end_date BETWEEN ? AND ?)
        )
    ";
    
    $params = [$start, $end, $start, $end, $start, $start, $start, $end, $start, $end];
    
    // Filter by accessible projects (for non-admin)
    if ($accessibleProjects !== null) {
        $placeholders = implode(',', array_fill(0, count($accessibleProjects), '?'));
        $sql .= " AND p.id IN ($placeholders)";
        $params = array_merge($params, $accessibleProjects);
    }
    
    // Filter by specific project
    if ($projectId) {
        $sql .= " AND p.id = ?";
        $params[] = $projectId;
    }
    
    // Filter my tasks only (Assigned to me OR Created by me)
    if ($myTasksOnly) {
        $sql .= " AND (t.assignee_id = ? OR t.created_by = ?)";
        $params[] = $userId;
        $params[] = $userId;
    }
    
    $sql .= " ORDER BY t.start_date ASC, t.due_date ASC, t.severity DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $tasks = $stmt->fetchAll();
    
    // Format for FullCalendar - multi-day events with start_date to due_date
    $events = array_map(function($task) use ($view) {
        $displayTitle = "[{$task['project_name']}] {$task['title']}";
        
        // Determine event dates based on view
        if ($view === 'actual') {
            $eventStart = $task['actual_start_date'] ?: $task['start_date'] ?: $task['due_date'];
            $eventEnd = $task['actual_end_date'] ?: $task['due_date'];
        } else {
            $eventStart = $task['start_date'] ?: $task['due_date'];
            $eventEnd = $task['due_date'];
        }
        
        // FullCalendar needs end date +1 day for all-day events to include the end date
        if ($eventEnd) {
            $endDate = new DateTime($eventEnd);
            $endDate->modify('+1 day');
            $eventEnd = $endDate->format('Y-m-d');
        }
        
        return [
            'id' => $task['id'],
            'title' => $displayTitle,
            'start' => $eventStart,
            'end' => $eventEnd,
            'allDay' => true,
            'backgroundColor' => getColorBySeverity($task['severity']),
            'borderColor' => getColorBySeverity($task['severity']),
            'extendedProps' => [
                'task_id' => $task['id'],
                'original_title' => $task['title'],
                'description' => $task['description'],
                'severity' => $task['severity'],
                'column_id' => $task['column_id'],
                'column_name' => $task['column_name'],
                'board_id' => $task['board_id'],
                'board_name' => $task['board_name'],
                'project_id' => $task['project_id'],
                'project_name' => $task['project_name'],
                'project_color' => $task['project_color'],
                'assignee_id' => $task['assignee_id'],
                'assignee_name' => $task['assignee_name'],
                'start_date' => $task['start_date'],
                'due_date' => $task['due_date'],
                'actual_start_date' => $task['actual_start_date'],
                'actual_end_date' => $task['actual_end_date'],
                'status_plan' => $task['status_plan'],
                'status_actual' => $task['status_actual'],
            ]
        ];
    }, $tasks);

    Response::success($events);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}

function getColorBySeverity($severity) {
    switch ($severity) {
        case 'critical': return '#ef4444';
        case 'major': return '#f59e0b';
        default: return '#3b82f6';
    }
}
