<?php
/**
 * Task Activities API
 * GET /api/tasks/activities.php?task_id=1 - Get activity log for a task
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/activity.php';

Auth::verify();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$taskId = $_GET['task_id'] ?? null;
$limit = min((int)($_GET['limit'] ?? 50), 100);

if (!$taskId) {
    Response::error('Task ID is required', 400);
}

try {
    $activities = ActivityLogger::getByTask($taskId, $limit);
    Response::success($activities);
} catch (Exception $e) {
    Response::error('Failed to fetch activities: ' . $e->getMessage(), 500);
}
