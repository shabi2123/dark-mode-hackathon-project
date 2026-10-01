<?php
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();
$hash = password_hash('password123', PASSWORD_BCRYPT);
$stmt = $pdo->prepare('UPDATE users SET password_hash = ?');
$stmt->execute([$hash]);

echo "All users updated to password: password123 (hash: {$hash})\n";
