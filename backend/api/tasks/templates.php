<?php
/**
 * Card Templates API
 * GET /api/tasks/templates.php?board_id=1 - List templates
 * POST /api/tasks/templates.php - Create template
 * DELETE /api/tasks/templates.php?id=1 - Delete template
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

Auth::verify();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'GET') {
        $boardId = $_GET['board_id'] ?? null;
        if (!$boardId) {
            Response::error('Board ID is required', 400);
        }
        
        $stmt = $db->prepare("
            SELECT ct.*, u.name as creator_name
            FROM card_templates ct
            JOIN users u ON ct.created_by = u.id
            WHERE ct.board_id = ?
            ORDER BY ct.name ASC
        ");
        $stmt->execute([$boardId]);
        $templates = $stmt->fetchAll();
        
        // Parse JSON fields
        foreach ($templates as &$template) {
            $template['checklist_template'] = json_decode($template['checklist_template'], true);
        }
        
        Response::success($templates);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $boardId = $input['board_id'] ?? null;
        $name = $input['name'] ?? null;
        $title = $input['title'] ?? '';
        $description = $input['description'] ?? '';
        $type = $input['type'] ?? 'task';
        $severity = $input['severity'] ?? 'minor';
        $checklistTemplate = $input['checklist_template'] ?? null;
        
        if (!$boardId || !$name) {
            Response::error('Board ID and name are required', 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO card_templates (board_id, name, title, description, type, severity, checklist_template, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $boardId,
            $name,
            $title,
            $description,
            $type,
            $severity,
            $checklistTemplate ? json_encode($checklistTemplate) : null,
            Auth::$user['id']
        ]);
        
        Response::created([
            'id' => $db->lastInsertId(),
            'name' => $name
        ], 'Template created successfully');
        
    } else if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Template ID is required', 400);
        }
        
        // Check ownership
        $stmt = $db->prepare("SELECT * FROM card_templates WHERE id = ?");
        $stmt->execute([$id]);
        $template = $stmt->fetch();
        
        if (!$template) {
            Response::notFound('Template not found');
        }
        
        if ($template['created_by'] != Auth::$user['id'] && Auth::$user['role'] !== 'admin') {
            Response::error('Permission denied', 403);
        }
        
        $stmt = $db->prepare("DELETE FROM card_templates WHERE id = ?");
        $stmt->execute([$id]);
        
        Response::success(null, 'Template deleted');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
