-- ===========================================
-- Phase 3: Advanced Cards Migration
-- Run this in phpMyAdmin
-- ===========================================

-- 1. CARD TEMPLATES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS card_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('epic','story','task','bug') DEFAULT 'task',
    severity ENUM('minor','major','critical') DEFAULT 'minor',
    checklist_template JSON DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_board (board_id)
) ENGINE=InnoDB;

-- 2. VOTING SYSTEM
-- ===========================================
CREATE TABLE IF NOT EXISTS task_votes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    vote_type ENUM('up', 'down') DEFAULT 'up',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_vote (task_id, user_id),
    INDEX idx_task (task_id)
) ENGINE=InnoDB;

-- Add vote count columns to tasks for faster queries
ALTER TABLE tasks ADD COLUMN vote_count INT DEFAULT 0;

-- 3. CARD AGING (for visual aging effect)
-- Updated_at is already on tasks table, we just need to use it
