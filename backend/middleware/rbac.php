<?php
/**
 * RBAC Middleware
 * Check user privileges for specific actions
 */

require_once __DIR__ . '/../helpers/privileges.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/auth.php';

class RBAC {
    /**
     * Check if current user can perform action
     */
    public static function can($action, $ownerId = null) {
        if (Auth::$user === null) {
            Auth::verify();
        }

        $allowed = Privileges::canPerform(
            Auth::$user['id'],
            Auth::$user['role'],
            $action,
            $ownerId
        );

        if (!$allowed) {
            Response::forbidden("You don't have permission to: $action");
        }

        return true;
    }

    /**
     * Check permission without failing
     */
    public static function check($action, $ownerId = null) {
        if (Auth::$user === null) {
            return false;
        }

        return Privileges::canPerform(
            Auth::$user['id'],
            Auth::$user['role'],
            $action,
            $ownerId
        );
    }
}
