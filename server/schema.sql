CREATE DATABASE IF NOT EXISTS `doctor_com`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `doctor_com`;

CREATE TABLE IF NOT EXISTS `questionnaire_submissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `resume_token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `language` ENUM('fr', 'en') NOT NULL DEFAULT 'fr',
  `current_step` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `answers` JSON NOT NULL,
  `status` ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
  `score_total` TINYINT UNSIGNED NULL,
  `score_budget` TINYINT UNSIGNED NULL,
  `score_urgency` TINYINT UNSIGNED NULL,
  `score_company` TINYINT UNSIGNED NULL,
  `lead_category` ENUM('A', 'B', 'C') NULL,
  `scored_at` DATETIME(3) NULL,
  `report_status` ENUM('not_started', 'pending', 'processing', 'ready', 'failed') NOT NULL DEFAULT 'not_started',
  `report_markdown` MEDIUMTEXT NULL,
  `report_generated_at` DATETIME(3) NULL,
  `consent_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `submitted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_questionnaire_resume_token_hash` (`resume_token_hash`),
  KEY `idx_questionnaire_status_updated` (`status`, `updated_at`),
  KEY `idx_questionnaire_report_status` (`report_status`, `id`)
) ENGINE=InnoDB;