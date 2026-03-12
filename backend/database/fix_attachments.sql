-- Alter attachments table to add missing columns
-- Run this in phpMyAdmin

ALTER TABLE attachments 
ADD COLUMN original_name VARCHAR(255) AFTER filename,
ADD COLUMN mime_type VARCHAR(100) AFTER file_type;

-- Rename filepath to file_path if needed
ALTER TABLE attachments 
CHANGE COLUMN filepath file_path VARCHAR(500) NOT NULL;

-- Update file_type to match mime_type if empty
UPDATE attachments SET mime_type = file_type WHERE mime_type IS NULL;
