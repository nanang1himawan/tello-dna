-- ===========================================
-- Phase 6: Advanced Features Migration
-- Run this in phpMyAdmin
-- ===========================================

-- 1. CUSTOM FIELDS
-- ===========================================

-- Custom field definitions per board
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'number', 'date', 'dropdown', 'checkbox', 'url') NOT NULL,
    options JSON DEFAULT NULL, -- For dropdown type
    is_required BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_board (board_id)
) ENGINE=InnoDB;

-- Custom field values per task
CREATE TABLE IF NOT EXISTS custom_field_values (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    field_id INT NOT NULL,
    value_text TEXT DEFAULT NULL,
    value_number DECIMAL(15,2) DEFAULT NULL,
    value_date DATE DEFAULT NULL,
    value_bool BOOLEAN DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_field (task_id, field_id),
    INDEX idx_task (task_id),
    INDEX idx_field (field_id)
) ENGINE=InnoDB;

-- 2. AUTOMATION RULES
-- ===========================================

CREATE TABLE IF NOT EXISTS automations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_type ENUM('card_created', 'card_moved', 'due_date_approaching', 'checklist_complete', 'label_added') NOT NULL,
    trigger_config JSON DEFAULT NULL, -- e.g., {"column_id": 5} for card_moved
    action_type ENUM('move_card', 'assign_member', 'add_label', 'send_notification', 'set_due_date') NOT NULL,
    action_config JSON NOT NULL, -- e.g., {"column_id": 6} for move_card
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP NULL,
    trigger_count INT DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_board (board_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    automation_id INT NOT NULL,
    task_id INT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    details JSON DEFAULT NULL,
    FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_automation (automation_id),
    INDEX idx_executed (executed_at)
) ENGINE=InnoDB;
