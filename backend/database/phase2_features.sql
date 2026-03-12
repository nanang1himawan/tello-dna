-- ===========================================
-- Phase 2: Board Features Migration
-- Run this in phpMyAdmin
-- ===========================================

-- 1. BOARD BACKGROUND CUSTOMIZATION
-- ===========================================
ALTER TABLE boards ADD COLUMN background_type ENUM('color', 'gradient', 'image') DEFAULT 'color' AFTER description;
ALTER TABLE boards ADD COLUMN background_value VARCHAR(500) DEFAULT '#1a1a2e' AFTER background_type;

-- 2. PROJECT VISIBILITY
-- ===========================================
ALTER TABLE projects ADD COLUMN visibility ENUM('private', 'team', 'public') DEFAULT 'team' AFTER description;

-- 3. LIST/COLUMN ARCHIVING & LIMITS
-- ===========================================
ALTER TABLE columns ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE columns ADD COLUMN card_limit INT DEFAULT NULL;

-- 4. BOARD TEMPLATES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS board_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    structure JSON NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_system (is_system)
) ENGINE=InnoDB;

-- Insert default templates
INSERT INTO board_templates (name, description, structure, is_system) VALUES
('Kanban Basic', 'Simple Kanban board with To Do, In Progress, Done', 
 '{"columns": [{"name": "To Do", "color": "#6366f1"}, {"name": "In Progress", "color": "#f59e0b"}, {"name": "Done", "color": "#10b981"}]}', 
 TRUE),
('Scrum Board', 'Standard Scrum board with Backlog, Sprint, Done', 
 '{"columns": [{"name": "Backlog", "color": "#8b5cf6"}, {"name": "Sprint", "color": "#3b82f6"}, {"name": "In Progress", "color": "#f59e0b"}, {"name": "Review", "color": "#06b6d4"}, {"name": "Done", "color": "#10b981"}]}', 
 TRUE),
('Bug Tracking', 'Issue tracking with severity levels', 
 '{"columns": [{"name": "New", "color": "#ef4444"}, {"name": "Confirmed", "color": "#f59e0b"}, {"name": "In Progress", "color": "#3b82f6"}, {"name": "Fixed", "color": "#10b981"}, {"name": "Closed", "color": "#6b7280"}]}', 
 TRUE);
