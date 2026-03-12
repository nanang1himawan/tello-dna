<?php
/**
 * Notification Helper
 * Create and manage notifications
 */

require_once __DIR__ . '/../config/database.php';

class Notification {
    /**
     * Create a notification
     * @param int $userId - User to notify
     * @param string $type - 'comment', 'assign', 'mention', 'due', etc
     * @param string $title - The notification title
     * @param string $message - The notification message
     * @param array|null $data - Additional data (task_id, etc)
     */
    public static function create($userId, $type, $title, $message, $data = null) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("
                INSERT INTO notifications (user_id, type, title, message, data) 
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $userId,
                $type,
                $title,
                $message,
                $data ? json_encode($data) : null
            ]);
            
            return $db->lastInsertId();
        } catch (PDOException $e) {
            error_log("Notification error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get notifications for a user
     */
    public static function getForUser($userId, $unreadOnly = false, $limit = 50) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $sql = "SELECT * FROM notifications WHERE user_id = :userId";
            if ($unreadOnly) {
                $sql .= " AND is_read = 0";
            }
            $sql .= " ORDER BY created_at DESC LIMIT :limit";
            
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
    
    /**
     * Mark notification as read
     */
    public static function markAsRead($notificationId, $userId) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("
                UPDATE notifications 
                SET is_read = 1, read_at = NOW() 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$notificationId, $userId]);
            
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * Mark all as read for a user
     */
    public static function markAllAsRead($userId) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("
                UPDATE notifications 
                SET is_read = 1, read_at = NOW() 
                WHERE user_id = ? AND is_read = 0
            ");
            $stmt->execute([$userId]);
            
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * Get unread count
     */
    public static function getUnreadCount($userId) {
        try {
            $db = Database::getInstance()->getConnection();
            
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
            $stmt->execute([$userId]);
            
            return $stmt->fetch()['count'];
        } catch (PDOException $e) {
            return 0;
        }
    }
}
