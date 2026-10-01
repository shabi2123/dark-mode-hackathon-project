<?php
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();

echo "Running migrations for Service Readiness & Smart Counter Matching...\n";

// 1. Add requirements to services
try {
    $pdo->exec("ALTER TABLE services ADD COLUMN requirements JSON NULL");
    echo "Added requirements column to services.\n";
} catch (Exception $e) {
    echo "requirements column already exists or skipped: " . $e->getMessage() . "\n";
}

// 2. Add readiness tracking to tokens
try {
    $pdo->exec("ALTER TABLE tokens 
        ADD COLUMN readiness_percentage INT NOT NULL DEFAULT 100,
        ADD COLUMN readiness_status ENUM('READY', 'ACTION REQUIRED', 'NOT READY') NOT NULL DEFAULT 'READY',
        ADD COLUMN missing_requirements TEXT NULL");
    echo "Added readiness tracking to tokens.\n";
} catch (Exception $e) {
    echo "readiness columns on tokens already exist: " . $e->getMessage() . "\n";
}

// 3. Add readiness tracking to appointments
try {
    $pdo->exec("ALTER TABLE appointments 
        ADD COLUMN readiness_percentage INT NOT NULL DEFAULT 100,
        ADD COLUMN readiness_status ENUM('READY', 'ACTION REQUIRED', 'NOT READY') NOT NULL DEFAULT 'READY',
        ADD COLUMN missing_requirements TEXT NULL");
    echo "Added readiness tracking to appointments.\n";
} catch (Exception $e) {
    echo "readiness columns on appointments already exist: " . $e->getMessage() . "\n";
}

// 4. Counter Capabilities mapping table
$pdo->exec("CREATE TABLE IF NOT EXISTS counter_services (
    counter_id INT NOT NULL,
    service_id INT NOT NULL,
    PRIMARY KEY (counter_id, service_id),
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
)");
echo "Created counter_services table.\n";

// 5. Populate structured requirements for services
$serviceRequirements = [
    'Account Opening' => [
        'Original Valid CNIC / Government ID',
        'Proof of Address / Utility Bill (last 3 months)',
        'Proof of Income / Salary Slip or Employment Letter',
        '2 Recent Passport-size Photographs'
    ],
    'Account Information' => [
        'Original Valid CNIC / Government ID',
        'Account Number or Active Debit Card'
    ],
    'General Inquiry' => [
        'Valid Identification (for account-related inquiry)'
    ],
    'Cash Deposit Assistance' => [
        'Completed Deposit Slip',
        'Physical Cash Sorted & Counted',
        'Target Account Number / IBAN'
    ],
    'Cash Withdrawal Assistance' => [
        'Signed Cheque Leaf or Active Debit Card',
        'Original Valid CNIC / Government ID'
    ],
    'Document Verification' => [
        'Original Official Documents to be Verified',
        'Two Attested Photocopies of Each Document',
        'Original Valid CNIC / Government ID'
    ],
    'Certificate / Statement Request' => [
        'Written Account Certificate Application Form',
        'Original Valid CNIC / Government ID',
        'Account Details'
    ],
    'Card Assistance' => [
        'Original Valid CNIC / Government ID',
        'Existing Card (if damaged/replacement) or Account Number'
    ]
];

$stmt = $pdo->prepare("UPDATE services SET requirements = ? WHERE name = ?");
foreach ($serviceRequirements as $name => $reqs) {
    $stmt->execute([json_encode($reqs), $name]);
    echo "Updated requirements for '{$name}'.\n";
}

// 6. Populate Counter Capabilities
// Counter 1: Account Opening (1), Account Information (2), General Inquiry (3)
// Counter 2: Account Opening (1), Account Information (2)
// Counter 3: Cash Deposit (4), Cash Withdrawal (5)
// Counter 4: Cash Deposit (4), Cash Withdrawal (5)
// Counter 5: Document Verification (6), Certificate / Statement (7), Card Assistance (8)
$counterMappings = [
    1 => [1, 2, 3],
    2 => [1, 2],
    3 => [4, 5],
    4 => [4, 5],
    5 => [6, 7, 8]
];

$pdo->exec("DELETE FROM counter_services");
$insertCS = $pdo->prepare("INSERT INTO counter_services (counter_id, service_id) VALUES (?, ?)");
foreach ($counterMappings as $cId => $sIds) {
    foreach ($sIds as $sId) {
        try {
            $insertCS->execute([$cId, $sId]);
        } catch (Exception $e) {}
    }
}
echo "Populated counter capabilities successfully.\n";

echo "Migration Complete!\n";
