-- Enhanced Task Date Fields Migration
-- Run this in phpMyAdmin or MySQL CLI

-- Add plan start date (when task is planned to start)
ALTER TABLE tasks ADD COLUMN start_date DATE NULL AFTER due_date;

-- Add actual dates (when task really started/ended)
ALTER TABLE tasks ADD COLUMN actual_start_date DATE NULL AFTER start_date;
ALTER TABLE tasks ADD COLUMN actual_end_date DATE NULL AFTER actual_start_date;

-- Add status percentages (0-100)
ALTER TABLE tasks ADD COLUMN status_plan INT DEFAULT 0 AFTER actual_end_date;
ALTER TABLE tasks ADD COLUMN status_actual INT DEFAULT 0 AFTER status_plan;

-- Rename due_date to be clearer (optional - keep as is for backward compatibility)
-- The due_date represents the plan end date
