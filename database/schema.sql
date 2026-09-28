-- KinderVault database schema
-- Safe to run more than once. Existing rows are preserved.

CREATE DATABASE IF NOT EXISTS `kindervault`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `kindervault`;

CREATE TABLE IF NOT EXISTS `students` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `ic` VARCHAR(30) NOT NULL DEFAULT '',
    `birth_cert` VARCHAR(30) NOT NULL DEFAULT '',
    `gender` CHAR(1) NOT NULL DEFAULT 'M',
    `dob` DATE DEFAULT NULL,
    `child_position` VARCHAR(20) NOT NULL DEFAULT '',
    `program_age` VARCHAR(10) NOT NULL DEFAULT '',
    `monthly_package` VARCHAR(10) NOT NULL DEFAULT 'A',
    `wants_uniform` TINYINT(1) NOT NULL DEFAULT 1,
    `wants_sports_uniform` TINYINT(1) NOT NULL DEFAULT 1,
    `wants_tudung` TINYINT(1) NOT NULL DEFAULT 1,
    `wants_iqra` TINYINT(1) NOT NULL DEFAULT 0,
    `class` VARCHAR(80) NOT NULL,
    `parent` VARCHAR(120) NOT NULL DEFAULT '',
    `father_name` VARCHAR(120) NOT NULL DEFAULT '',
    `father_ic` VARCHAR(30) NOT NULL DEFAULT '',
    `father_address` TEXT DEFAULT NULL,
    `father_job` VARCHAR(120) NOT NULL DEFAULT '',
    `father_employer` VARCHAR(160) NOT NULL DEFAULT '',
    `father_phone` VARCHAR(20) NOT NULL DEFAULT '',
    `mother_name` VARCHAR(120) NOT NULL DEFAULT '',
    `mother_ic` VARCHAR(30) NOT NULL DEFAULT '',
    `mother_address` TEXT DEFAULT NULL,
    `mother_job` VARCHAR(120) NOT NULL DEFAULT '',
    `mother_employer` VARCHAR(160) NOT NULL DEFAULT '',
    `mother_phone` VARCHAR(20) NOT NULL DEFAULT '',
    `phone` VARCHAR(20) NOT NULL DEFAULT '',
    `address` TEXT DEFAULT NULL,
    `fee` DECIMAL(12,2) NOT NULL DEFAULT 150.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `enrol` DATE DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_students_code` (`code`),
    KEY `idx_students_name` (`name`),
    KEY `idx_students_class_status` (`class`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` INT UNSIGNED NOT NULL,
    `type` VARCHAR(80) NOT NULL DEFAULT 'Monthly Fee',
    `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `month` VARCHAR(255) NOT NULL DEFAULT '',
    `date` DATE DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Paid',
    `method` VARCHAR(50) NOT NULL DEFAULT 'Cash',
    `ref` VARCHAR(100) NOT NULL DEFAULT '',
    `receipt` VARCHAR(50) NOT NULL DEFAULT '',
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_payments_student` (`student_id`),
    KEY `idx_payments_date` (`date`),
    KEY `idx_payments_receipt` (`receipt`),
    KEY `idx_payments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dev_records` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` INT UNSIGNED NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `assessment_date` DATE DEFAULT NULL,
    `assessment_place` VARCHAR(255) NOT NULL DEFAULT '',
    `assessor_name` VARCHAR(120) NOT NULL DEFAULT '',
    `age_group` TINYINT UNSIGNED DEFAULT NULL,
    `checklist_json` LONGTEXT DEFAULT NULL,
    `record_type` VARCHAR(20) NOT NULL DEFAULT 'kpm',
    `bm_book_level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `bm_page` INT UNSIGNED NOT NULL DEFAULT 0,
    `bi_book_level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `bi_page` INT UNSIGNED NOT NULL DEFAULT 0,
    `reading` TINYINT UNSIGNED NOT NULL DEFAULT 3,
    `writing` TINYINT UNSIGNED NOT NULL DEFAULT 3,
    `behaviour` VARCHAR(100) NOT NULL DEFAULT 'Satisfactory',
    `comment` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_student_month_type` (`student_id`, `month`, `record_type`),
    KEY `idx_dev_records_student_id` (`student_id`),
    KEY `idx_dev_records_assessment_date` (`assessment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `classes` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `age_group` TINYINT UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_classes_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `classes` (`name`)
VALUES ('Permata'), ('Intelek'), ('Ceria');

UPDATE `classes` SET `age_group` = 4 WHERE `age_group` IS NULL AND `name` = 'Permata';
UPDATE `classes` SET `age_group` = 5 WHERE `age_group` IS NULL AND `name` = 'Intelek';
UPDATE `classes` SET `age_group` = 6 WHERE `age_group` IS NULL AND `name` = 'Ceria';

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'Authorized Staff',
    `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    `language` VARCHAR(2) NOT NULL DEFAULT 'en',
    `last_login_at` DATETIME DEFAULT NULL,
    `failed_login_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `locked_until` DATETIME DEFAULT NULL,
    `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `mfa_secret_encrypted` TEXT DEFAULT NULL,
    `mfa_recovery_codes_json` LONGTEXT DEFAULT NULL,
    `mfa_confirmed_at` DATETIME DEFAULT NULL,
    `mfa_last_used_counter` BIGINT UNSIGNED DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_username` (`username`),
    KEY `idx_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No default administrator is seeded here. Create the first administrator
-- through the local/Render shell using tools/create_admin.php so that no
-- password is ever committed to source control.

CREATE TABLE IF NOT EXISTS `app_settings` (
    `key` VARCHAR(80) NOT NULL,
    `value_json` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(180) NOT NULL DEFAULT '',
    `permissions_json` LONGTEXT NOT NULL,
    `is_system` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_permission_overrides` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `permission` VARCHAR(100) NOT NULL,
    `granted` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_permission` (`user_id`, `permission`),
    KEY `idx_permission_user` (`permission`, `user_id`),
    CONSTRAINT `fk_user_permission_override_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT DEFAULT NULL,
    `username_snapshot` VARCHAR(100) NOT NULL DEFAULT '',
    `user_name_snapshot` VARCHAR(150) NOT NULL DEFAULT '',
    `user_role_snapshot` VARCHAR(50) NOT NULL DEFAULT '',
    `action` VARCHAR(80) NOT NULL,
    `module` VARCHAR(100) NOT NULL DEFAULT '',
    `record_type` VARCHAR(100) NOT NULL DEFAULT '',
    `record_id` VARCHAR(100) NOT NULL DEFAULT '',
    `description` TEXT NOT NULL,
    `metadata_json` LONGTEXT DEFAULT NULL,
    `ip_address` VARCHAR(64) NOT NULL DEFAULT '',
    `user_agent` VARCHAR(500) NOT NULL DEFAULT '',
    `status` VARCHAR(20) NOT NULL DEFAULT 'Success',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_audit_created_at` (`created_at`),
    KEY `idx_audit_user_id` (`user_id`),
    KEY `idx_audit_module_action` (`module`, `action`),
    KEY `idx_audit_status` (`status`),
    CONSTRAINT `fk_audit_log_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reading_progress_records` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `student_id` INT UNSIGNED NOT NULL,
    `quarter` VARCHAR(12) NOT NULL,
    `record_date` DATE NOT NULL,
    `has_bm` TINYINT(1) NOT NULL DEFAULT 1,
    `has_bi` TINYINT(1) NOT NULL DEFAULT 1,
    `bm_book_level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `bm_page` INT UNSIGNED NOT NULL DEFAULT 0,
    `bi_book_level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `bi_page` INT UNSIGNED NOT NULL DEFAULT 0,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_student_quarter` (`student_id`, `quarter`),
    KEY `idx_record_date` (`record_date`),
    CONSTRAINT `fk_reading_progress_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
