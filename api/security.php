<?php
require_once __DIR__ . '/../config.php';
requireAdministrator();

function securityApiConfig(array $config): array {
    if (!chatbotFeatureAvailable()) unset($config['chatbot_enabled']);
    return $config;
}

function mfaAdministrationSummary(): array {
    $row = db()->query("\n        SELECT
            COUNT(*) AS active_administrators,
            SUM(CASE WHEN mfa_enabled = 0 OR mfa_secret_encrypted IS NULL THEN 1 ELSE 0 END) AS unenrolled_administrators
        FROM users
        WHERE role = 'Administrator' AND status = 'Active'\n    ")->fetch() ?: [];
    $available = mfaEncryptionAvailable();
    $unenrolled = (int)($row['unenrolled_administrators'] ?? 0);

    return [
        'available' => $available,
        'active_administrators' => (int)($row['active_administrators'] ?? 0),
        'unenrolled_administrators' => $unenrolled,
        'status' => !$available
            ? 'MFA is unavailable because KinderVault could not prepare its local encryption key.'
            : ($unenrolled > 0
                ? 'Each active Administrator must enable MFA before it can be required for all Administrators.'
                : 'All active Administrator accounts are ready for MFA enforcement.'),
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    jsonResponse([
        'security_config' => securityApiConfig(securityConfig()),
        'mfa' => mfaAdministrationSummary(),
    ]);
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'], true)) {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$before = securityConfig();
$config = normalizeSecurityConfig(is_array($data['security_config'] ?? null) ? $data['security_config'] : $data);
$mfaSummary = mfaAdministrationSummary();
if (!empty($config['mfa_required_for_administrators']) && !$mfaSummary['available']) {
    jsonResponse(['error' => 'MFA cannot be required until KinderVault can access its local encryption key.'], 422);
}
if (!empty($config['mfa_required_for_administrators']) && $mfaSummary['unenrolled_administrators'] > 0) {
    jsonResponse(['error' => 'Every active Administrator must enable MFA before you can require it system-wide.'], 422);
}
saveAppSetting('security_config', $config);

$changes = safeAuditChanges($before, $config, [
    'session_timeout_minutes' => 'Session timeout',
    'password_min_length' => 'Minimum password length',
    'require_mixed_case' => 'Mixed-case password rule',
    'require_number' => 'Number password rule',
    'max_failed_logins' => 'Maximum failed logins',
    'lockout_minutes' => 'Account lockout duration',
    'mfa_required_for_administrators' => 'Require MFA for Administrators',
    'chatbot_enabled' => 'KinderVault Chatbot',
]);
if ($changes) {
    auditLog('SECURITY_SETTINGS_CHANGED', 'Security', 'Security Settings', 'security_config', 'Updated security settings.', 'Success', ['changes' => $changes]);
}

jsonResponse(['success' => true, 'security_config' => securityApiConfig($config), 'mfa' => mfaAdministrationSummary()]);
