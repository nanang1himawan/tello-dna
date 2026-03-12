-- Fix notifications table: Add 'data' column if missing
-- The Notification helper uses 'data' column but original schema had 'reference_type'/'reference_id'
-- Run this in phpMyAdmin

-- Add data column (JSON) if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSON DEFAULT NULL AFTER message;
