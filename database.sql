-- Udhaar Management System Database Schema
-- Database Name: udhaar_management

CREATE DATABASE IF NOT EXISTS `udhaar_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `udhaar_management`;

-- --------------------------------------------------------
-- Table 1: admin
-- Stores shop administrator credentials
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `admin_id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table 2: customers
-- Stores registered customers. Note: Customer ID is unique primary key;
-- customer names can be identical (e.g. multiple 'Ankita' entries).
-- --------------------------------------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `customer_id` INT PRIMARY KEY AUTO_INCREMENT,
  `customer_name` VARCHAR(100) NOT NULL,
  `mobile` VARCHAR(15),
  `address` TEXT,
  `registration_date` DATE DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table 3: udhaar
-- Stores individual credit/udhaar transactions.
-- Quantity is VARCHAR to support units like '5kg', '2 litres', '3 packets'.
-- --------------------------------------------------------
DROP TABLE IF EXISTS `udhaar`;
CREATE TABLE `udhaar` (
  `udhaar_id` INT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `product_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `udhaar_date` DATE NOT NULL,
  `quantity` VARCHAR(50) DEFAULT '1',
  `due_date` DATE,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_udhaar_customer` FOREIGN KEY (`customer_id`) 
    REFERENCES `customers` (`customer_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table 4: payments
-- Stores payment transactions made against credit.
-- Each payment is stored as a distinct row.
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `payment_id` INT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_method` VARCHAR(30) DEFAULT 'Cash',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) 
    REFERENCES `customers` (`customer_id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Indexes for performance
-- --------------------------------------------------------
CREATE INDEX `idx_customers_name` ON `customers` (`customer_name`);
CREATE INDEX `idx_customers_mobile` ON `customers` (`mobile`);
CREATE INDEX `idx_udhaar_customer_date` ON `udhaar` (`customer_id`, `udhaar_date`);
CREATE INDEX `idx_payments_customer_date` ON `payments` (`customer_id`, `payment_date`);
CREATE INDEX `idx_udhaar_due_date` ON `udhaar` (`due_date`);

-- --------------------------------------------------------
-- Seed Data: Default Admin Account
-- Default password: admin123
-- Stored using Werkzeug pbkdf2:sha256 hash
-- --------------------------------------------------------
INSERT INTO `admin` (`username`, `password`) VALUES 
('admin', 'scrypt:32768:8:1$i7jWkQe0yZ2x0A8T$cf99dd7cbb3ebff2f4977464fe4a85fa4c0cf3664d4c5c24e6eb945e2c56b7ca2c525f0545f47d4e5f32faeebe9195b0577df0f032488be620a8c2f1f0a82b93');

-- --------------------------------------------------------
-- Seed Data: Sample Customers
-- Notice Customer ID 1 and Customer ID 2 both have name 'Ankita'
-- to verify primary-key-based customer identification.
-- --------------------------------------------------------
INSERT INTO `customers` (`customer_id`, `customer_name`, `mobile`, `address`, `registration_date`) VALUES
(1, 'Ankita', '9876543210', 'Main Market Road, Near Laxmi Mandir, Shop #4', '2026-08-01'),
(2, 'Ankita', '9123456780', 'Station Chowk, Flat 201, Green Park Residency', '2026-08-10'),
(3, 'Rahul Gupta', '9811223344', 'Gandhi Nagar, Lane 3, House #14', '2026-07-15'),
(4, 'Vikram Singh', '9988776655', 'Old Bazaar, Opposite City Bank', '2026-08-20'),
(5, 'Sunita Sharma', '9765432190', 'Shakti Nagar, Street 7, House 5B', '2026-09-05'),
(6, 'Amit Patel', '9822334455', 'Nehru Colony, Plot 28', '2026-09-12');

-- --------------------------------------------------------
-- Seed Data: Sample Udhaar Transactions
-- --------------------------------------------------------
INSERT INTO `udhaar` (`customer_id`, `product_name`, `amount`, `udhaar_date`, `quantity`, `due_date`, `notes`) VALUES
(1, 'Basmati Rice & Mustard Oil', 1250.00, '2026-09-10', '10kg + 2L', '2026-09-25', 'Monthly ration quota'),
(1, 'Tata Salt & Sugar', 320.00, '2026-09-15', '2 packets + 5kg', '2026-09-30', 'Festival groceries'),
(2, 'Aashirvaad Atta', 480.00, '2026-09-18', '10kg', '2026-10-05', 'Promised by 5th'),
(3, 'Spices, Dal & Dry Fruits', 2450.00, '2026-08-01', 'Various packets', '2026-08-25', 'Wedding purchase - past due date'),
(3, 'Tea & Milk Powder', 450.00, '2026-08-20', '2 packets + 1kg', '2026-09-10', 'Family emergency item'),
(4, 'Wheat Flour & Cooking Oil', 1850.00, '2026-09-02', '20kg + 5 litres', '2026-09-20', 'Restaurant supply credit'),
(5, 'Soap, Detergent & Toothpaste', 750.00, '2026-09-14', '1 box', '2026-10-10', 'Household items'),
(6, 'Refined Sunflower Oil', 680.00, '2026-09-22', '4 litres', '2026-10-08', 'Regular customer purchase');

-- --------------------------------------------------------
-- Seed Data: Sample Payments (Separate transactions)
-- Notice Rahul paid ₹500 via Cash, then ₹700 via UPI on different dates
-- --------------------------------------------------------
INSERT INTO `payments` (`customer_id`, `amount_paid`, `payment_date`, `payment_method`, `notes`) VALUES
(1, '500.00', '2026-09-20', 'UPI', 'Paid via Google Pay'),
(3, '500.00', '2026-08-10', 'Cash', 'First instalment paid in person'),
(3, '700.00', '2026-08-25', 'UPI', 'Second instalment paid via PhonePe'),
(4, '1000.00', '2026-09-15', 'Bank Transfer', 'Direct account deposit'),
(5, '750.00', '2026-09-28', 'Cash', 'Full settlement done in cash');
