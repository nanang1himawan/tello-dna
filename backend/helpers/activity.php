<?php
/**
 * Activity Logger Helper
 * Logs task activities for audit trail
 */

class ActivityLogger {
    private static $db = null;
    
    private static function getDb() {
        if (self::$db === null) {
            self::$db = Database::getInstance()->getConnection();
        }
        return self::$db;
    }
    
    /**
     * Log an activity
     * @param int $taskId
     * @param int $userId
     * @param string $action - created, updated, moved, assigned, commented, etc.
     * @param string|null $fieldName - which field changed
     * @param mixed $oldValue
     * @param mixed $newValue
     * @param array|null $metadata - additional data
     */
    public static function log($taskId, $userId, $action, $fieldName = null, $oldValue = null, $newValue = null, $metadata = null) {
        try {
            $db = self::getDb();
            $stmt = $db->prepare("
                INSERT INTO task_activities (task_id, user_id, action, field_name, old_value, new_value, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $taskId,
                $userId,
                $action,
                $fieldName,
                is_array($oldValue) ? json_encode($oldValue) : $oldValue,
                is_array($newValue) ? json_encode($newValue) : $newValue,
                $metadata ? json_encode($metadata) : null
            ]);
            
            return $db->lastInsertId();
        } catch (PDOException $e) {
            error_log("Activity log error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get activities for a task
     */
    public static function getByTask($taskId, $limit = 50) {
        try {
            $db = self::getDb();
            $stmt = $db->prepare("
                SELECT a.*, u.name as user_name, u.avatar as user_avatar
                FROM task_activities a
                JOIN users u ON a.user_id = u.id
                WHERE a.task_id = ?
                ORDER BY a.created_at DESC
                LIMIT ?
            ");
            $stmt->execute([$taskId, $limit]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
    
    /**
     * Log task creation
     */
    public static function logCreated($taskId, $userId, $taskTitle) {
        return self::log($taskId, $userId, 'created', null, null, $taskTitle);
    }
    
    /**
     * Log task moved between columns
     */
    public static function logMoved($taskId, $userId, $fromColumn, $toColumn) {
        return self::log($taskId, $userId, 'moved', 'column', $fromColumn, $toColumn);
    }
    
    /**
     * Log assignee change
     */
    public static function logAssigned($taskId, $userId, $oldAssignee, $newAssignee) {
        return self::log($taskId, $userId, 'assigned', 'assignee', $oldAssignee, $newAssignee);
    }
    
    /**
     * Log field update
     */
    public static function logUpdated($taskId, $userId, $fieldName, $oldValue, $newValue) {
        return self::log($taskId, $userId, 'updated', $fieldName, $oldValue, $newValue);
    }
    
    /**
     * Log comment added
     */
    public static function logCommented($taskId, $userId) {
        return self::log($taskId, $userId, 'commented');
    }
    
    /**
     * Log label added
     */
    public static function logLabelAdded($taskId, $userId, $labelName) {
        return self::log($taskId, $userId, 'label_added', 'label', null, $labelName);
    }
    
    /**
     * Log label removed
     */
    public static function logLabelRemoved($taskId, $userId, $labelName) {
        return self::log($taskId, $userId, 'label_removed', 'label', $labelName, null);
    }
    
    /**
     * Log attachment added
     */
    public static function logAttachment($taskId, $userId, $fileName) {
        return self::log($taskId, $userId, 'attachment_added', 'attachment', null, $fileName);
    }
    
    /**
     * Log checklist item completed
     */
    public static function logChecklistCompleted($taskId, $userId, $itemTitle) {
        return self::log($taskId, $userId, 'checklist_completed', 'checklist', null, $itemTitle);
    }
}
