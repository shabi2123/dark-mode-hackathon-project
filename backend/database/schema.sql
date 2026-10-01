DROP DATABASE IF EXISTS bankflow;
CREATE DATABASE bankflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bankflow;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer','staff','manager','admin') NOT NULL DEFAULT 'customer',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    working_hours_start TIME NOT NULL DEFAULT '08:00:00',
    working_hours_end TIME NOT NULL DEFAULT '16:00:00',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avg_duration_minutes INT NOT NULL DEFAULT 10,
    max_daily_appointments INT NOT NULL DEFAULT 20,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_service_dept (name, department_id)
);

CREATE TABLE counters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    staff_id INT DEFAULT NULL,
    name VARCHAR(50) NOT NULL,
    current_token_id INT DEFAULT NULL,
    status ENUM('available','busy','break','closed') NOT NULL DEFAULT 'closed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('booked','confirmed','checked_in','waiting','in_service','completed','cancelled','missed','rescheduled') NOT NULL DEFAULT 'booked',
    appointment_number VARCHAR(30) NOT NULL UNIQUE,
    check_in_time TIMESTAMP NULL DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_appointment_status (status),
    INDEX idx_user_appointments (user_id, appointment_date)
);

CREATE TABLE tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_number VARCHAR(20) NOT NULL,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    counter_id INT DEFAULT NULL,
    appointment_id INT DEFAULT NULL,
    queue_position INT NOT NULL DEFAULT 0,
    estimated_wait_minutes INT NOT NULL DEFAULT 0,
    status ENUM('waiting','called','in_service','completed','skipped','missed','cancelled') NOT NULL DEFAULT 'waiting',
    type ENUM('walk_in','appointment') NOT NULL DEFAULT 'walk_in',
    called_at TIMESTAMP NULL DEFAULT NULL,
    service_started_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    INDEX idx_token_status (status),
    INDEX idx_token_date (created_at),
    INDEX idx_token_service (service_id, status)
);

-- Add foreign key for counters.current_token_id after tokens table exists
ALTER TABLE counters ADD FOREIGN KEY (current_token_id) REFERENCES tokens(id) ON DELETE SET NULL;

CREATE TABLE queue_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL,
    counter_id INT DEFAULT NULL,
    staff_id INT DEFAULT NULL,
    action ENUM('created','called','recalled','started','completed','skipped','missed','cancelled') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_history_token (token_id),
    INDEX idx_history_date (created_at)
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('appointment','queue','system') NOT NULL DEFAULT 'system',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read)
);
