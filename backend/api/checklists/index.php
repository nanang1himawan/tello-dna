<?php
/**
 * Get checklists for a task
 * GET /api/checklists/index.php?task_id=1
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$taskId = $_GET['task_id'] ?? null;
if (!$taskId) {
    Response::error('Task ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get checklists
    $stmt = $db->prepare("
        SELECT c.*,
               (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id) as total_items,
               (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = c.id AND is_completed = 1) as completed_items
        FROM checklists c
        WHERE c.task_id = ?
        ORDER BY c.position, c.id
    ");
    $stmt->execute([$taskId]);
    $checklists = $stmt->fetchAll();
    
    // Get items for each checklist
    foreach ($checklists as &$checklist) {
        $stmt = $db->prepare("
            SELECT ci.*, u.name as completed_by_name, COALESCE(ci.progress, 0) as progress
            FROM checklist_items ci
            LEFT JOIN users u ON ci.completed_by = u.id
            WHERE ci.checklist_id = ?
            ORDER BY ci.position, ci.id
        ");
        $stmt->execute([$checklist['id']]);
        $checklist['items'] = $stmt->fetchAll();
    }

    Response::success($checklists);

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
