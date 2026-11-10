-- =========================================================================
-- CENTRALIZED SAAS MANAGEMENT PLATFORM (MySQL 8.0+ Compatible Schema)
-- Applications:
-- 1. Central Super Admin Panel
-- 2. Red Apple Gym Management System
-- 3. Bhalerao Medical Management System
-- =========================================================================

CREATE DATABASE IF NOT EXISTS `saas_central_platform` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `saas_central_platform`;

-- -------------------------------------------------------------------------
-- 1. CENTRAL ADMINISTRATION & AUTHENTICATION
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'GYM_ADMIN', 'GYM_STAFF', 'MEDICAL_ADMIN', 'DOCTOR', 'PHARMACIST') NOT NULL DEFAULT 'SUPER_ADMIN',
  `app_access` VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'ALL', 'RED_APPLE_GYM', 'BHALERAO_MEDICAL'
  `status` ENUM('ACTIVE', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `customer_name` VARCHAR(150) NOT NULL,
  `business_type` ENUM('RED_APPLE_GYM', 'BHALERAO_MEDICAL') NOT NULL,
  `contact_person` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `city` VARCHAR(80) NOT NULL,
  `status` ENUM('ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `current_plan` VARCHAR(50) NOT NULL DEFAULT 'PRO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` VARCHAR(36) PRIMARY KEY,
  `plan_code` VARCHAR(50) NOT NULL UNIQUE,
  `plan_name` VARCHAR(100) NOT NULL,
  `business_type` ENUM('RED_APPLE_GYM', 'BHALERAO_MEDICAL', 'ALL') NOT NULL,
  `tier` ENUM('STANDARD', 'PRO', 'CUSTOM') NOT NULL,
  `monthly_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `annual_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_users` INT NOT NULL DEFAULT 5,
  `allowed_modules` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `license_key` VARCHAR(60) NOT NULL UNIQUE,
  `customer_id` VARCHAR(36) NOT NULL,
  `business_type` ENUM('RED_APPLE_GYM', 'BHALERAO_MEDICAL') NOT NULL,
  `plan_tier` ENUM('STANDARD', 'PRO', 'CUSTOM') NOT NULL,
  `status` ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  `activation_date` DATE NOT NULL,
  `expiration_date` DATE NOT NULL,
  `max_nodes` INT NOT NULL DEFAULT 10,
  `features_enabled` JSON NOT NULL, -- Granular dynamic feature toggles
  `last_heartbeat` TIMESTAMP NULL,
  `cluster_node` VARCHAR(80) DEFAULT 'node-asia-south1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NULL,
  `user_name` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_entity` VARCHAR(80) NOT NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT '127.0.0.1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. RED APPLE GYM MANAGEMENT SYSTEM TABLES
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gym_members` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_code` VARCHAR(30) NOT NULL UNIQUE,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(120) NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `dob` DATE NULL,
  `blood_group` VARCHAR(5) NULL,
  `membership_type` VARCHAR(50) NOT NULL DEFAULT 'Annual Gold',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('ACTIVE', 'EXPIRING', 'EXPIRED', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
  `assigned_trainer` VARCHAR(100) DEFAULT 'Unassigned',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `gym_attendance` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_id` VARCHAR(36) NOT NULL,
  `check_in_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `check_out_time` TIMESTAMP NULL,
  `method` ENUM('BIOMETRIC', 'CARD', 'MANUAL_OVERRIDE') NOT NULL DEFAULT 'CARD',
  FOREIGN KEY (`member_id`) REFERENCES `gym_members`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `gym_trainers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `trainer_name` VARCHAR(100) NOT NULL,
  `specialty` VARCHAR(100) NOT NULL, -- 'Bodybuilding', 'CrossFit', 'HIIT', 'Yoga'
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(120) NULL,
  `salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS `gym_payments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `receipt_no` VARCHAR(40) NOT NULL UNIQUE,
  `member_id` VARCHAR(36) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `total_due` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_date` DATE NOT NULL,
  `payment_method` ENUM('CASH', 'UPI', 'CREDIT_CARD', 'BANK_TRANSFER') NOT NULL,
  `status` ENUM('PAID', 'PARTIAL', 'PENDING') NOT NULL DEFAULT 'PAID',
  FOREIGN KEY (`member_id`) REFERENCES `gym_members`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `gym_expenses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `expense_title` VARCHAR(150) NOT NULL,
  `category` ENUM('EQUIPMENT', 'RENT', 'ELECTRICITY', 'SALARY', 'SUPPLEMENTS', 'OTHER') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `approved_by` VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS `gym_workout_plans` (
  `id` VARCHAR(36) PRIMARY KEY,
  `plan_title` VARCHAR(100) NOT NULL,
  `target_level` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO') NOT NULL,
  `description` TEXT NOT NULL,
  `schedule_json` JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS `gym_diet_plans` (
  `id` VARCHAR(36) PRIMARY KEY,
  `plan_title` VARCHAR(100) NOT NULL,
  `goal` ENUM('FAT_LOSS', 'MUSCLE_GAIN', 'KETO', 'LEAN_BULK') NOT NULL,
  `calories` INT NOT NULL,
  `meal_schedule_json` JSON NOT NULL
);

-- -------------------------------------------------------------------------
-- 3. BHALERAO MEDICAL MANAGEMENT SYSTEM TABLES
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `medical_patients` (
  `id` VARCHAR(36) PRIMARY KEY,
  `patient_code` VARCHAR(30) NOT NULL UNIQUE,
  `full_name` VARCHAR(120) NOT NULL,
  `age` INT NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(120) NULL,
  `address` TEXT NULL,
  `blood_group` VARCHAR(5) NULL,
  `allergies` VARCHAR(255) DEFAULT 'None Known',
  `chronic_conditions` VARCHAR(255) DEFAULT 'None',
  `emergency_contact` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `medical_doctors` (
  `id` VARCHAR(36) PRIMARY KEY,
  `doctor_name` VARCHAR(120) NOT NULL,
  `specialty` VARCHAR(100) NOT NULL,
  `qualification` VARCHAR(80) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `consultation_fee` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  `status` ENUM('AVAILABLE', 'IN_SURGERY', 'OFF_DUTY') NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS `medical_appointments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `token_no` INT NOT NULL,
  `patient_id` VARCHAR(36) NOT NULL,
  `doctor_id` VARCHAR(36) NOT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NOT NULL,
  `reason` VARCHAR(200) NOT NULL,
  `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  FOREIGN KEY (`patient_id`) REFERENCES `medical_patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `medical_doctors`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `medical_inventory` (
  `id` VARCHAR(36) PRIMARY KEY,
  `medicine_name` VARCHAR(150) NOT NULL,
  `category` ENUM('ANTIBIOTIC', 'ANALGESIC', 'CARDIAC', 'DIABETIC', 'VITAMIN', 'RESPIRATORY', 'TOPICAL') NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `min_alert_level` INT NOT NULL DEFAULT 15,
  `purchase_price` DECIMAL(10,2) NOT NULL,
  `mrp` DECIMAL(10,2) NOT NULL,
  `expiry_date` DATE NOT NULL,
  `rack_shelf` VARCHAR(30) DEFAULT 'R1-S2',
  `supplier_id` VARCHAR(36) NULL
);

CREATE TABLE IF NOT EXISTS `medical_prescriptions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `rx_number` VARCHAR(40) NOT NULL UNIQUE,
  `patient_id` VARCHAR(36) NOT NULL,
  `doctor_id` VARCHAR(36) NOT NULL,
  `diagnosis` VARCHAR(255) NOT NULL,
  `medicines_prescribed_json` JSON NOT NULL,
  `clinical_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `medical_patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `medical_doctors`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `medical_billing` (
  `id` VARCHAR(36) PRIMARY KEY,
  `invoice_no` VARCHAR(40) NOT NULL UNIQUE,
  `patient_id` VARCHAR(36) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `gst_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(10,2) NOT NULL,
  `payment_mode` ENUM('CASH', 'UPI', 'CARD', 'INSURANCE') NOT NULL,
  `payment_status` ENUM('PAID', 'PARTIAL', 'DUE') NOT NULL DEFAULT 'PAID',
  `line_items_json` JSON NOT NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `medical_patients`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `medical_suppliers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `supplier_name` VARCHAR(150) NOT NULL,
  `dl_number` VARCHAR(60) NOT NULL, -- Drug License Number
  `gstin` VARCHAR(30) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(120) NULL,
  `address` TEXT NOT NULL,
  `payment_terms` VARCHAR(50) DEFAULT 'Net 30'
);

