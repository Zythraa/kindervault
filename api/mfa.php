<?php
require_once __DIR__ . '/../config.php';
requireLogin();

$current = currentUser();
if (!$current) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

function mfaApiStatus(array $user): array {
    $available = mfaEncryptionAvailable();
    return array_merge(mfaStatusForUser($user), [
        'available' => $available,
        'issuer' => MFA_ISSUER,
        'status' => $available
            ? (!empty($user['mfa_enabled']) ? 'Multi-factor authentication is enabled for this account.' : 'Protect this account with an authenticator app and recovery codes.')
            : 'Multi-factor authentication is unavailable because the local encryption key could not be prepared.',
    ]);
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $user = mfaUserById((int)$current['id']) ?: $current;
    jsonResponse(['mfa' => mfaApiStatus($user)]);
}

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$action = (string)($data['action'] ?? '');

if ($action === 'cancel_enrollment') {
    unset($_SESSION['mfa_enrollment_secret'], $_SESSION['mfa_enrollment_expires_at']);
    jsonResponse(['success' => true]);
}

if (!mfaEncryptionAvailable()) {
    jsonResponse(['error' => 'Multi-factor authentication is unavailable because KinderVault could not access its encryption key.'], 503);
}

$user = mfaUserById((int)$current['id']);
if (!$user || ($user['status'] ?? '') !== 'Active') {
    jsonResponse(['error' => 'Your account is no longer available.'], 401);
}

if ($action === 'begin_enrollment') {
    if (!empty($user['mfa_enabled'])) {
        jsonResponse(['error' => 'Multi-factor authentication is already enabled for this account.'], 409);
    }

    $secret = generateMfaSecret();
    $_SESSION['mfa_enrollment_secret'] = $secret;
    $_SESSION['mfa_enrollment_expires_at'] = time() + 600;
    jsonResponse([
        'secret' => $secret,
        'issuer' => MFA_ISSUER,
        'account_name' => $user['username'],
        'provisioning_uri' => mfaProvisioningUri($user['username'], $secret),
        'expires_at' => $_SESSION['mfa_enrollment_expires_at'],
    ]);
}

if ($action === 'confirm_enrollment') {
    $secret = $_SESSION['mfa_enrollment_secret'] ?? null;
    $expiresAt = (int)($_SESSION['mfa_enrollment_expires_at'] ?? 0);
    if (!is_string($secret) || $expiresAt < time()) {
        unset($_SESSION['mfa_enrollment_secret'], $_SESSION['mfa_enrollment_expires_at']);
        jsonResponse(['error' => 'Your MFA setup session has expired. Start setup again.'], 422);
    }

    $counter = mfaMatchedTotpCounter($secret, (string)($data['code'] ?? ''));
    if ($counter === null) {
        jsonResponse(['error' => 'Enter the current six-digit code from your authenticator app.'], 422);
    }

    $recoveryCodes = generateMfaRecoveryCodes();
    $stmt = db()->prepare("\n        UPDATE users\n        SET mfa_enabled = 1,
            mfa_secret_encrypted = ?,
            mfa_recovery_codes_json = ?,
            mfa_confirmed_at = NOW(),
            mfa_last_used_counter = ?
        WHERE id = ?\n    ");
    $stmt->execute([
        encryptMfaSecret($secret),
        mfaRecoveryCodePayload($recoveryCodes),
        $counter,
        (int)$user['id'],
    ]);
    unset($_SESSION['mfa_enrollment_secret'], $_SESSION['mfa_enrollment_expires_at']);

    $updated = mfaUserById((int)$user['id']) ?: $user;
    auditLog('MFA_ENABLED', 'Security', 'User', 'USER-' . $user['id'], 'Enabled multi-factor authentication for the account.', 'Success', [], $user);
    jsonResponse([
        'success' => true,
        'mfa' => mfaApiStatus($updated),
        'recovery_codes' => $recoveryCodes,
    ]);
}

if ($action === 'disable') {
    if (empty($user['mfa_enabled'])) {
        jsonResponse(['error' => 'Multi-factor authentication is not enabled for this account.'], 422);
    }
    if (($user['role'] ?? '') === 'Administrator' && !empty(securityConfig()['mfa_required_for_administrators'])) {
        jsonResponse(['error' => 'MFA is currently required for Administrators. Turn off the enforcement setting before disabling it on this account.'], 422);
    }
    if (!password_verify((string)($data['password'] ?? ''), $user['password'])) {
        jsonResponse(['error' => 'Your current password is incorrect.'], 422);
    }
    if (!verifyMfaTotpForUser($user, (string)($data['code'] ?? ''))) {
        jsonResponse(['error' => 'Enter a current code from your authenticator app.'], 422);
    }

    $stmt = db()->prepare("\n        UPDATE users\n        SET mfa_enabled = 0,
            mfa_secret_encrypted = NULL,
            mfa_recovery_codes_json = NULL,
            mfa_confirmed_at = NULL,
            mfa_last_used_counter = NULL
        WHERE id = ?\n    ");
    $stmt->execute([(int)$user['id']]);
    auditLog('MFA_DISABLED', 'Security', 'User', 'USER-' . $user['id'], 'Disabled multi-factor authentication for the account.', 'Success', [], $user);
    jsonResponse(['success' => true, 'mfa' => mfaApiStatus(mfaUserById((int)$user['id']) ?: $user)]);
}

if ($action === 'regenerate_recovery_codes') {
    if (empty($user['mfa_enabled'])) {
        jsonResponse(['error' => 'Enable multi-factor authentication before generating recovery codes.'], 422);
    }
    if (!password_verify((string)($data['password'] ?? ''), $user['password'])) {
        jsonResponse(['error' => 'Your current password is incorrect.'], 422);
    }
    if (!verifyMfaTotpForUser($user, (string)($data['code'] ?? ''))) {
        jsonResponse(['error' => 'Enter a current code from your authenticator app.'], 422);
    }

    $recoveryCodes = generateMfaRecoveryCodes();
    $stmt = db()->prepare('UPDATE users SET mfa_recovery_codes_json = ? WHERE id = ?');
    $stmt->execute([mfaRecoveryCodePayload($recoveryCodes), (int)$user['id']]);
    auditLog('MFA_RECOVERY_CODES_REGENERATED', 'Security', 'User', 'USER-' . $user['id'], 'Regenerated MFA recovery codes for the account.', 'Success', [], $user);
    jsonResponse([
        'success' => true,
        'mfa' => mfaApiStatus(mfaUserById((int)$user['id']) ?: $user),
        'recovery_codes' => $recoveryCodes,
    ]);
}

jsonResponse(['error' => 'Unknown MFA action.'], 422);
