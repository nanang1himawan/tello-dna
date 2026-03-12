<?php
/**
 * Role-Based Access Control Helper
 */

require_once __DIR__ . '/../config/database.php';

class Privileges {
    private static $cache = [];

    /**
     * Check if a user role has permission to perform an action
     */
    public static function check($role, $action) {
        $cacheKey = "$role:$action";
        
        if (isset(self::$cache[$cacheKey])) {
            return self::$cache[$cacheKey];
        }

        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT allowed FROM user_privileges 
                WHERE role = ? AND action = ?
            ");
            $stmt->execute([$role, $action]);
            $result = $stmt->fetch();

            $allowed = $result ? (bool)$result['allowed'] : false;
            self::$cache[$cacheKey] = $allowed;
            
            return $allowed;
        } catch (PDOException $e) {
            return false;
        }
    }

    /**
     * Check if user can perform action (with ownership check)
     */
    public static function canPerform($userId, $role, $action, $ownerId = null) {
        // Admin can do everything
        if ($role === 'admin') {
            return true;
        }

        // Check general permission
        if (self::check($role, $action)) {
            return true;
        }

        // Check if user owns the resource (for staff)
        if ($ownerId !== null && $userId == $ownerId) {
            $ownAction = $action . '_own';
            return self::check($role, $ownAction);
        }

        return false;
    }

    /**
     * Get all privileges for a role
     */
    public static function getAllForRole($role) {
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT action, allowed FROM user_privileges 
                WHERE role = ?
            ");
            $stmt->execute([$role]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }
    }
}
