-- Task Dependencies Migration
-- Run this in phpMyAdmin

CREATE TABLE IF NOT EXISTS task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    depends_on_id INT NOT NULL,
    dependency_type ENUM('blocks', 'is_blocked_by', 'relates_to') DEFAULT 'blocks',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (task_id, depends_on_id),
    INDEX idx_task_deps (task_id),
    INDEX idx_depends_on (depends_on_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
