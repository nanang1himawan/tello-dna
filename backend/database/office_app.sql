-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 14, 2026 at 10:06 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `office_app`
--

-- --------------------------------------------------------

--
-- Table structure for table `attachments`
--

CREATE TABLE `attachments` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `automations`
--

CREATE TABLE `automations` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `trigger_type` enum('card_created','card_moved','due_date_approaching','checklist_complete','label_added') NOT NULL,
  `trigger_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trigger_config`)),
  `action_type` enum('move_card','assign_member','add_label','send_notification','set_due_date') NOT NULL,
  `action_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`action_config`)),
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_triggered_at` timestamp NULL DEFAULT NULL,
  `trigger_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `automation_logs`
--

CREATE TABLE `automation_logs` (
  `id` int(11) NOT NULL,
  `automation_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `success` tinyint(1) DEFAULT 1,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `boards`
--

CREATE TABLE `boards` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `background_type` enum('color','gradient','image') DEFAULT 'color',
  `background_value` varchar(500) DEFAULT '#1a1a2e',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boards`
--

INSERT INTO `boards` (`id`, `project_id`, `name`, `description`, `background_type`, `background_value`, `created_at`, `updated_at`) VALUES
(8, 8, 'Main Board', NULL, 'image', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', '2026-02-04 10:47:50', '2026-02-06 07:39:03'),
(9, 9, 'Main Board', NULL, 'color', '#1a1a2e', '2026-02-06 07:06:56', '2026-02-06 07:06:56'),
(10, 10, 'Main Board', NULL, 'color', '#1a1a2e', '2026-02-09 05:08:45', '2026-02-09 05:08:45');

-- --------------------------------------------------------

--
-- Table structure for table `board_templates`
--

CREATE TABLE `board_templates` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `structure` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`structure`)),
  `is_system` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `board_templates`
--

INSERT INTO `board_templates` (`id`, `name`, `description`, `structure`, `is_system`, `created_by`, `created_at`) VALUES
(1, 'Kanban Basic', 'Simple Kanban board with To Do, In Progress, Done', '{\"columns\": [{\"name\": \"To Do\", \"color\": \"#6366f1\"}, {\"name\": \"In Progress\", \"color\": \"#f59e0b\"}, {\"name\": \"Done\", \"color\": \"#10b981\"}]}', 1, NULL, '2026-02-04 10:09:14'),
(2, 'Scrum Board', 'Standard Scrum board with Backlog, Sprint, Done', '{\"columns\": [{\"name\": \"Backlog\", \"color\": \"#8b5cf6\"}, {\"name\": \"Sprint\", \"color\": \"#3b82f6\"}, {\"name\": \"In Progress\", \"color\": \"#f59e0b\"}, {\"name\": \"Review\", \"color\": \"#06b6d4\"}, {\"name\": \"Done\", \"color\": \"#10b981\"}]}', 1, NULL, '2026-02-04 10:09:14'),
(3, 'Bug Tracking', 'Issue tracking with severity levels', '{\"columns\": [{\"name\": \"New\", \"color\": \"#ef4444\"}, {\"name\": \"Confirmed\", \"color\": \"#f59e0b\"}, {\"name\": \"In Progress\", \"color\": \"#3b82f6\"}, {\"name\": \"Fixed\", \"color\": \"#10b981\"}, {\"name\": \"Closed\", \"color\": \"#6b7280\"}]}', 1, NULL, '2026-02-04 10:09:14');

-- --------------------------------------------------------

--
-- Table structure for table `card_templates`
--

CREATE TABLE `card_templates` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('epic','story','task','bug') DEFAULT 'task',
  `severity` enum('minor','major','critical') DEFAULT 'minor',
  `checklist_template` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`checklist_template`)),
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `checklists`
--

CREATE TABLE `checklists` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `position` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `checklists`
--

INSERT INTO `checklists` (`id`, `task_id`, `title`, `position`, `created_at`) VALUES
(4, 16, 'trytryr', 0, '2026-02-06 07:35:43'),
(5, 18, 'ukjbkjbk', 0, '2026-02-09 05:34:37'),
(6, 15, 'yeisadhjiasukd', 0, '2026-02-09 05:44:15');

-- --------------------------------------------------------

--
-- Table structure for table `checklist_items`
--

CREATE TABLE `checklist_items` (
  `id` int(11) NOT NULL,
  `checklist_id` int(11) NOT NULL,
  `content` varchar(500) NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `position` int(11) DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `progress` int(11) DEFAULT 0 COMMENT 'Progress percentage 0-100'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `checklist_items`
--

INSERT INTO `checklist_items` (`id`, `checklist_id`, `content`, `is_completed`, `position`, `completed_at`, `completed_by`, `created_at`, `progress`) VALUES
(8, 4, 'gfhgyhgfc', 0, 0, NULL, NULL, '2026-02-06 07:35:47', 0),
(9, 5, 'asas', 1, 0, '2026-02-09 05:40:54', 5, '2026-02-09 05:34:46', 100),
(10, 5, 'hehehe', 0, 1, NULL, NULL, '2026-02-09 05:41:04', 0);

-- --------------------------------------------------------

--
-- Table structure for table `columns`
--

CREATE TABLE `columns` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `color` varchar(7) DEFAULT '#6366f1',
  `archived` tinyint(1) DEFAULT 0,
  `card_limit` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `columns`
--

INSERT INTO `columns` (`id`, `board_id`, `name`, `position`, `color`, `archived`, `card_limit`) VALUES
(36, 8, 'Backlog', 0, '#64748b', 0, NULL),
(37, 8, 'To Do', 1, '#3b82f6', 0, NULL),
(38, 8, 'In Progress', 2, '#f59e0b', 0, NULL),
(39, 8, 'Review', 3, '#8b5cf6', 0, NULL),
(40, 8, 'Done', 4, '#10b981', 0, NULL),
(41, 9, 'To Do', 0, '#3b82f6', 0, NULL),
(42, 9, 'In Progress', 1, '#f59e0b', 0, NULL),
(43, 9, 'Done', 2, '#10b981', 0, NULL),
(44, 9, 'Kolom Baru', 3, '#6366f1', 0, NULL),
(45, 9, 'kolom baru 2', 4, '#6366f1', 0, NULL),
(46, 10, 'Pagi', 0, '#3b82f6', 0, NULL),
(47, 10, 'Siang', 1, '#6366f1', 0, NULL),
(48, 10, 'Sore', 2, '#6366f1', 0, NULL),
(49, 10, 'Malam', 3, '#6366f1', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`id`, `task_id`, `user_id`, `content`, `attachment_name`, `attachment_path`, `created_at`, `updated_at`) VALUES
(19, 16, 1, '@ayu tolong ini di test. yaaa', NULL, NULL, '2026-02-26 09:18:25', '2026-02-26 09:18:25'),
(20, 16, 6, '@[Administrator] okeee', NULL, NULL, '2026-02-26 09:25:09', '2026-02-26 09:25:09'),
(21, 16, 1, '@[ayu] ada update?', NULL, NULL, '2026-02-26 09:58:03', '2026-02-26 09:58:03'),
(22, 16, 6, '@[Administrator] sudah oke', NULL, NULL, '2026-02-26 09:59:04', '2026-02-26 09:59:04'),
(23, 16, 6, '@[Administrator] min', NULL, NULL, '2026-02-26 10:08:43', '2026-02-26 10:08:43'),
(24, 17, 1, '@[ayu] hai', NULL, NULL, '2026-02-26 10:21:26', '2026-02-26 10:21:26'),
(25, 16, 1, '@[ayu] tessss', NULL, NULL, '2026-02-26 10:32:48', '2026-02-26 10:32:48'),
(26, 16, 6, '@[ayu] cok', NULL, NULL, '2026-03-12 05:48:11', '2026-03-12 05:48:11'),
(27, 16, 6, '@[Administrator] cok', NULL, NULL, '2026-03-12 05:48:27', '2026-03-12 05:48:27'),
(28, 16, 1, 'braayy @[Project Manager]', NULL, NULL, '2026-03-12 05:59:34', '2026-03-12 05:59:34'),
(29, 16, 2, 'ehmmm...masukk', NULL, NULL, '2026-03-12 06:00:28', '2026-03-12 06:00:28'),
(30, 16, 2, 'ehmmm masukkk @[Administrator]', NULL, NULL, '2026-03-12 06:00:40', '2026-03-12 06:00:40');

-- --------------------------------------------------------

--
-- Table structure for table `custom_field_definitions`
--

CREATE TABLE `custom_field_definitions` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `field_type` enum('text','number','date','dropdown','checkbox','url') NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `is_required` tinyint(1) DEFAULT 0,
  `position` int(11) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `custom_field_values`
--

CREATE TABLE `custom_field_values` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `value_text` text DEFAULT NULL,
  `value_number` decimal(15,2) DEFAULT NULL,
  `value_date` date DEFAULT NULL,
  `value_bool` tinyint(1) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(7) DEFAULT '#6366f1',
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `color`, `description`, `created_at`) VALUES
(1, 'Frontend Developer', '#3b82f6', 'Pengembangan antarmuka pengguna', '2026-01-19 07:48:56'),
(2, 'Backend Developer', '#10b981', 'Pengembangan server dan API', '2026-01-19 07:48:56'),
(3, 'Full Stack Developer', '#8b5cf6', 'Pengembangan frontend dan backend', '2026-01-19 07:48:56'),
(4, 'UI/UX Designer', '#ec4899', 'Desain antarmuka dan pengalaman pengguna', '2026-01-19 07:48:56'),
(5, 'DevOps', '#f59e0b', 'Infrastruktur dan deployment', '2026-01-19 07:48:56'),
(6, 'QA Engineer', '#06b6d4', 'Quality Assurance dan testing', '2026-01-19 07:48:56'),
(7, 'Project Manager', '#6366f1', 'Manajemen proyek', '2026-01-19 07:48:56'),
(8, 'Marketing', '#ef4444', 'Pemasaran dan promosi', '2026-01-19 07:48:56'),
(9, 'HR', '#84cc16', 'Sumber daya manusia', '2026-01-19 07:48:56');

-- --------------------------------------------------------

--
-- Table structure for table `labels`
--

CREATE TABLE `labels` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#6366f1',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `labels`
--

INSERT INTO `labels` (`id`, `board_id`, `name`, `color`, `created_at`) VALUES
(1, 8, 'Bug', '#ef4444', '2026-02-04 11:24:11'),
(2, 8, 'Feature', '#22c55e', '2026-02-04 11:24:11'),
(3, 8, 'Enhancement', '#3b82f6', '2026-02-04 11:24:11'),
(4, 8, 'Documentation', '#a855f7', '2026-02-04 11:24:11'),
(5, 8, 'High Priority', '#f97316', '2026-02-04 11:24:11'),
(6, 8, 'Low Priority', '#6b7280', '2026-02-04 11:24:11'),
(7, 8, 'asdadad', '#ef4444', '2026-02-04 11:24:46');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `data`, `reference_type`, `reference_id`, `is_read`, `read_at`, `created_at`) VALUES
(1, 5, 'comment', 'Komentar Baru', 'Administrator mengomentari task \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"21\"}', NULL, NULL, 0, NULL, '2026-02-26 09:58:03'),
(2, 6, 'mention', 'Anda di-mention', 'Administrator menyebut Anda di komentar pada task \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"21\"}', NULL, NULL, 1, '2026-02-26 09:58:13', '2026-02-26 09:58:03'),
(3, 5, 'comment', 'Komentar Baru', 'ayu mengomentari task \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"22\"}', NULL, NULL, 0, NULL, '2026-02-26 09:59:04'),
(4, 1, 'comment', 'Komentar Baru', 'ayu mengomentari task \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"22\"}', NULL, NULL, 1, '2026-02-26 09:59:21', '2026-02-26 09:59:04'),
(5, 5, 'comment', 'New Comment', 'ayu commented on \"sadadsad\" in Test', '{\"task_id\":16,\"comment_id\":\"23\"}', NULL, NULL, 0, NULL, '2026-02-26 10:08:43'),
(6, 1, 'comment', 'New Comment', 'ayu commented on \"sadadsad\" in Test', '{\"task_id\":16,\"comment_id\":\"23\"}', NULL, NULL, 1, '2026-02-26 10:09:07', '2026-02-26 10:08:43'),
(7, 6, 'comment', 'New Comment', 'Administrator commented on \"testtest\"', '{\"task_id\":17,\"comment_id\":\"24\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 1, '2026-02-26 10:31:27', '2026-02-26 10:21:26'),
(8, 5, 'comment', 'New Comment', 'Administrator commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"25\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-02-26 10:32:48'),
(9, 6, 'mention', 'You were mentioned', 'Administrator mentioned you on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"25\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 1, '2026-02-26 10:33:25', '2026-02-26 10:32:48'),
(10, 5, 'comment', 'New Comment', 'ayu commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"26\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 05:48:11'),
(11, 1, 'comment', 'New Comment', 'ayu commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"26\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 05:48:11'),
(12, 5, 'comment', 'New Comment', 'ayu commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"27\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 05:48:27'),
(13, 1, 'comment', 'New Comment', 'ayu commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"27\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 05:48:27'),
(14, 5, 'comment', 'New Comment', 'Administrator commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"28\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 05:59:34'),
(15, 2, 'mention', 'You were mentioned', 'Administrator mentioned you on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"28\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 1, '2026-03-12 05:59:48', '2026-03-12 05:59:34'),
(16, 5, 'comment', 'New Comment', 'Project Manager commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"29\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 06:00:28'),
(17, 1, 'comment', 'New Comment', 'Project Manager commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"29\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 1, '2026-03-12 06:00:52', '2026-03-12 06:00:28'),
(18, 5, 'comment', 'New Comment', 'Project Manager commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"30\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 06:00:40'),
(19, 1, 'comment', 'New Comment', 'Project Manager commented on \"sadadsad\"', '{\"task_id\":16,\"comment_id\":\"30\",\"project_id\":8,\"project_name\":\"Test\"}', NULL, NULL, 0, NULL, '2026-03-12 06:00:40');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `visibility` enum('private','team','public') DEFAULT 'team',
  `color` varchar(7) DEFAULT '#6366f1',
  `owner_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `name`, `description`, `visibility`, `color`, `owner_id`, `created_at`, `updated_at`) VALUES
