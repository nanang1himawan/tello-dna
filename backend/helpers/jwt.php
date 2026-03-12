<?php
/**
 * JWT Helper Functions
 * Using HMAC-SHA256 for token signing
 */

define('JWT_SECRET', 'office_app_secret_key_change_in_production_2024');
define('JWT_EXPIRY', 3600 * 24); // 24 hours
define('JWT_REFRESH_EXPIRY', 3600 * 24 * 7); // 7 days

class JWT {
    /**
     * Generate JWT Token
     * @param array $payload The data to encode
     * @param int|null $expiry Custom expiry in seconds (optional)
     */
    public static function encode($payload, $expiry = null) {
        $header = self::base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload['iat'] = time();
        $payload['exp'] = time() + ($expiry ?? JWT_EXPIRY);
        $payload = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );

        return "$header.$payload.$signature";
    }

    /**
     * Generate Refresh Token
     */
    public static function encodeRefresh($payload) {
        $header = self::base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_REFRESH_EXPIRY;
        $payload['type'] = 'refresh';
        $payload = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );

        return "$header.$payload.$signature";
    }

    /**
     * Decode and verify JWT Token
     */
    public static function decode($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return null;
        }

        list($header, $payload, $signature) = $parts;

        // Verify signature
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payload), true);

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Base64 URL encode
     */
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
