-- ==============================================================================
-- NEURA AI — CLINICAL ALZHEIMER DETECTION INFRASTRUCTURE
-- Database Schema: neura_db (MySQL 8.x / MariaDB InnoDB)
-- Aligned with RapidMiner modelML.rmp (32 Biomarkers, XGBoost 25 Trees)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `neura_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `neura_db`;

-- ------------------------------------------------------------------------------
-- 1. Tabel users: Autentikasi dan Identitas Pengguna
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `role` ENUM('User', 'Nakes', 'Admin') NOT NULL DEFAULT 'User',
  `avatar_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Tabel user_profiles: 32 Biomarker Klinis & 7 Gejala Kognitif Spesifik
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  -- Demografi (4)
  `age` INT NOT NULL DEFAULT 65,
  `gender` TINYINT NOT NULL DEFAULT 0 COMMENT '0: Laki-laki, 1: Perempuan',
  `ethnicity` INT NOT NULL DEFAULT 0,
  `education_level` INT NOT NULL DEFAULT 1,
  -- Fisik & Vital (3)
  `height` DECIMAL(5,2) NULL,
  `weight` DECIMAL(5,2) NULL,
  `bmi` DECIMAL(4,2) NOT NULL DEFAULT 22.50,
  `systolic_bp` INT NOT NULL DEFAULT 120,
  `diastolic_bp` INT NOT NULL DEFAULT 80,
  -- Gaya Hidup (5)
  `smoking` TINYINT NOT NULL DEFAULT 0,
  `alcohol_consumption` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `physical_activity` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `diet_quality` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `sleep_quality` DECIMAL(4,2) NOT NULL DEFAULT 7.00,
  -- Riwayat & Komorbiditas (6)
  `family_history_alzheimers` TINYINT NOT NULL DEFAULT 0,
  `cardiovascular_disease` TINYINT NOT NULL DEFAULT 0,
  `diabetes` TINYINT NOT NULL DEFAULT 0,
  `depression` TINYINT NOT NULL DEFAULT 0,
  `head_injury` TINYINT NOT NULL DEFAULT 0,
  `hypertension` TINYINT NOT NULL DEFAULT 0,
  -- Profil Lipid (4)
  `cholesterol_total` DECIMAL(6,2) NOT NULL DEFAULT 200.00,
  `cholesterol_ldl` DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  `cholesterol_hdl` DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  `cholesterol_triglycerides` DECIMAL(6,2) NOT NULL DEFAULT 150.00,
  -- Uji Kognitif Baku (3)
  `mmse` DECIMAL(4,2) NOT NULL DEFAULT 24.00,
  `functional_assessment` DECIMAL(4,2) NOT NULL DEFAULT 7.00,
  `adl` DECIMAL(4,2) NOT NULL DEFAULT 7.00,
  -- 7 Gejala Kognitif Inti (7)
  `memory_complaints` TINYINT NOT NULL DEFAULT 0,
  `behavioral_problems` TINYINT NOT NULL DEFAULT 0,
  `confusion` TINYINT NOT NULL DEFAULT 0,
  `disorientation` TINYINT NOT NULL DEFAULT 0,
  `personality_changes` TINYINT NOT NULL DEFAULT 0,
  `difficulty_completing_tasks` TINYINT NOT NULL DEFAULT 0,
  `forgetfulness` TINYINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_profiles_user` (`user_id`),
  CONSTRAINT `fk_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Tabel nakes: Direktori Tenaga Kesehatan & Dokter Spesialis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `nakes` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `sip` VARCHAR(100) NOT NULL UNIQUE,
  `str` VARCHAR(100) NOT NULL UNIQUE,
  `nip` VARCHAR(100) NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `specialization` VARCHAR(100) NOT NULL DEFAULT 'Dokter Spesialis Saraf (Sp.S / Sp.N)',
  `facility_name` VARCHAR(150) NOT NULL,
  `phone_number` VARCHAR(30) NULL,
  `email` VARCHAR(191) NULL,
  `status_validation` ENUM('ACTIVE', 'PENDING', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `verified_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_nakes_sip` (`sip`),
  INDEX `idx_nakes_str` (`str`),
  INDEX `idx_nakes_facility` (`facility_name`),
  CONSTRAINT `fk_nakes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Tabel consultations: Rekam Medis & Kode Rujukan Nakes (NKS-26-XXXX-ALZ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consultations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doc_id` VARCHAR(100) NOT NULL UNIQUE,
  `nakes_code` VARCHAR(100) NOT NULL UNIQUE,
  `patient_name` VARCHAR(150) NOT NULL,
  `patient_id_label` VARCHAR(100) NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `validated_by_nakes_id` BIGINT UNSIGNED NULL,
  `status` ENUM('VALID_ACTIVE', 'VALIDATED_BY_CLINICIAN', 'ARCHIVED') NOT NULL DEFAULT 'VALID_ACTIVE',
  `verification_hash` VARCHAR(100) NOT NULL,
  `created_at_label` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_consult_doc_id` (`doc_id`),
  INDEX `idx_consult_nakes_code` (`nakes_code`),
  INDEX `idx_consult_status` (`status`),
  CONSTRAINT `fk_consult_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_consult_nakes` FOREIGN KEY (`validated_by_nakes_id`) REFERENCES `nakes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Tabel prediction_records: Riwayat Inferensi XGBoost, Logit z & 32 Biomarker
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prediction_records` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `consultation_id` BIGINT UNSIGNED NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'user_profile',
  -- Label Resmi Machine Learning
  `ml_label` TINYINT NOT NULL COMMENT '0: Non-Alzheimer, 1: Alzheimer',
  `ml_label_name` VARCHAR(100) NOT NULL,
  `ml_label_badge` VARCHAR(50) NOT NULL,
  `is_positive` TINYINT NOT NULL DEFAULT 0,
  `risk_level` VARCHAR(50) NOT NULL,
  `risk_level_id` VARCHAR(50) NOT NULL,
  `probability_1` DECIMAL(5,2) NOT NULL,
  `probability_0` DECIMAL(5,2) NOT NULL,
  `confidence` VARCHAR(20) NOT NULL,
  -- Kalkulasi Logit XGBoost
  `raw_logit_z` DECIMAL(8,4) NOT NULL,
  `base_margin` DECIMAL(8,4) NOT NULL,
  `sum_tree_weights` DECIMAL(8,4) NOT NULL,
  `num_trees` INT NOT NULL DEFAULT 25,
  `active_symptoms_count` INT NOT NULL DEFAULT 0,
  -- Rincian JSON
  `calculation_details` JSON NULL,
  `symptom_summary` JSON NULL,
  `all_32_biomarkers` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pred_consult` (`consultation_id`),
  INDEX `idx_pred_label` (`ml_label`),
  INDEX `idx_pred_user` (`user_id`),
  CONSTRAINT `fk_pred_consult` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Tabel research_dispatches: Publikasi Buletin Riset Klinis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `research_dispatches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `abstract` TEXT NULL,
  `content` LONGTEXT NULL,
  `author` VARCHAR(150) NOT NULL DEFAULT 'Neura Clinical Research Team',
  `badge_label` VARCHAR(100) NULL,
  `is_featured` TINYINT NOT NULL DEFAULT 0,
  `published_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_research_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Tabel research_subscribers: Daftar Email Langganan Riset
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `research_subscribers` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `subscribed_categories` JSON NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `subscribed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_subscribers_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
