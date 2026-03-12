<?php
/**
 * Authentication Middleware
 * Verifies JWT token and validates session
 * 
 * Features:
 * - Validates session_token matches database (single device)
 * - Checks idle timeout (2 hours of inactivity)
 * - Updates last_activity on each request
 */

require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/database.php';

// Configuration
define('IDLE_TIMEOUT_SECONDS', 2 * 60 * 60); // 2 hours

class Auth {
    public static $user = null;

    /**
     * Verify JWT token from Authorization header
     */
    public static function verify() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (empty($authHeader)) {
            Response::unauthorized('No authorization token provided');
        }

        // Extract token from "Bearer <token>"
        if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            Response::unauthorized('Invalid authorization header format');
        }

        $token = $matches[1];
        $payload = JWT::decode($token);

        if ($payload === null) {
            Response::unauthorized('Invalid or expired token');
        }

        // Check if it's a refresh token (not allowed for regular requests)
        if (isset($payload['type']) && $payload['type'] === 'refresh') {
            Response::unauthorized('Cannot use refresh token for this request');
        }

        // Get session_token from JWT payload
        $sessionToken = $payload['session_token'] ?? null;

        // Get user from database and validate session
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT id, email, name, role, avatar, session_token, last_activity 
                FROM users WHERE id = ?
            ");
            $stmt->execute([$payload['user_id']]);
            $user = $stmt->fetch();

            if (!$user) {
                Response::unauthorized('User not found');
            }

            // Validate session_token matches (single device login)
            if ($sessionToken && $user['session_token'] !== $sessionToken) {
                Response::unauthorized('Session expired. You have been logged out because you logged in from another device.');
            }

            // Check idle timeout (2 hours)
            if ($user['last_activity']) {
                $lastActivity = strtotime($user['last_activity']);
                $now = time();
                
                if (($now - $lastActivity) > IDLE_TIMEOUT_SECONDS) {
                    // Clear session in database
                    $clearStmt = $db->prepare("UPDATE users SET session_token = NULL WHERE id = ?");
                    $clearStmt->execute([$user['id']]);
                    
                    Response::unauthorized('Session expired due to inactivity. Please login again.');
                }
            }

            // Update last_activity timestamp
            $updateStmt = $db->prepare("UPDATE users SET last_activity = NOW() WHERE id = ?");
            $updateStmt->execute([$user['id']]);

            // Remove sensitive fields before returning
            unset($user['session_token']);
            unset($user['last_activity']);

            self::$user = $user;
            return $user;
        } catch (PDOException $e) {
            Response::error('Database error', 500);
        }
    }

    /**
     * Optional auth - doesn't fail if no token
     */
    public static function optional() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (empty($authHeader)) {
            return null;
        }

        if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $payload = JWT::decode($token);

        if ($payload === null) {
            return null;
        }

        try {
            $db = Database::getInstance()->getConnection();
            $sessionToken = $payload['session_token'] ?? null;
            
            $stmt = $db->prepare("
                SELECT id, email, name, role, avatar, session_token, last_activity 
                FROM users WHERE id = ?
            ");
            $stmt->execute([$payload['user_id']]);
            $user = $stmt->fetch();

            // Validate session
            if (!$user || ($sessionToken && $user['session_token'] !== $sessionToken)) {
                return null;
            }

            // Check idle timeout
            if ($user['last_activity']) {
                $lastActivity = strtotime($user['last_activity']);
                if ((time() - $lastActivity) > IDLE_TIMEOUT_SECONDS) {
                    return null;
                }
            }

            // Update last_activity
            $updateStmt = $db->prepare("UPDATE users SET last_activity = NOW() WHERE id = ?");
            $updateStmt->execute([$user['id']]);

            unset($user['session_token']);
            unset($user['last_activity']);
            
            self::$user = $user;
            return $user;
        } catch (PDOException $e) {
            return null;
        }
    }

    /**
     * Check if user has required role
     */
    public static function requireRole($roles) {
        if (self::$user === null) {
            self::verify();
        }

        if (is_string($roles)) {
            $roles = [$roles];
        }

        if (!in_array(self::$user['role'], $roles)) {
            Response::forbidden('Access denied. Required role: ' . implode(' or ', $roles));
        }

        return true;
    }
}
