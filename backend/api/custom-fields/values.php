<?php
/**
 * Custom Field Values API
 * GET /api/custom-fields/values.php?task_id=1 - Get task's field values
 * POST /api/custom-fields/values.php - Set field value
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
        $taskId = $_GET['task_id'] ?? null;
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        // Get field definitions and values for this task's board
        $stmt = $db->prepare("
            SELECT 
                cfd.id as field_id,
                cfd.name,
                cfd.field_type,
                cfd.options,
                cfd.is_required,
                cfv.value_text,
                cfv.value_number,
                cfv.value_date,
                cfv.value_bool
            FROM tasks t
            JOIN columns c ON t.column_id = c.id
            JOIN boards b ON c.board_id = b.id
            JOIN custom_field_definitions cfd ON cfd.board_id = b.id
            LEFT JOIN custom_field_values cfv ON cfv.task_id = t.id AND cfv.field_id = cfd.id
            WHERE t.id = ?
            ORDER BY cfd.position ASC
        ");
        $stmt->execute([$taskId]);
        $fields = $stmt->fetchAll();
        
        // Parse and format values
        foreach ($fields as &$field) {
            $field['options'] = $field['options'] ? json_decode($field['options'], true) : null;
            
            // Determine value based on field type
            switch ($field['field_type']) {
                case 'number':
                    $field['value'] = $field['value_number'];
                    break;
                case 'date':
                    $field['value'] = $field['value_date'];
                    break;
                case 'checkbox':
                    $field['value'] = (bool)$field['value_bool'];
                    break;
                default:
                    $field['value'] = $field['value_text'];
            }
            
            // Clean up raw columns
            unset($field['value_text'], $field['value_number'], $field['value_date'], $field['value_bool']);
        }
        
        Response::success($fields);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $taskId = $input['task_id'] ?? null;
        $fieldId = $input['field_id'] ?? null;
        $value = $input['value'] ?? null;
        
        if (!$taskId || !$fieldId) {
            Response::error('Task ID and Field ID are required', 400);
        }
        
        // Get field type
        $stmt = $db->prepare("SELECT field_type FROM custom_field_definitions WHERE id = ?");
        $stmt->execute([$fieldId]);
        $field = $stmt->fetch();
        
        if (!$field) {
            Response::notFound('Field not found');
        }
        
        // Determine which column to use
        $valueText = null;
        $valueNumber = null;
        $valueDate = null;
        $valueBool = null;
        
        switch ($field['field_type']) {
            case 'number':
                $valueNumber = is_numeric($value) ? $value : null;
                break;
            case 'date':
                $valueDate = $value;
                break;
            case 'checkbox':
                $valueBool = $value ? 1 : 0;
                break;
            default:
                $valueText = $value;
        }
        
        // Upsert value
        $stmt = $db->prepare("
            INSERT INTO custom_field_values (task_id, field_id, value_text, value_number, value_date, value_bool)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                value_text = VALUES(value_text),
                value_number = VALUES(value_number),
                value_date = VALUES(value_date),
                value_bool = VALUES(value_bool),
                updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$taskId, $fieldId, $valueText, $valueNumber, $valueDate, $valueBool]);
        
        Response::success(['value' => $value], 'Field value saved');
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
