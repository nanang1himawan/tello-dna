-- ===============================================
-- Department/Specialty System
-- Run this SQL to add department feature
-- ===============================================

USE office_app;

-- Departments/Specialties table
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_name (name)
) ENGINE=InnoDB;

-- Add department_id to users table
ALTER TABLE users ADD COLUMN department_id INT DEFAULT NULL AFTER role;
ALTER TABLE users ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD INDEX idx_department (department_id);

-- Seed default departments
INSERT INTO departments (name, color, description) VALUES
('Frontend Developer', '#3b82f6', 'Pengembangan antarmuka pengguna'),
('Backend Developer', '#10b981', 'Pengembangan server dan API'),
('Full Stack Developer', '#8b5cf6', 'Pengembangan frontend dan backend'),
('UI/UX Designer', '#ec4899', 'Desain antarmuka dan pengalaman pengguna'),
('DevOps', '#f59e0b', 'Infrastruktur dan deployment'),
('QA Engineer', '#06b6d4', 'Quality Assurance dan testing'),
('Project Manager', '#6366f1', 'Manajemen proyek'),
('Marketing', '#ef4444', 'Pemasaran dan promosi'),
('HR', '#84cc16', 'Sumber daya manusia');

-- Update existing staff with departments
UPDATE users SET department_id = 1 WHERE email = 'staff@office.local';
UPDATE users SET department_id = 7 WHERE email = 'manager@office.local';
