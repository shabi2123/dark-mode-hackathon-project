USE bankflow;

-- Demo Users (password: password123)
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Admin User', 'admin@bankflow.com', '1234567890', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Branch Manager', 'manager@bankflow.com', '1234567891', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
('Sarah Johnson', 'sarah@bankflow.com', '1234567892', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff'),
('Mike Chen', 'mike@bankflow.com', '1234567893', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff'),
('Lisa Park', 'lisa@bankflow.com', '1234567894', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff'),
('John Customer', 'john@example.com', '5551234567', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer'),
('Jane Customer', 'jane@example.com', '5559876543', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer');

-- Departments
INSERT INTO departments (name, code, description, working_hours_start, working_hours_end) VALUES
('Customer Service', 'CS', 'General customer service and account inquiries', '08:00:00', '16:00:00'),
('Cash Operations', 'CASH', 'Cash deposits and withdrawals assistance', '08:00:00', '16:00:00'),
('Document Services', 'DOC', 'Document verification and certificate services', '08:00:00', '16:00:00');

-- Services
INSERT INTO services (department_id, name, description, avg_duration_minutes, max_daily_appointments) VALUES
(1, 'Account Opening', 'Open a new bank account', 20, 15),
(1, 'Account Information', 'Account balance inquiries and updates', 10, 25),
(1, 'General Inquiry', 'General banking questions and support', 8, 30),
(2, 'Cash Deposit Assistance', 'Assisted cash deposit services', 5, 40),
(2, 'Cash Withdrawal Assistance', 'Assisted cash withdrawal services', 5, 40),
(3, 'Document Verification', 'Verify identity and banking documents', 15, 20),
(3, 'Certificate / Statement Request', 'Request bank certificates or statements', 10, 25),
(3, 'Card Assistance', 'Debit/credit card related services', 12, 20);

-- Counters
INSERT INTO counters (department_id, staff_id, name, status) VALUES
(1, 3, 'Counter 1', 'available'),
(1, 4, 'Counter 2', 'available'),
(2, 5, 'Counter 3', 'available'),
(2, NULL, 'Counter 4', 'closed'),
(3, NULL, 'Counter 5', 'closed');
