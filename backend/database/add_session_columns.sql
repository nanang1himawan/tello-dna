-- Add session management columns to users table
-- Run this in phpMyAdmin or MySQL CLI

-- Add session_token column (stores the current active session token)
ALTER TABLE users ADD COLUMN session_token VARCHAR(255) NULL DEFAULT NULL AFTER password;

-- Add last_activity column (tracks last API activity timestamp)
ALTER TABLE users ADD COLUMN last_activity DATETIME NULL DEFAULT NULL AFTER session_token;

-- Add index for faster session lookups
ALTER TABLE users ADD INDEX idx_session_token (session_token);
