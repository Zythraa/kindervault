<?php
declare(strict_types=1);

// CLI-only first administrator bootstrap. The tools/ directory is denied by
// Apache, and this script refuses to run through a web request.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config.php';

$usage = "Usage: php tools/create_admin.php <username> <full name>\n";
$username = trim((string)($argv[1] ?? ''));
$fullName = trim((string)($argv[2] ?? ''));
if ($username === '' || $fullName === '' || !preg_match('/^[A-Za-z0-9._-]{3,50}$/', $username)) {
    fwrite(STDERR, $usage);
    exit(2);
}

$password = getenv('KINDER_ADMIN_PASSWORD');
if ($password === false || $password === '') {
    fwrite(STDERR, "Set KINDER_ADMIN_PASSWORD in the shell for this one-time command.\n");
    exit(2);
}
if (strlen($password) < 8) {
    fwrite(STDERR, "The temporary administrator password must be at least 8 characters.\n");
    exit(2);
}

$pdo = db();
$existing = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='Administrator' AND status='Active'")->fetchColumn();
if ($existing > 0) {
    fwrite(STDERR, "An active Administrator already exists; no account was created.\n");
    exit(3);
}

$stmt = $pdo->prepare('INSERT INTO users (username, full_name, password, role, status) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$username, $fullName, password_hash($password, PASSWORD_DEFAULT), 'Administrator', 'Active']);
fwrite(STDOUT, "Administrator account created for {$username}.\n");
