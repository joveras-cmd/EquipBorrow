-- =====================================================================
-- database.sql  -  Equipment Borrowing System
-- Import with phpMyAdmin (Import tab) or:  mysql -u root < database.sql
-- WARNING: the DROP TABLE lines wipe existing data. Fine for first setup.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS equipment_borrowing
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE equipment_borrowing;

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS users;

-- ---------- USERS (both roles live here; "role" decides access) -------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,      -- UNIQUE: no duplicate accounts
  password_hash VARCHAR(255) NOT NULL,             -- bcrypt hash, never the password
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- ASSETS (the equipment that can be borrowed) ---------------
CREATE TABLE assets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  asset_tag  VARCHAR(40)  NOT NULL UNIQUE,
  category   VARCHAR(60)  NOT NULL DEFAULT 'General',
  status     ENUM('available','maintenance') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- RESERVATIONS (one row per borrow request) -----------------
-- Life cycle:  in_approval -> approved -> checked_out -> returned
--              in_approval -> declined | cancelled
CREATE TABLE reservations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  asset_id      INT NOT NULL,
  user_id       INT NOT NULL,
  status        ENUM('in_approval','approved','declined','checked_out','returned','cancelled')
                NOT NULL DEFAULT 'in_approval',
  start_date    DATETIME NOT NULL,
  due_date      DATETIME NULL,                     -- NULL = "indefinite return"
  auto_checkout TINYINT(1) NOT NULL DEFAULT 0,     -- the "Auto check in/out" box
  notes         VARCHAR(255) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  INDEX idx_res_asset_dates (asset_id, start_date, due_date),
  INDEX idx_res_user_status (user_id, status)
);

-- ---------- SAMPLE DATA ------------------------------------------------
-- Passwords (bcrypt cost 12):  admin = Admin@12345   |   users = User@12345
-- CHANGE THESE before showing the system to anyone outside class.
INSERT INTO users (full_name, email, password_hash, role) VALUES
 ('IT Asset Management', 'admin@cspc.local', '$2b$12$zMy934LHwcysXC3T4iYpOue6ynzHpkTHgZGedx3yYQa4AWG7zOdSW', 'admin'),
 ('Emily Ly',            'emily@cspc.local', '$2b$12$uWED1w4m704.yWzoQsVX/OOsqjl4wAvPppB.KbRSWj5b8MyXoe1Zq', 'user'),
 ('Juan Dela Cruz',      'juan@cspc.local',  '$2b$12$uWED1w4m704.yWzoQsVX/OOsqjl4wAvPppB.KbRSWj5b8MyXoe1Zq', 'user');

INSERT INTO assets (name, asset_tag, category, status) VALUES
 ('iMac Pro 2019',     '0000100563-9', 'Computer', 'available'),
 ('Macbook Air M2',    'SP04',         'Laptop',   'available'),
 ('Macbook Air M2',    'CT-4',         'Laptop',   'available'),
 ('DJI Mavic Air 2 #1','770487-1',     'Drone',    'available'),
 ('Epson Projector',   'PRJ-01',       'AV',       'available'),
 ('Canon DSLR Camera', 'CAM-02',       'Camera',   'maintenance');

-- Dates are relative to NOW() so the dashboard cards always show data.
INSERT INTO reservations (asset_id, user_id, status, start_date, due_date, auto_checkout, notes) VALUES
 (1, 2, 'in_approval', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 18 DAY, 0, 'Thesis video editing'),
 (2, 2, 'in_approval', NOW() - INTERVAL 15 DAY, NOW() - INTERVAL 12 DAY, 0, NULL),
 (3, 1, 'in_approval', NOW() - INTERVAL 9 DAY,  NOW() - INTERVAL 7 DAY,  0, 'Office use'),
 (4, 2, 'declined',    NOW() - INTERVAL 5 DAY,  NOW() - INTERVAL 4 DAY,  0, 'Aerial shots'),
 (5, 3, 'approved',    NOW() + INTERVAL 1 HOUR, NOW() + INTERVAL 5 HOUR, 0, 'Class presentation'),
 (2, 3, 'checked_out', NOW() - INTERVAL 1 DAY,  NOW() + INTERVAL 2 DAY,  0, 'Capstone defense prep'),
 (4, 2, 'returned',    NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 28 DAY, 0, NULL),
 (1, 3, 'in_approval', NOW() + INTERVAL 3 DAY,  NOW() + INTERVAL 4 DAY,  1, 'Auto check in/out demo');