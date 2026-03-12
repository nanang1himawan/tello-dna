-- Jira-like Features Migration
-- Run this in phpMyAdmin or MySQL CLI

-- ===========================================
-- PHASE 1: Issue Types
-- ===========================================

-- Add issue type to tasks
ALTER TABLE tasks ADD COLUMN type ENUM('epic','story','task','bug') DEFAULT 'task' AFTER title;

-- Add parent_id for Epic > Story/Task hierarchy
ALTER TABLE tasks ADD COLUMN parent_id INT NULL AFTER type;

-- Add foreign key for parent relationship
ALTER TABLE tasks ADD CONSTRAINT fk_task_parent FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- Add index for faster parent queries
CREATE INDEX idx_task_parent ON tasks(parent_id);
CREATE INDEX idx_task_type ON tasks(type);

-- ===========================================
-- PHASE 2: Sprint Management  
-- ===========================================

-- Create sprints table
CREATE TABLE IF NOT EXISTS sprints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status ENUM('planning','active','completed') DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Add sprint_id to tasks
ALTER TABLE tasks ADD COLUMN sprint_id INT NULL AFTER parent_id;
ALTER TABLE tasks ADD CONSTRAINT fk_task_sprint FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL;
CREATE INDEX idx_task_sprint ON tasks(sprint_id);