(8, 'Test', 'Test', 'team', '#6366f1', 1, '2026-02-04 10:47:50', '2026-02-04 10:47:50'),
(9, 'testa', 'laskdjasdsad', 'team', '#6366f1', 1, '2026-02-06 07:06:56', '2026-02-06 07:06:56'),
(10, 'Daily Kanban', 'test', 'team', '#6366f1', 1, '2026-02-09 05:08:45', '2026-02-09 05:08:45');

-- --------------------------------------------------------

--
-- Table structure for table `project_members`
--

CREATE TABLE `project_members` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('owner','admin','member','viewer') DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project_members`
--

INSERT INTO `project_members` (`id`, `project_id`, `user_id`, `role`, `joined_at`) VALUES
(20, 8, 1, 'owner', '2026-02-04 10:47:50'),
(21, 8, 6, 'member', '2026-02-04 10:47:50'),
(22, 8, 5, 'member', '2026-02-04 10:47:50'),
(23, 8, 4, 'member', '2026-02-04 10:47:50'),
(24, 8, 2, 'member', '2026-02-04 10:47:50'),
(25, 9, 1, 'owner', '2026-02-06 07:06:56'),
(26, 10, 1, 'owner', '2026-02-09 05:08:45');

-- --------------------------------------------------------

--
-- Table structure for table `sprints`
--

CREATE TABLE `sprints` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `goal` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('planning','active','completed') DEFAULT 'planning',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sprints`
--

