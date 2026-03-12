-- Add attachment fields to comments table
-- Run this in phpMyAdmin

ALTER TABLE comments 
ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL AFTER content,
ADD COLUMN attachment_path VARCHAR(500) DEFAULT NULL AFTER attachment_name;
