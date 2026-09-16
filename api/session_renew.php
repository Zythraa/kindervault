<?php
declare(strict_types=1);

require_once __DIR__ . '/../config.php';
requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();

$user = currentUser();
if (!$user) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

// Rotate the identifier only for an explicit renewal. The authenticated
// session data and CSRF token are retained, while the previous ID is removed.
if (!session_regenerate_id(true)) {
    jsonResponse(['error' => 'Unable to renew your session. Please sign in again.'], 500);
}

$_SESSION['last_activity'] = time();
$timeoutSeconds = securityConfig()['session_timeout_minutes'] * 60;

auditLog(
    'SESSION_RENEWED',
    'Security',
    'Session',
    (string)$user['id'],
    'Session identifier rotated after the user chose to stay signed in.',
    'Success',
    [],
    $user
);

jsonResponse([
    'renewed' => true,
    'session_timeout_seconds' => $timeoutSeconds,
    'session_expires_at' => $_SESSION['last_activity'] + $timeoutSeconds,
    'server_time' => time(),
]);
