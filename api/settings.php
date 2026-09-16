<?php
// ============================================================
// api/settings.php - General Settings for the signed-in account
// ============================================================
require_once __DIR__ . '/../config.php';
requirePermission('settings.access');

$currentUser = currentUser();
if (!$currentUser) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    jsonResponse([
        'fee_config' => isAdministrator() ? appSetting('fee_config') : null,
        'full_name' => $currentUser['full_name'],
        'username' => $currentUser['username'],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$fullName = trim((string)($data['full_name'] ?? ''));
$password = (string)($data['password'] ?? '');
$confirm = (string)($data['confirm'] ?? '');
$feeConfig = $data['fee_config'] ?? null;

if ($fullName === '' || strlen($fullName) > 100) {
    jsonResponse(['error' => 'Full name is required and must be 100 characters or fewer.'], 422);
}
if ($password !== $confirm) {
    jsonResponse(['error' => 'Passwords do not match.'], 422);
}
if ($password !== '') {
    $passwordError = passwordValidationError($password);
    if ($passwordError) {
        jsonResponse(['error' => $passwordError], 422);
    }
}
if ($feeConfig !== null && !isAdministrator()) {
    denyAccess('Only an Administrator can update the fee structure.');
}

$pdo = db();
if ($password !== '') {
    $stmt = $pdo->prepare('UPDATE users SET full_name = ?, password = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?');
    $stmt->execute([$fullName, password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $currentUser['id']]);
} else {
    $stmt = $pdo->prepare('UPDATE users SET full_name = ? WHERE id = ?');
    $stmt->execute([$fullName, $currentUser['id']]);
}

if ($feeConfig !== null) {
    saveAppSetting('fee_config', $feeConfig);
}

if ($currentUser['full_name'] !== $fullName) {
    auditLog('USER_UPDATED', 'Settings', 'User', 'USER-' . $currentUser['id'], 'Updated own account name.', 'Success', [
        'changes' => [['field' => 'Full name', 'before' => $currentUser['full_name'], 'after' => $fullName]],
    ]);
}
if ($password !== '') {
    auditLog('PASSWORD_CHANGED', 'Security', 'User', 'USER-' . $currentUser['id'], 'Changed own password.', 'Success');
}
if ($feeConfig !== null) {
    auditLog('FEE_SETTINGS_CHANGED', 'Settings', 'Fee Structure', 'fee_config', 'Updated the fee structure.', 'Success');
}

$_SESSION['full_name'] = $fullName;
jsonResponse(['success' => true, 'full_name' => $fullName]);
