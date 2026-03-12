<?php
/**
 * Automation Executor
 * Called when tasks are created/moved/updated to check and execute automations
 */

class AutomationExecutor {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Execute automations for a trigger event
     */
    public function execute($triggerType, $taskId, $context = []) {
        // Get task and board info
        $stmt = $this->db->prepare("
            SELECT t.*, c.board_id, c.name as column_name
            FROM tasks t
            JOIN columns c ON t.column_id = c.id
            WHERE t.id = ?
        ");
        $stmt->execute([$taskId]);
        $task = $stmt->fetch();
        
        if (!$task) {
            return [];
        }
        
        // Get active automations for this board and trigger type
        $stmt = $this->db->prepare("
            SELECT * FROM automations 
            WHERE board_id = ? AND trigger_type = ? AND is_active = 1
        ");
        $stmt->execute([$task['board_id'], $triggerType]);
        $automations = $stmt->fetchAll();
        
        $executed = [];
        
        foreach ($automations as $automation) {
            if ($this->checkTriggerCondition($automation, $task, $context)) {
                $success = $this->executeAction($automation, $task);
                
                // Log execution
                $this->logExecution($automation['id'], $taskId, $success, $context);
                
                // Update trigger count
                $this->db->prepare("
                    UPDATE automations SET trigger_count = trigger_count + 1, last_triggered_at = NOW() WHERE id = ?
                ")->execute([$automation['id']]);
                
                $executed[] = [
                    'automation_id' => $automation['id'],
                    'name' => $automation['name'],
                    'success' => $success
                ];
            }
        }
        
        return $executed;
    }
    
    /**
     * Check if trigger condition is met
     */
    private function checkTriggerCondition($automation, $task, $context) {
        $config = $automation['trigger_config'] ? json_decode($automation['trigger_config'], true) : [];
        
        switch ($automation['trigger_type']) {
            case 'card_created':
                // Always triggers on card creation
                return true;
                
            case 'card_moved':
                // Check if moved to specific column
                if (isset($config['from_column_id']) && $context['from_column_id'] != $config['from_column_id']) {
                    return false;
                }
                if (isset($config['to_column_id']) && $task['column_id'] != $config['to_column_id']) {
                    return false;
                }
                return true;
                
            case 'due_date_approaching':
                // Check if due date is within X days
                $days = $config['days'] ?? 1;
                if (!$task['due_date']) return false;
                $dueDate = new DateTime($task['due_date']);
                $now = new DateTime();
                $diff = $now->diff($dueDate)->days;
                return $diff <= $days && $dueDate >= $now;
                
            case 'checklist_complete':
                // Check if checklist completion reached threshold
                // This would require additional context
                return isset($context['checklist_complete']) && $context['checklist_complete'];
                
            case 'label_added':
                // Check if specific label was added
                if (isset($config['label'])) {
                    return isset($context['label']) && $context['label'] == $config['label'];
                }
                return true;
                
            default:
                return false;
        }
    }
    
    /**
     * Execute the automation action
     */
    private function executeAction($automation, $task) {
        $config = json_decode($automation['action_config'], true);
        
        try {
            switch ($automation['action_type']) {
                case 'move_card':
                    if (isset($config['column_id'])) {
                        $stmt = $this->db->prepare("UPDATE tasks SET column_id = ? WHERE id = ?");
                        $stmt->execute([$config['column_id'], $task['id']]);
                    }
                    return true;
                    
                case 'assign_member':
                    if (isset($config['user_id'])) {
                        $stmt = $this->db->prepare("UPDATE tasks SET assignee_id = ? WHERE id = ?");
                        $stmt->execute([$config['user_id'], $task['id']]);
                        
                        // Also add to task_members
                        $stmt = $this->db->prepare("INSERT IGNORE INTO task_members (task_id, user_id) VALUES (?, ?)");
                        $stmt->execute([$task['id'], $config['user_id']]);
                    }
                    return true;
                    
                case 'add_label':
                    // Would add label to task (requires labels table)
                    return true;
                    
                case 'send_notification':
                    if (isset($config['user_id']) || isset($config['notify_assignee'])) {
                        require_once __DIR__ . '/../helpers/notification.php';
                        
                        $userId = $config['user_id'] ?? $task['assignee_id'];
                        if ($userId) {
                            Notification::create(
                                $userId,
                                'automation',
                                'Automation Triggered',
                                $config['message'] ?? 'An automation was triggered for task "' . $task['title'] . '"',
                                ['task_id' => $task['id'], 'automation_id' => $automation['id']]
                            );
                        }
                    }
                    return true;
                    
                case 'set_due_date':
                    if (isset($config['days_from_now'])) {
                        $dueDate = date('Y-m-d', strtotime('+' . $config['days_from_now'] . ' days'));
                        $stmt = $this->db->prepare("UPDATE tasks SET due_date = ? WHERE id = ?");
                        $stmt->execute([$dueDate, $task['id']]);
                    }
                    return true;
                    
                default:
                    return false;
            }
        } catch (Exception $e) {
            error_log('Automation execution error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log automation execution
     */
    private function logExecution($automationId, $taskId, $success, $details = []) {
        $stmt = $this->db->prepare("
            INSERT INTO automation_logs (automation_id, task_id, success, details)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $automationId,
            $taskId,
            $success ? 1 : 0,
            json_encode($details)
        ]);
    }
}
