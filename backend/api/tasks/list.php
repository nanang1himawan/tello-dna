<?php
/**
 * Get all tasks with filters for list view
 * GET /api/tasks/list.php
 * 
 * Query params:
 * - search: Search in title/description
 * - type: Filter by issue type (epic, story, task, bug)
 * - severity: Filter by priority
 * - status: Filter by column name
 * - assignee_id: Filter by assignee
 * - project_id: Filter by project
 * - sort_by: Column to sort by
 * - sort_dir: asc or desc
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$search = $_GET['search'] ?? '';
$type = $_GET['type'] ?? '';
$severity = $_GET['severity'] ?? '';
$status = $_GET['status'] ?? '';
$assigneeId = $_GET['assignee_id'] ?? '';
$projectId = $_GET['project_id'] ?? '';
$sortBy = $_GET['sort_by'] ?? 'created_at';
$sortDir = strtoupper($_GET['sort_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$userId = Auth::$user['id'];
$role = Auth::$user['role'];

try {
    $db = Database::getInstance()->getConnection();
    
    // Build query
    $sql = "
        SELECT t.*, 
               c.name as column_name, c.color as column_color,
               b.name as board_name, b.id as board_id,
               p.name as project_name, p.id as project_id,
               u.name as assignee_name,
               s.name as sprint_name
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN sprints s ON t.sprint_id = s.id
        WHERE 1=1
    ";
    
    $params = [];
    
    // Non-admin users can only see tasks in their accessible projects
    if ($role !== 'admin' && $role !== 'manager') {
        $sql .= " AND (p.owner_id = ? OR t.assignee_id = ? OR EXISTS (
            SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?
        ))";
        $params[] = $userId;
        $params[] = $userId;
        $params[] = $userId;
    }
    
    // Search filter
    if ($search) {
        $sql .= " AND (t.title LIKE ? OR t.description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    // Type filter
    if ($type) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }
    
    // Severity filter
    if ($severity) {
        $sql .= " AND t.severity = ?";
        $params[] = $severity;
    }
    
    // Status filter (column name)
    if ($status) {
        $sql .= " AND c.name LIKE ?";
        $params[] = "%$status%";
    }
    
    // Assignee filter
    if ($assigneeId) {
        $sql .= " AND t.assignee_id = ?";
        $params[] = $assigneeId;
    }
    
    // Project filter
    if ($projectId) {
        $sql .= " AND p.id = ?";
        $params[] = $projectId;
    }
    
    // Sorting
    $allowedSorts = ['type', 'title', 'project_name', 'column_name', 'severity', 'assignee_name', 'due_date', 'created_at'];
    if (!in_array($sortBy, $allowedSorts)) {
        $sortBy = 'created_at';
    }
    $sql .= " ORDER BY $sortBy $sortDir";
    
    // Limit
    $sql .= " LIMIT 200";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $tasks = $stmt->fetchAll();

    Response::success($tasks);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
