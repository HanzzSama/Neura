-- ==============================================================================
-- NEURA AI — ENTERPRISE CLINICAL ALZHEIMER DETECTION INFRASTRUCTURE
-- Relational Schema V2: neura_db (MySQL 8.4+ / MariaDB InnoDB)
-- Normalized (3NF), ACID Compliant, Explainable AI & Permenkes No. 24/2022 (RME)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `neura_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `neura_db`;

-- ==============================================================================
-- DOMAIN 1: IDENTITY, CREDENTIALS & ACCESS MANAGEMENT (IAM)
-- ==============================================================================

-- 1.1 Tabel users: Identitas Inti & Role RBAC
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NULL UNIQUE,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `role` ENUM('User', 'Nakes', 'Admin') NOT NULL DEFAULT 'User',
  `avatar_url` VARCHAR(255) NULL,
  `status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
  `email_verified_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Tabel patient_profiles: Biodata Pasien & Kontak Darurat
CREATE TABLE IF NOT EXISTS `patient_profiles` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `full_name` VARCHAR(150) NOT NULL,
  `nik` VARCHAR(20) NULL UNIQUE COMMENT 'Nomor Induk Kependudukan (Opsional)',
  `date_of_birth` DATE NULL,
  `gender` ENUM('MALE', 'FEMALE') NULL,
  `phone` VARCHAR(30) NULL,
  `avatar_url` VARCHAR(255) NULL,
  `emergency_contact_name` VARCHAR(150) NULL,
  `emergency_contact_phone` VARCHAR(30) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_v2_patprof_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 Tabel oauth_identities: Akun OAuth Pihak Ketiga (Google / Firebase)
CREATE TABLE IF NOT EXISTS `oauth_identities` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'google',
  `provider_uid` VARCHAR(191) NOT NULL,
  `provider_email` VARCHAR(191) NOT NULL,
  `raw_user_info` JSON NULL,
  `last_login_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_provider_uid` (`provider`, `provider_uid`),
  INDEX `idx_oauth_user` (`user_id`),
  CONSTRAINT `fk_v2_oauth_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Tabel nakes_profiles: Direktori & Kredensial Tenaga Medis (SIP, STR)
CREATE TABLE IF NOT EXISTS `nakes_profiles` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `sip` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Surat Izin Praktik Dokter',
  `str` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Surat Tanda Registrasi KKI',
  `nip` VARCHAR(100) NULL,
  `specialization` VARCHAR(120) NOT NULL DEFAULT 'Spesialis Saraf (Sp.N / Sp.S)',
  `sub_specialization` VARCHAR(120) NULL,
  `facility_name` VARCHAR(150) NOT NULL,
  `validation_status` ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'VERIFIED',
  `verified_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nakes_prof_str` (`str`),
  INDEX `idx_nakes_prof_sip` (`sip`),
  CONSTRAINT `fk_v2_nakes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 Tabel admin_profiles: Profil Administrator Sistem & Notifikasi Real
CREATE TABLE IF NOT EXISTS `admin_profiles` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `custom_email` VARCHAR(191) NOT NULL UNIQUE COMMENT 'Contoh: hanzz@neura.dr.id',
  `real_notification_emails` JSON NOT NULL COMMENT 'Array email asli untuk kirim OTP Gmail SMTP',
  `department` VARCHAR(100) NOT NULL DEFAULT 'System Architecture & AI Engineering',
  `security_clearance` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_v2_admin_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DOMAIN 2: MEDICAL DOCUMENTS & CLINICAL CONSULTATIONS (EMR / RME)
-- ==============================================================================

-- 2.1 Tabel medical_documents: Master Berkas Rekam Medis Pasien
CREATE TABLE IF NOT EXISTS `medical_documents` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doc_number` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Format: DOC-NEURA-2026-XXXX',
  `patient_user_id` BIGINT UNSIGNED NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  `document_title` VARCHAR(200) NOT NULL DEFAULT 'Laporan Deteksi Dini Kognitif & Biomarker Alzheimer',
  `status` ENUM('DRAFT', 'ANALYZED', 'VALIDATED_BY_CLINICIAN', 'ARCHIVED') NOT NULL DEFAULT 'ANALYZED',
  `qr_verification_token` VARCHAR(64) NOT NULL UNIQUE,
  `integrity_hash` VARCHAR(64) NOT NULL COMMENT 'SHA-256 integrity hash',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_doc_number` (`doc_number`),
  INDEX `idx_doc_patient` (`patient_user_id`),
  INDEX `idx_doc_status` (`status`),
  CONSTRAINT `fk_v2_doc_patient` FOREIGN KEY (`patient_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Tabel consultation_sessions: Sesi Konsultasi & Kode Rujukan Nakes
