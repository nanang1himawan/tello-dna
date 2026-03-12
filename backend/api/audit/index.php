<?php
/**
 * Get audit logs
 * GET /api/audit/index.php
 * 
 * Query params:
 * - entity_type: 'task', 'project', etc
 * - entity_id: ID of entity
 * - user_id: filter by user
 * - limit: max results (default 50)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$entityType = $_GET['entity_type'] ?? null;
$entityId = $_GET['entity_id'] ?? null;
$userId = $_GET['user_id'] ?? null;
$limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 50;

try {
    if ($entityType && $entityId) {
        // Get logs for specific entity
        $logs = AuditLog::getForEntity($entityType, $entityId, $limit);
    } else {
        // Get recent activity
        $logs = AuditLog::getRecent($userId, $limit);
    }
    
    // Format logs for display
    foreach ($logs as &$log) {
        $log['old_values'] = $log['old_values'] ? json_decode($log['old_values'], true) : null;
        $log['new_values'] = $log['new_values'] ? json_decode($log['new_values'], true) : null;
        $log['action_label'] = getActionLabel($log['action'], $log['entity_type']);
    }

    Response::success($logs);

} catch (PDOException $e) {
    Response::error('Database error', 500);
}

function getActionLabel($action, $entityType) {
    $labels = [
        'create' => [
            'task' => 'membuat task',
            'project' => 'membuat project',
            'board' => 'membuat board',
            'user' => 'menambahkan user'
        ],
        'update' => [
            'task' => 'mengubah task',
            'project' => 'mengubah project',
            'board' => 'mengubah board',
            'user' => 'mengubah user'
        ],
        'delete' => [
            'task' => 'menghapus task',
            'project' => 'menghapus project',
            'board' => 'menghapus board',
            'user' => 'menghapus user'
        ],
        'move' => [
            'task' => 'memindahkan task'
        ],
        'assign' => [
            'task' => 'meng-assign task'
        ]
    ];
    
    return $labels[$action][$entityType] ?? "$action $entityType";
}
