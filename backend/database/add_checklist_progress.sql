-- Add progress field to checklist_items
-- Run this migration in phpMyAdmin or MySQL CLI

ALTER TABLE checklist_items 
ADD COLUMN progress INT DEFAULT 0 COMMENT 'Progress percentage 0-100';

-- Update existing completed items to have 100% progress
UPDATE checklist_items SET progress = 100 WHERE is_completed = 1;