CREATE TABLE IF NOT EXISTS `consultation_sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `nakes_code` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Format: NKS-26-XXXX-ALZ',
  `assigned_nakes_id` BIGINT UNSIGNED NULL,
  `session_channel` ENUM('LIVEKIT_VIDEO', 'CHAT', 'IN_PERSON') NOT NULL DEFAULT 'CHAT',
  `scheduled_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cs_nakes_code` (`nakes_code`),
  CONSTRAINT `fk_v2_cs_doc` FOREIGN KEY (`document_id`) REFERENCES `medical_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_v2_cs_nakes` FOREIGN KEY (`assigned_nakes_id`) REFERENCES `nakes_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 Tabel clinical_validations: Verifikasi Dokter & Diagnosa ICD-10
CREATE TABLE IF NOT EXISTS `clinical_validations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL,
  `validator_nakes_id` BIGINT UNSIGNED NOT NULL,
  `icd10_code` VARCHAR(20) NOT NULL DEFAULT 'G30.9' COMMENT 'Kode ICD-10 diagnosis',
  `diagnosis_name` VARCHAR(150) NOT NULL DEFAULT 'Alzheimer Disease, Unspecified',
  `clinical_notes` TEXT NOT NULL,
  `treatment_recommendations` TEXT NULL,
  `digital_signature` TEXT NOT NULL COMMENT 'Tanda tangan digital cryptographic token',
  `signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cv_document` (`document_id`),
  INDEX `idx_cv_nakes` (`validator_nakes_id`),
  CONSTRAINT `fk_v2_cv_doc` FOREIGN KEY (`document_id`) REFERENCES `medical_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_v2_cv_nakes` FOREIGN KEY (`validator_nakes_id`) REFERENCES `nakes_profiles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 Tabel document_attachments: Lampiran Dokumen Medis
CREATE TABLE IF NOT EXISTS `document_attachments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NOT NULL,
  `file_type` ENUM('PDF_REPORT', 'LAB_RESULT', 'BRAIN_MRI', 'VOICE_RECORDING') NOT NULL DEFAULT 'PDF_REPORT',
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size_bytes` INT UNSIGNED NOT NULL,
  `file_hash_sha256` CHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_v2_att_doc` FOREIGN KEY (`document_id`) REFERENCES `medical_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DOMAIN 3: AI INFERENCE ENGINE & 32 CLINICAL BIOMARKERS
-- ==============================================================================

