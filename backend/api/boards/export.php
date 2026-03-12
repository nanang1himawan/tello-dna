<?php
/**
 * Export Board (JSON or CSV)
 * GET /api/boards/export.php?id=1&format=json
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

Auth::verify();

$boardId = $_GET['id'] ?? null;
$format = $_GET['format'] ?? 'json';

if (!$boardId) {
    Response::error('Board ID is required', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get board details
    $stmt = $db->prepare("SELECT * FROM boards WHERE id = ?");
    $stmt->execute([$boardId]);
    $board = $stmt->fetch();
    
    if (!$board) {
        Response::notFound('Board not found');
    }
    
    // Get columns
    $stmt = $db->prepare("SELECT * FROM columns WHERE board_id = ? ORDER BY position");
    $stmt->execute([$boardId]);
    $columns = $stmt->fetchAll();
    
    // Get tasks per column
    $columnIds = array_column($columns, 'id');
    $tasks = [];
    
    if (!empty($columnIds)) {
        $placeholders = implode(',', array_fill(0, count($columnIds), '?'));
        $stmt = $db->prepare("
            SELECT t.*, 
                c.name as column_name,
                u.name as assignee_name,
                cr.name as creator_name
            FROM tasks t
            LEFT JOIN columns c ON t.column_id = c.id
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN users cr ON t.created_by = cr.id
            WHERE t.column_id IN ($placeholders)
            ORDER BY t.column_id, t.position
        ");
        $stmt->execute($columnIds);
        $tasks = $stmt->fetchAll();
    }
    
    // Build export data
    $exportData = [
        'exported_at' => date('Y-m-d H:i:s'),
        'exported_by' => Auth::$user['name'],
        'board' => [
            'name' => $board['name'],
            'description' => $board['description'],
            'background_type' => $board['background_type'],
            'background_value' => $board['background_value'],
        ],
        'columns' => array_map(function($col) {
            return [
                'name' => $col['name'],
                'color' => $col['color'],
                'position' => $col['position'],
                'card_limit' => $col['card_limit'],
            ];
        }, $columns),
        'tasks' => array_map(function($task) {
            return [
                'title' => $task['title'],
                'description' => $task['description'],
                'column_name' => $task['column_name'],
                'type' => $task['type'],
                'severity' => $task['severity'],
                'start_date' => $task['start_date'],
                'due_date' => $task['due_date'],
                'assignee_name' => $task['assignee_name'],
                'creator_name' => $task['creator_name'],
                'created_at' => $task['created_at'],
            ];
        }, $tasks),
        'stats' => [
            'total_columns' => count($columns),
            'total_tasks' => count($tasks),
        ]
    ];
    
    if ($format === 'csv') {
        // CSV format
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="board_' . $boardId . '_export.csv"');
        
        $output = fopen('php://output', 'w');
        
        // Header row
        fputcsv($output, ['Title', 'Description', 'Column', 'Type', 'Severity', 'Start Date', 'Due Date', 'Assignee', 'Creator', 'Created At']);
        
        // Data rows
        foreach ($exportData['tasks'] as $task) {
            fputcsv($output, [
                $task['title'],
                $task['description'],
                $task['column_name'],
                $task['type'],
                $task['severity'],
                $task['start_date'],
                $task['due_date'],
                $task['assignee_name'],
                $task['creator_name'],
                $task['created_at'],
            ]);
        }
        
        fclose($output);
        exit;
    } else {
        // JSON format
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="board_' . $boardId . '_export.json"');
        echo json_encode($exportData, JSON_PRETTY_PRINT);
        exit;
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
