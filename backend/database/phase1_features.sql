-- ===========================================
-- Phase 1: Core Enhancements Migration
-- Run this in phpMyAdmin
-- ===========================================

-- 1. MULTIPLE ASSIGNEES (task_members)
-- Transition from single assignee to multiple

CREATE TABLE IF NOT EXISTS task_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_user (task_id, user_id),
    INDEX idx_task (task_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Migrate existing assignee_id data to task_members
INSERT INTO task_members (task_id, user_id)
SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
ON DUPLICATE KEY UPDATE joined_at = joined_at;

-- Note: Keep assignee_id for backward compatibility, will be deprecated

-- ===========================================
-- 2. CARD COVER IMAGES
-- ===========================================

ALTER TABLE tasks ADD COLUMN cover_image VARCHAR(500) DEFAULT NULL AFTER description;
ALTER TABLE tasks ADD COLUMN cover_color VARCHAR(7) DEFAULT NULL AFTER cover_image;

-- ===========================================
-- 3. FAVORITE BOARDS/PROJECTS
-- ===========================================

CREATE TABLE IF NOT EXISTS user_favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    entity_type ENUM('project', 'board', 'task') NOT NULL,
    entity_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_favorite (user_id, entity_type, entity_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ===========================================
-- 4. WATCH/UNWATCH CARDS
-- ===========================================

CREATE TABLE IF NOT EXISTS task_watchers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_watcher (task_id, user_id),
    INDEX idx_task (task_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;
