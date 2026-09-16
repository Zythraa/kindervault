<?php
require_once __DIR__ . '/../config.php';
requireAdministrator();

function managedUserById(int $id): ?array {
    $stmt = db()->prepare("\n        SELECT id, username, full_name, role, status, last_login_at, failed_login_count, locked_until,
               mfa_enabled, mfa_confirmed_at, created_at
        FROM users\n        WHERE id = ?\n        LIMIT 1\n    ");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function managedRoleNames(): array {
    return array_column(defaultRoleDefinitions(), 'name');
}

function managedRolePayloads(): array {
    $rows = db()->query('SELECT name, description, permissions_json, is_system, updated_at FROM roles ORDER BY id')->fetchAll();
    return array_map(function (array $row): array {
        $permissions = json_decode($row['permissions_json'], true);
        if (!is_array($permissions)) {
            $permissions = defaultRolePermissions($row['name']);
        }
        if ($row['name'] === 'Administrator') {
            $permissions = permissionKeys();
        } else {
            $permissions = array_values(array_intersect(permissionKeys(), $permissions));
        }
        return [
            'name' => $row['name'],
            'description' => $row['description'],
            'permissions' => $permissions,
            'is_system' => (bool)$row['is_system'],
            'updated_at' => $row['updated_at'],
        ];
    }, $rows);
}

function managedSelectedPermissions(mixed $value, string $role): array {
    if (!is_array($value)) {
        return $role === 'Administrator' ? permissionKeys() : rolePermissions($role);
    }
    return array_values(array_unique(array_intersect(permissionKeys(), $value)));
}

function managedUsername(string $username): string {
    $username = trim($username);
    if (!preg_match('/^[A-Za-z0-9._-]{3,50}$/', $username)) {
        jsonResponse(['error' => 'Username must use 3 to 50 letters, numbers, dots, underscores, or hyphens.'], 422);
    }
    return $username;
}

function managedName(string $fullName): string {
    $fullName = trim($fullName);
    if ($fullName === '' || strlen($fullName) > 100) {
        jsonResponse(['error' => 'Full name is required and must be 100 characters or fewer.'], 422);
    }
    return $fullName;
}

function managedStatus(mixed $status): string {
    return $status === 'Inactive' ? 'Inactive' : 'Active';
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $users = db()->query("\n        SELECT id, username, full_name, role, status, last_login_at, failed_login_count, locked_until,
               mfa_enabled, mfa_confirmed_at, created_at
        FROM users\n        ORDER BY CASE WHEN role = 'Administrator' THEN 0 ELSE 1 END, full_name, username\n    ")->fetchAll();
    jsonResponse([
        'users' => array_map(fn(array $user): array => publicUser($user, true), $users),
        'roles' => managedRolePayloads(),
        'permission_catalog' => permissionCatalog(),
    ]);
}

if (!in_array($method, ['POST', 'PUT'], true)) {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$actor = currentUser();

if ($method === 'POST' && ($data['action'] ?? 'create') === 'reset_password') {
    $id = (int)($data['id'] ?? 0);
    $target = managedUserById($id);
    if (!$target) {
        jsonResponse(['error' => 'User account not found.'], 404);
    }

    $password = (string)($data['password'] ?? '');
    $confirm = (string)($data['confirm'] ?? '');
    if ($password !== $confirm) {
        jsonResponse(['error' => 'Passwords do not match.'], 422);
    }
    $passwordError = passwordValidationError($password);
    if ($passwordError) {
        jsonResponse(['error' => $passwordError], 422);
    }

    $stmt = db()->prepare('UPDATE users SET password = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?');
    $stmt->execute([password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $id]);
    auditLog('PASSWORD_RESET', 'User Management', 'User', 'USER-' . $id, 'Reset password for user account.', 'Success', [], $actor);
    jsonResponse(['success' => true, 'user' => publicUser(managedUserById($id) ?: $target, true)]);
}

if ($method === 'POST') {
    $fullName = managedName((string)($data['full_name'] ?? ''));
    $username = managedUsername((string)($data['username'] ?? ''));
    $role = (string)($data['role'] ?? 'Authorized Staff');
    $status = managedStatus($data['status'] ?? 'Active');
    if (!in_array($role, managedRoleNames(), true)) {
        jsonResponse(['error' => 'Please select a valid role.'], 422);
    }
    if ($role === 'Administrator' && $status === 'Active' && !empty(securityConfig()['mfa_required_for_administrators'])) {
        jsonResponse(['error' => 'Create the account with a non-administrator role first, let the user enable MFA, then promote the account to Administrator.'], 422);
    }

    $password = (string)($data['password'] ?? '');
    $confirm = (string)($data['confirm'] ?? '');
    if ($password !== $confirm) {
        jsonResponse(['error' => 'Passwords do not match.'], 422);
    }
    $passwordError = passwordValidationError($password);
    if ($passwordError) {
        jsonResponse(['error' => $passwordError], 422);
    }

    $selectedPermissions = managedSelectedPermissions($data['permissions'] ?? null, $role);
    $pdo = db();
    try {
        $pdo->beginTransaction();
        $duplicate = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $duplicate->execute([$username]);
        if ($duplicate->fetch()) {
            $pdo->rollBack();
            jsonResponse(['error' => 'That username is already in use.'], 422);
        }

        $insert = $pdo->prepare("\n            INSERT INTO users (username, full_name, password, role, status)\n            VALUES (?, ?, ?, ?, ?)\n        ");
        $insert->execute([
            $username,
            $fullName,
            password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
            $role,
            $status,
        ]);
        $id = (int)$pdo->lastInsertId();
        saveUserPermissionOverrides($id, $role, $selectedPermissions);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonResponse(['error' => 'Unable to create the user account.'], 500);
    }

    $created = managedUserById($id);
    auditLog('USER_CREATED', 'User Management', 'User', 'USER-' . $id, 'Created a user account.', 'Success', [
        'role' => $role,
        'status' => $status,
    ], $actor);
    jsonResponse(['success' => true, 'user' => publicUser($created ?: [], true)], 201);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($data['id'] ?? 0);
$target = managedUserById($id);
if (!$target) {
    jsonResponse(['error' => 'User account not found.'], 404);
}

$fullName = managedName((string)($data['full_name'] ?? $target['full_name']));
$username = managedUsername((string)($data['username'] ?? $target['username']));
$role = (string)($data['role'] ?? $target['role']);
$status = managedStatus($data['status'] ?? $target['status']);
if (!in_array($role, managedRoleNames(), true)) {
    jsonResponse(['error' => 'Please select a valid role.'], 422);
}
if ($role === 'Administrator' && $status === 'Active' && !empty(securityConfig()['mfa_required_for_administrators']) && empty($target['mfa_enabled'])) {
    jsonResponse(['error' => 'This account must enable MFA before it can be an active Administrator while MFA enforcement is enabled.'], 422);
}

if ((int)$target['id'] === (int)$actor['id'] && ($role !== 'Administrator' || $status !== 'Active')) {
    jsonResponse(['error' => 'You cannot remove or deactivate your own administrator access.'], 422);
}

$removesLastAdministrator = $target['role'] === 'Administrator'
    && $target['status'] === 'Active'
    && ($role !== 'Administrator' || $status !== 'Active');
if ($removesLastAdministrator) {
    $activeAdministrators = (int)db()->query("SELECT COUNT(*) FROM users WHERE role='Administrator' AND status='Active'")->fetchColumn();
    if ($activeAdministrators <= 1) {
        jsonResponse(['error' => 'KinderVault must keep at least one active Administrator account.'], 422);
    }
}

$selectedPermissions = array_key_exists('permissions', $data)
    ? managedSelectedPermissions($data['permissions'], $role)
    : ($role === $target['role'] ? effectivePermissionsForUser($target) : rolePermissions($role));
$oldPermissions = effectivePermissionsForUser($target);
$pdo = db();
try {
    $pdo->beginTransaction();
    $duplicate = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1');
    $duplicate->execute([$username, $id]);
    if ($duplicate->fetch()) {
        $pdo->rollBack();
        jsonResponse(['error' => 'That username is already in use.'], 422);
    }

    $update = $pdo->prepare('UPDATE users SET full_name = ?, username = ?, role = ?, status = ? WHERE id = ?');
    $update->execute([$fullName, $username, $role, $status, $id]);
    saveUserPermissionOverrides($id, $role, $selectedPermissions);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['error' => 'Unable to update the user account.'], 500);
}

$updated = managedUserById($id);
$newPermissions = $updated ? effectivePermissionsForUser($updated) : $selectedPermissions;
$changedFields = safeAuditChanges($target, $updated ?: $target, [
    'full_name' => 'Full name',
    'username' => 'Username',
]);
if ($changedFields) {
    auditLog('USER_UPDATED', 'User Management', 'User', 'USER-' . $id, 'Updated user account details.', 'Success', ['changes' => $changedFields], $actor);
}
if ($target['role'] !== $role) {
    auditLog('ROLE_CHANGED', 'User Management', 'User', 'USER-' . $id, 'Changed a user role.', 'Success', [
        'changes' => [['field' => 'Role', 'before' => $target['role'], 'after' => $role]],
    ], $actor);
}
if ($target['status'] !== $status) {
    $action = $status === 'Active' ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED';
    auditLog($action, 'User Management', 'User', 'USER-' . $id, $status === 'Active' ? 'Activated a user account.' : 'Deactivated a user account.', 'Success', [], $actor);
}
$permissionDiff = permissionChanges($oldPermissions, $newPermissions);
if ($permissionDiff['added'] || $permissionDiff['removed']) {
    auditLog('PERMISSIONS_CHANGED', 'User Management', 'User', 'USER-' . $id, 'Updated individual user permissions.', 'Success', $permissionDiff, $actor);
}

if ((int)$id === (int)$actor['id']) {
    $_SESSION['full_name'] = $fullName;
    $_SESSION['username'] = $username;
    $_SESSION['role'] = $role;
}

jsonResponse(['success' => true, 'user' => publicUser($updated ?: $target, true)]);