INSERT INTO `sprints` (`id`, `project_id`, `name`, `goal`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`) VALUES
(2, 8, 'Sprint', 'test', '2026-02-08', '2026-02-21', 'planning', '2026-02-04 10:48:43', '2026-02-04 10:48:43');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `column_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('epic','story','task','bug') DEFAULT 'task',
  `parent_id` int(11) DEFAULT NULL,
  `sprint_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `cover_color` varchar(7) DEFAULT NULL,
  `severity` enum('critical','major','minor') DEFAULT 'minor',
  `due_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `status_plan` int(11) DEFAULT 0,
  `status_actual` int(11) DEFAULT 0,
  `position` int(11) NOT NULL DEFAULT 0,
  `assignee_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vote_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `column_id`, `title`, `type`, `parent_id`, `sprint_id`, `description`, `cover_image`, `cover_color`, `severity`, `due_date`, `start_date`, `actual_start_date`, `actual_end_date`, `status_plan`, `status_actual`, `position`, `assignee_id`, `created_by`, `created_at`, `updated_at`, `vote_count`) VALUES
(15, 38, 'test', 'task', NULL, NULL, 'sdasdasd', NULL, NULL, 'major', '2026-02-11', '2026-02-08', '2026-02-09', NULL, 0, 0, 0, 5, 1, '2026-02-04 11:05:24', '2026-02-09 05:19:20', 0),
(16, 37, 'sadadsad', 'task', NULL, NULL, 'asdsadasd', NULL, NULL, 'minor', '2026-02-18', '2026-02-05', '2026-02-04', NULL, 0, 0, 0, 5, 1, '2026-02-04 11:32:02', '2026-02-05 06:05:45', 0),
(17, 40, 'testtest', 'task', NULL, NULL, '', NULL, NULL, 'major', '2026-02-14', '2026-02-08', '2026-02-05', '2026-02-09', 0, 100, 0, 6, 1, '2026-02-05 06:08:33', '2026-02-09 05:43:26', 0),
(18, 42, 'task management', 'task', NULL, NULL, 'hehhehehe', NULL, NULL, 'major', '2026-02-21', '2026-02-08', '2026-02-06', NULL, 0, 0, 0, 5, 1, '2026-02-06 07:29:10', '2026-02-06 07:29:13', 0);

-- --------------------------------------------------------

--
-- Table structure for table `task_activities`
--

CREATE TABLE `task_activities` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `field_name` varchar(50) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_activities`
--

INSERT INTO `task_activities` (`id`, `task_id`, `user_id`, `action`, `field_name`, `old_value`, `new_value`, `metadata`, `created_at`) VALUES
(1, 16, 1, 'created', NULL, NULL, 'sadadsad', NULL, '2026-02-04 11:32:02'),
(2, 16, 1, 'updated', 'description', '', 'asdsadasd', NULL, '2026-02-04 11:33:03'),
(3, 17, 1, 'created', NULL, NULL, 'testtest', NULL, '2026-02-05 06:08:33'),
(4, 15, 1, 'dependency_added', 'dependency', NULL, 'testtest', NULL, '2026-02-05 06:32:57'),
(5, 18, 1, 'created', NULL, NULL, 'task management', NULL, '2026-02-06 07:29:10');

-- --------------------------------------------------------

--
-- Table structure for table `task_dependencies`
--

CREATE TABLE `task_dependencies` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `depends_on_id` int(11) NOT NULL,
  `dependency_type` enum('blocks','is_blocked_by','relates_to') DEFAULT 'blocks',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_dependencies`
--

INSERT INTO `task_dependencies` (`id`, `task_id`, `depends_on_id`, `dependency_type`, `created_by`, `created_at`) VALUES
(1, 15, 17, 'blocks', 1, '2026-02-05 06:32:57');

-- --------------------------------------------------------

--
-- Table structure for table `task_labels`
--

CREATE TABLE `task_labels` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `label_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_labels`
--

INSERT INTO `task_labels` (`id`, `task_id`, `label_id`, `created_at`) VALUES
(1, 15, 7, '2026-02-04 11:24:52'),
(6, 15, 1, '2026-02-04 11:25:03'),
(8, 17, 1, '2026-02-06 07:30:10');

-- --------------------------------------------------------

--
-- Table structure for table `task_members`
--

CREATE TABLE `task_members` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_votes`
--

CREATE TABLE `task_votes` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `vote_type` enum('up','down') DEFAULT 'up',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_watchers`
--

CREATE TABLE `task_watchers` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `session_token` varchar(255) DEFAULT NULL,
  `last_activity` datetime DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `role` enum('admin','manager','staff') DEFAULT 'staff',
  `department_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `session_token`, `last_activity`, `name`, `avatar`, `role`, `department_id`, `created_at`, `updated_at`) VALUES
