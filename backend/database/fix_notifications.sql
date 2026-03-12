-- Fix missing columns in notifications table
-- Run this in phpMyAdmin

ALTER TABLE notifications 
ADD COLUMN read_at TIMESTAMP NULL AFTER is_read;
