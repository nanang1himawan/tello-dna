<?php
/**
 * Audit Log Helper
 * Records task and project changes for tracking/history
 */

require_once __DIR__ . '/../config/database.php';

class AuditLog {
    /**
     * Log an action
     * @param string $entityType - 'task', 'project', 'board', 'user'
     * @param int $entityId - ID of the entity
     * @param string $action - 'create', 'update', 'delete', 'move', 'assign'
     * @param int $userId - User who performed the action
     * @param array|null $oldValues - Previous values (for updates)
     * @param array|null $newValues - New values (for updates)
     */
    public static function log($entityType, $entityId, $action, $userId, $oldValues = null, $newValues = null) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("
                INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_values, new_values) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $entityType,
                $entityId,
                $action,
                $userId,
                $oldValues ? json_encode($oldValues) : null,
                $newValues ? json_encode($newValues) : null
            ]);
            
            return true;
        } catch (PDOException $e) {
            // Don't fail the main operation if audit fails
            error_log("Audit log error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get logs for an entity
     */
    public static function getForEntity($entityType, $entityId, $limit = 50) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("
                SELECT al.*, u.name as user_name, u.avatar as user_avatar
                FROM audit_logs al
                JOIN users u ON al.user_id = u.id
                WHERE al.entity_type = ? AND al.entity_id = ?
                ORDER BY al.created_at DESC
                LIMIT ?
            ");
            $stmt->execute([$entityType, $entityId, $limit]);
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
    
    /**
     * Get recent activity across all entities
     */
    public static function getRecent($userId = null, $limit = 20) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $sql = "
                SELECT al.*, u.name as user_name, u.avatar as user_avatar
                FROM audit_logs al
                JOIN users u ON al.user_id = u.id
            ";
            
            $params = [];
            if ($userId) {
                $sql .= " WHERE al.user_id = ?";
                $params[] = $userId;
            }
            
            $sql .= " ORDER BY al.created_at DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
}