-- 3.1 Tabel patient_biomarkers: 32 Parameter Medis Aligned with RapidMiner
CREATE TABLE IF NOT EXISTS `patient_biomarkers` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `patient_user_id` BIGINT UNSIGNED NULL,
  -- Demografi (4)
  `age` SMALLINT UNSIGNED NOT NULL DEFAULT 65,
  `gender` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0: Pria, 1: Wanita',
  `ethnicity` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `education_level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  -- Fisik & Vital (3)
  `height_cm` DECIMAL(5,2) NULL,
  `weight_kg` DECIMAL(5,2) NULL,
  `bmi` DECIMAL(4,2) NOT NULL DEFAULT 22.50,
  `systolic_bp` SMALLINT UNSIGNED NOT NULL DEFAULT 120,
  `diastolic_bp` SMALLINT UNSIGNED NOT NULL DEFAULT 80,
  -- Gaya Hidup (5)
  `smoking` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `alcohol_consumption` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `physical_activity` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `diet_quality` DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  `sleep_quality` DECIMAL(4,2) NOT NULL DEFAULT 7.00,
  -- Riwayat Penyakit & Komorbiditas (6)
  `family_history_alzheimers` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `cardiovascular_disease` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `diabetes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `depression` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `head_injury` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `hypertension` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Profil Lipid Laboratorium (4)
  `cholesterol_total` DECIMAL(6,2) NOT NULL DEFAULT 200.00,
  `cholesterol_ldl` DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  `cholesterol_hdl` DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  `cholesterol_triglycerides` DECIMAL(6,2) NOT NULL DEFAULT 150.00,
  -- Skor Skala Kognitif Baku (3)
  `mmse` DECIMAL(4,2) NOT NULL DEFAULT 24.00,
  `functional_assessment` DECIMAL(4,2) NOT NULL DEFAULT 7.00,
  `adl` DECIMAL(4,2) NOT NULL DEFAULT 7.00,
  -- 7 Gejala Inti Kognitif (7)
  `memory_complaints` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `behavioral_problems` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `confusion` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `disorientation` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `personality_changes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `difficulty_completing_tasks` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `forgetfulness` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `biomarker_hash` CHAR(64) NOT NULL COMMENT 'Hash 32 biomarker untuk cache lookups',
  `recorded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_bm_patient` (`patient_user_id`),
  INDEX `idx_bm_hash` (`biomarker_hash`),
  CONSTRAINT `fk_v2_bm_patient` FOREIGN KEY (`patient_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Tabel prediction_runs: Riwayat Inferensi Model XGBoost 25 Trees
CREATE TABLE IF NOT EXISTS `prediction_runs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_id` BIGINT UNSIGNED NULL,
  `biomarker_id` BIGINT UNSIGNED NOT NULL,
  `model_version` VARCHAR(50) NOT NULL DEFAULT 'XGBoost-25Trees-RapidMiner-v1',
  `ml_label` TINYINT UNSIGNED NOT NULL COMMENT '0: Non-Alzheimer, 1: Alzheimer',
  `ml_label_name` VARCHAR(50) NOT NULL,
  `risk_level` ENUM('Rendah', 'Sedang', 'Tinggi') NOT NULL,
  `probability_positive` DECIMAL(5,2) NOT NULL,
  `probability_negative` DECIMAL(5,2) NOT NULL,
  `raw_logit_z` DECIMAL(8,4) NOT NULL,
  `base_margin` DECIMAL(8,4) NOT NULL DEFAULT -1.5878,
  `sum_tree_weights` DECIMAL(8,4) NOT NULL,
  `consensus_status` VARCHAR(50) NOT NULL DEFAULT 'FULL_CONSENSUS',
  `active_symptoms_count` TINYINT UNSIGNED NOT NULL,
  `execution_time_ms` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pr_doc` (`document_id`),
  INDEX `idx_pr_label` (`ml_label`),
  CONSTRAINT `fk_v2_pr_doc` FOREIGN KEY (`document_id`) REFERENCES `medical_documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_v2_pr_bm` FOREIGN KEY (`biomarker_id`) REFERENCES `patient_biomarkers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Tabel prediction_attributions: Analisis Explainable AI (XAI)
CREATE TABLE IF NOT EXISTS `prediction_attributions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `prediction_run_id` BIGINT UNSIGNED NOT NULL,
  `feature_name` VARCHAR(80) NOT NULL,
  `feature_value` VARCHAR(50) NOT NULL,
  `attribution_weight` DECIMAL(8,4) NOT NULL,
  `driver_type` ENUM('RISK_PROMOTER', 'PROTECTIVE') NOT NULL,
  CONSTRAINT `fk_v2_pa_pred` FOREIGN KEY (`prediction_run_id`) REFERENCES `prediction_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DOMAIN 4: SESSIONS, OTP TOKENS & HIGH-PERFORMANCE CACHE
-- ==============================================================================