(1, 'admin@office.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '5f3b4292b10f130385116c5bef15859287eb11ae195120d9d144c889281f1d83', '2026-03-12 14:37:37', 'Administrator', NULL, 'admin', NULL, '2026-01-19 06:05:29', '2026-03-12 07:37:37'),
(2, 'manager@office.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 'Project Manager', NULL, 'manager', 7, '2026-01-19 06:05:29', '2026-03-12 06:04:29'),
(3, 'staff@office.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 'Staff Member', NULL, 'staff', 1, '2026-01-19 06:05:29', '2026-01-19 07:48:56'),
(4, 'dito@office.local', '$2y$10$2//Pk0Nws7IX2jQqpLPFEOXZupJDzh1KU4vFY8pPyFZpqyYBzyY52', NULL, NULL, 'Dito', NULL, 'staff', 2, '2026-01-24 20:10:45', '2026-01-31 17:24:10'),
(5, 'deo@office.local', '$2y$10$pHIFK1cn.NT5/kM2hkp05u9D/4Bg/vz0XYVKUBa0uAhvjj8EvVZrW', NULL, NULL, 'deo', NULL, 'staff', NULL, '2026-01-24 20:11:13', '2026-02-12 08:31:56'),
(6, 'ayu@office.local', '$2y$10$udLMZQQ.932NXmjoW41AkeOfJjsO5Gw3oXSWnGYSAmhtHvUUEqUlK', NULL, NULL, 'ayu', NULL, 'staff', NULL, '2026-01-24 20:11:35', '2026-03-12 05:48:38');

-- --------------------------------------------------------

--
-- Table structure for table `user_favorites`
--

CREATE TABLE `user_favorites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `entity_type` enum('project','board','task') NOT NULL,
  `entity_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_privileges`
--

CREATE TABLE `user_privileges` (
  `id` int(11) NOT NULL,
  `role` enum('admin','manager','staff') NOT NULL,
  `action` varchar(100) NOT NULL,
  `allowed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_privileges`
--

INSERT INTO `user_privileges` (`id`, `role`, `action`, `allowed`) VALUES
(1, 'admin', 'create_project', 1),
(2, 'admin', 'delete_project', 1),
(3, 'admin', 'update_project', 1),
(4, 'admin', 'view_project', 1),
(5, 'admin', 'create_board', 1),
(6, 'admin', 'delete_board', 1),
(7, 'admin', 'create_task', 1),
(8, 'admin', 'update_task', 1),
(9, 'admin', 'delete_task', 1),
(10, 'admin', 'assign_task', 1),
(11, 'admin', 'create_user', 1),
(12, 'admin', 'update_user', 1),
(13, 'admin', 'delete_user', 1),
(14, 'admin', 'view_users', 1),
(15, 'admin', 'manage_privileges', 1),
(16, 'manager', 'create_project', 1),
(17, 'manager', 'update_project', 1),
(18, 'manager', 'view_project', 1),
(19, 'manager', 'create_board', 1),
(20, 'manager', 'create_task', 1),
(21, 'manager', 'update_task', 1),
(22, 'manager', 'assign_task', 1),
(23, 'manager', 'view_users', 1),
(24, 'staff', 'view_project', 1),
(25, 'staff', 'create_task', 1),
(26, 'staff', 'update_task_own', 1),
(27, 'staff', 'view_users', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attachments`
--
ALTER TABLE `attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `idx_task` (`task_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `automations`
--
ALTER TABLE `automations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_board` (`board_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `automation_logs`
--
ALTER TABLE `automation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `task_id` (`task_id`),
  ADD KEY `idx_automation` (`automation_id`),
  ADD KEY `idx_executed` (`executed_at`);

--
-- Indexes for table `boards`
--
ALTER TABLE `boards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project` (`project_id`);

--
-- Indexes for table `board_templates`
--
ALTER TABLE `board_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_system` (`is_system`);

--
-- Indexes for table `card_templates`
--
ALTER TABLE `card_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_board` (`board_id`);

--
-- Indexes for table `checklists`
--
ALTER TABLE `checklists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_checklist_task` (`task_id`);

--
-- Indexes for table `checklist_items`
--
ALTER TABLE `checklist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `completed_by` (`completed_by`),
  ADD KEY `idx_checklist_item_checklist` (`checklist_id`);

--
-- Indexes for table `columns`
--
ALTER TABLE `columns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_board` (`board_id`),
  ADD KEY `idx_position` (`position`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_task` (`task_id`);

--
-- Indexes for table `custom_field_definitions`
--
ALTER TABLE `custom_field_definitions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_board` (`board_id`);

--
-- Indexes for table `custom_field_values`
--
ALTER TABLE `custom_field_values`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_field` (`task_id`,`field_id`),
  ADD KEY `idx_task` (`task_id`),
  ADD KEY `idx_field` (`field_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_name` (`name`);

--
-- Indexes for table `labels`
--
ALTER TABLE `labels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_label` (`board_id`,`name`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_read` (`is_read`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_owner` (`owner_id`);

--
-- Indexes for table `project_members`
--
ALTER TABLE `project_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_project_user` (`project_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `sprints`
--
ALTER TABLE `sprints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_column` (`column_id`),
  ADD KEY `idx_assignee` (`assignee_id`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `idx_position` (`position`),
  ADD KEY `idx_task_parent` (`parent_id`),
  ADD KEY `idx_task_type` (`type`),
  ADD KEY `idx_task_sprint` (`sprint_id`);

--
-- Indexes for table `task_activities`
--
ALTER TABLE `task_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_task_activities` (`task_id`,`created_at`);

--
-- Indexes for table `task_dependencies`
--
ALTER TABLE `task_dependencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_dependency` (`task_id`,`depends_on_id`),
  ADD KEY `depends_on_id` (`depends_on_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `task_labels`
--
ALTER TABLE `task_labels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_label` (`task_id`,`label_id`),
  ADD KEY `label_id` (`label_id`);

--
-- Indexes for table `task_members`
--
ALTER TABLE `task_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_user` (`task_id`,`user_id`),
  ADD KEY `idx_task` (`task_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `task_votes`
--
ALTER TABLE `task_votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_vote` (`task_id`,`user_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_task` (`task_id`);

--
-- Indexes for table `task_watchers`
--
ALTER TABLE `task_watchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_watcher` (`task_id`,`user_id`),
  ADD KEY `idx_task` (`task_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_department` (`department_id`),
  ADD KEY `idx_session_token` (`session_token`);

--
-- Indexes for table `user_favorites`
--
ALTER TABLE `user_favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_favorite` (`user_id`,`entity_type`,`entity_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `user_privileges`
--
ALTER TABLE `user_privileges`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_action` (`role`,`action`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attachments`
--
ALTER TABLE `attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `automations`
--
ALTER TABLE `automations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `automation_logs`
--
ALTER TABLE `automation_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `boards`
--
ALTER TABLE `boards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `board_templates`
--
ALTER TABLE `board_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `card_templates`
--
ALTER TABLE `card_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `checklists`
--
ALTER TABLE `checklists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `checklist_items`
--
ALTER TABLE `checklist_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `columns`
--
ALTER TABLE `columns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `custom_field_definitions`
--
ALTER TABLE `custom_field_definitions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `custom_field_values`
--
ALTER TABLE `custom_field_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `labels`
--
ALTER TABLE `labels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `project_members`
--
ALTER TABLE `project_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `sprints`
--
ALTER TABLE `sprints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `task_activities`
--
ALTER TABLE `task_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `task_dependencies`
--
ALTER TABLE `task_dependencies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `task_labels`
--
ALTER TABLE `task_labels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `task_members`
--
ALTER TABLE `task_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `task_votes`
--
ALTER TABLE `task_votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `task_watchers`
--
ALTER TABLE `task_watchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_favorites`
--
ALTER TABLE `user_favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `user_privileges`
--
ALTER TABLE `user_privileges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attachments`
--
ALTER TABLE `attachments`
  ADD CONSTRAINT `attachments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `automations`
--
ALTER TABLE `automations`
  ADD CONSTRAINT `automations_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `automations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `automation_logs`
--
ALTER TABLE `automation_logs`
  ADD CONSTRAINT `automation_logs_ibfk_1` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `automation_logs_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `boards`
--
ALTER TABLE `boards`
  ADD CONSTRAINT `boards_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `board_templates`
--
ALTER TABLE `board_templates`
  ADD CONSTRAINT `board_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `card_templates`
--
ALTER TABLE `card_templates`
  ADD CONSTRAINT `card_templates_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `card_templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `checklists`
--
ALTER TABLE `checklists`
  ADD CONSTRAINT `checklists_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `checklist_items`
--
ALTER TABLE `checklist_items`
  ADD CONSTRAINT `checklist_items_ibfk_1` FOREIGN KEY (`checklist_id`) REFERENCES `checklists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `checklist_items_ibfk_2` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `columns`
--
ALTER TABLE `columns`
  ADD CONSTRAINT `columns_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `custom_field_definitions`
--
ALTER TABLE `custom_field_definitions`
  ADD CONSTRAINT `custom_field_definitions_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `custom_field_definitions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `custom_field_values`
--
ALTER TABLE `custom_field_values`
  ADD CONSTRAINT `custom_field_values_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `custom_field_values_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `custom_field_definitions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `labels`
--
ALTER TABLE `labels`
  ADD CONSTRAINT `labels_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_members`
--
ALTER TABLE `project_members`
  ADD CONSTRAINT `project_members_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sprints`
--
ALTER TABLE `sprints`
  ADD CONSTRAINT `sprints_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_task_parent` FOREIGN KEY (`parent_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_task_sprint` FOREIGN KEY (`sprint_id`) REFERENCES `sprints` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`column_id`) REFERENCES `columns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `task_activities`
--
ALTER TABLE `task_activities`
  ADD CONSTRAINT `task_activities_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_activities_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_dependencies`
--
ALTER TABLE `task_dependencies`
  ADD CONSTRAINT `task_dependencies_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_dependencies_ibfk_2` FOREIGN KEY (`depends_on_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_dependencies_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_labels`
--
ALTER TABLE `task_labels`
  ADD CONSTRAINT `task_labels_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_labels_ibfk_2` FOREIGN KEY (`label_id`) REFERENCES `labels` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_members`
--
ALTER TABLE `task_members`
  ADD CONSTRAINT `task_members_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_votes`
--
ALTER TABLE `task_votes`
  ADD CONSTRAINT `task_votes_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_votes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_watchers`
--
ALTER TABLE `task_watchers`
  ADD CONSTRAINT `task_watchers_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_watchers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_favorites`
--
ALTER TABLE `user_favorites`
  ADD CONSTRAINT `user_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
