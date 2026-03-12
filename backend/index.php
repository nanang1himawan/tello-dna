<?php
/**
 * API Index - Health Check
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/helpers/response.php';

Response::success([
    'name' => 'Office Management API',
    'version' => '1.0.0',
    'status' => 'running',
    'timestamp' => date('c')
], 'API is running');
