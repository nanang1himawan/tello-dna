-- Labels System Migration
-- Run this in phpMyAdmin

-- Labels table (board-level)
CREATE TABLE IF NOT EXISTS labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_label (board_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Task-Label relationship (many-to-many)
CREATE TABLE IF NOT EXISTS task_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_label (task_id, label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default labels for existing boards
INSERT IGNORE INTO labels (board_id, name, color)
SELECT DISTINCT b.id, 'Bug', '#ef4444' FROM boards b
UNION
SELECT DISTINCT b.id, 'Feature', '#22c55e' FROM boards b
UNION
SELECT DISTINCT b.id, 'Enhancement', '#3b82f6' FROM boards b
UNION
SELECT DISTINCT b.id, 'Documentation', '#a855f7' FROM boards b
UNION
SELECT DISTINCT b.id, 'High Priority', '#f97316' FROM boards b
UNION
SELECT DISTINCT b.id, 'Low Priority', '#6b7280' FROM boards b;
