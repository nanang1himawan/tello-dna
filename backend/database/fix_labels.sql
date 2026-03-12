-- FIX LABELS SCHEMA
-- WARNING: This will delete existing labels data!
-- Execute this in phpMyAdmin if you encounter "Unknown column" errors.

DROP TABLE IF EXISTS task_labels;
DROP TABLE IF EXISTS labels;

-- Re-create Tables
CREATE TABLE labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_label (board_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE task_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_label (task_id, label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default labels
INSERT IGNORE INTO labels (board_id, name, color) SELECT id, 'Bug', '#ef4444' FROM boards;
INSERT IGNORE INTO labels (board_id, name, color) SELECT id, 'Feature', '#22c55e' FROM boards;
INSERT IGNORE INTO labels (board_id, name, color) SELECT id, 'Enhancement', '#3b82f6' FROM boards;
INSERT IGNORE INTO labels (board_id, name, color) SELECT id, 'Documentation', '#a855f7' FROM boards;
INSERT IGNORE INTO labels (board_id, name, color) SELECT id, 'High Priority', '#f97316' FROM boards;
INSERT IGNORE INTO labels (board_id, name, color) SELECT id, 'Low Priority', '#6b7280' FROM boards;