-- 4.1 Tabel auth_sessions: Sesi Server-Side & Remember Me
CREATE TABLE IF NOT EXISTS `auth_sessions` (
  `session_token` VARCHAR(128) PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('User', 'Nakes', 'Admin') NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `payload` JSON NULL,
  `last_activity_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  INDEX `idx_as_user` (`user_id`),
  INDEX `idx_as_expires` (`expires_at`),
  CONSTRAINT `fk_v2_as_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.2 Tabel auth_otp_codes: Kode 2FA OTP Admin & Verifikasi Akun
CREATE TABLE IF NOT EXISTS `auth_otp_codes` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `identifier` VARCHAR(191) NOT NULL COMMENT 'Email tujuan OTP',
  `otp_code` VARCHAR(10) NOT NULL,
  `purpose` ENUM('ADMIN_2FA', 'EMAIL_VERIFICATION', 'PASSWORD_RESET') NOT NULL DEFAULT 'ADMIN_2FA',
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `max_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `expires_at` TIMESTAMP NOT NULL,
  `consumed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otp_identifier` (`identifier`, `purpose`),
  INDEX `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.3 Tabel system_cache: Key-Value Caching
CREATE TABLE IF NOT EXISTS `system_cache` (
  `cache_key` VARCHAR(191) PRIMARY KEY,
  `cache_value` LONGTEXT NOT NULL,
  `tag` VARCHAR(100) NULL,
  `expires_at` TIMESTAMP NOT NULL,
  INDEX `idx_cache_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.4 Tabel inference_cache: Deduplikasi Komputasi AI
CREATE TABLE IF NOT EXISTS `inference_cache` (
  `biomarker_hash` CHAR(64) PRIMARY KEY,
  `cached_prediction_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DOMAIN 5: SYSTEM NOTIFICATIONS & BROADCASTS
-- ==============================================================================

-- 5.1 Tabel system_notifications: Pusat Notifikasi Pasien, Dokter & Admin
CREATE TABLE IF NOT EXISTS `system_notifications` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `target_user_id` BIGINT UNSIGNED NULL,
  `target_role` ENUM('ALL', 'USER', 'NAKES', 'ADMIN') NOT NULL DEFAULT 'ALL',
  `title` VARCHAR(150) NOT NULL,
  `body` TEXT NOT NULL,
  `category` ENUM('AUTH', 'CLINICAL', 'SYSTEM', 'RESEARCH') NOT NULL DEFAULT 'SYSTEM',
  `urgency` ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL DEFAULT 'NORMAL',
  `action_url` VARCHAR(255) NULL,
  `metadata` JSON NULL,
  `is_read` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_target` (`target_role`, `target_user_id`),
  INDEX `idx_notif_unread` (`is_read`),
  CONSTRAINT `fk_v2_notif_user` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DOMAIN 6: AUDIT TRAIL, RESEARCH ARTICLES & SUBSCRIPTIONS
-- ==============================================================================

-- 6.1 Tabel audit_logs: Audit Trail Keamanan & Kepatuhan Medis
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `actor_user_id` BIGINT UNSIGNED NULL,
  `actor_email` VARCHAR(191) NOT NULL,
  `action` VARCHAR(100) NOT NULL COMMENT 'e.g. LOGIN_2FA_SUCCESS, VALIDATE_CONSULTATION, EXPORT_REPORT',
  `entity_type` VARCHAR(50) NOT NULL COMMENT 'e.g. medical_documents, users',
  `entity_id` VARCHAR(100) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `details` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_al_actor` (`actor_user_id`),
  INDEX `idx_al_action` (`action`),
  CONSTRAINT `fk_v2_al_user` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6.2 Tabel research_articles: Buletin & Publikasi Klinis
CREATE TABLE IF NOT EXISTS `research_articles` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(191) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `abstract` TEXT NULL,
  `content` LONGTEXT NULL,
  `author_name` VARCHAR(150) NOT NULL DEFAULT 'Neura Clinical Research Team',
  `badge_label` VARCHAR(100) NULL,
  `is_featured` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `published_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ra_slug` (`slug`),
  INDEX `idx_ra_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6.3 Tabel research_subscribers: Langganan Berita Riset
CREATE TABLE IF NOT EXISTS `research_subscribers` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `subscribed_categories` JSON NULL,
  `is_active` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `subscribed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_subscribers_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
