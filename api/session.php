<?php
require_once __DIR__ . '/../config.php';
requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$user = currentUser();
if (!$user) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$timeoutSeconds = securityConfig()['session_timeout_minutes'] * 60;
$lastActivity = (int)($_SESSION['last_activity'] ?? time());

jsonResponse([
    'user' => publicUser($user),
    'locale' => currentLocale(),
    'permissions' => effectivePermissionsForUser($user),
    'is_administrator' => isAdministrator(),
    'fee_config' => appSetting('fee_config'),
    'session_timeout_seconds' => $timeoutSeconds,
    'session_expires_at' => $lastActivity + $timeoutSeconds,
    'server_time' => time(),
]);
