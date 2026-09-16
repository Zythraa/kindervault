<?php
require_once __DIR__ . '/../config.php';
requireAdministrator();

function roleApiPayloads(): array {
    $rows = db()->query('SELECT name, description, permissions_json, is_system, updated_at FROM roles ORDER BY id')->fetchAll();
    return array_map(function (array $row): array {
        $permissions = json_decode($row['permissions_json'], true);
        if (!is_array($permissions)) {
            $permissions = defaultRolePermissions($row['name']);
        }
        return [
            'name' => $row['name'],
            'description' => $row['description'],
            'permissions' => $row['name'] === 'Administrator'
                ? permissionKeys()
                : array_values(array_intersect(permissionKeys(), $permissions)),
            'is_system' => (bool)$row['is_system'],
            'updated_at' => $row['updated_at'],
        ];
    }, $rows);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    jsonResponse(['roles' => roleApiPayloads(), 'permission_catalog' => permissionCatalog()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$role = (string)($data['role'] ?? '');
$managedRoles = array_column(defaultRoleDefinitions(), 'name');
if (!in_array($role, $managedRoles, true)) {
    jsonResponse(['error' => 'Role not found.'], 404);
}
if ($role === 'Administrator') {
    jsonResponse(['error' => 'Administrator access is always full and cannot be restricted.'], 422);
}
if (!isset($data['permissions']) || !is_array($data['permissions'])) {
    jsonResponse(['error' => 'Permissions are required.'], 422);
}

$permissions = array_values(array_unique(array_intersect(permissionKeys(), $data['permissions'])));
$before = rolePermissions($role);
$stmt = db()->prepare('UPDATE roles SET permissions_json = ? WHERE name = ?');
$stmt->execute([json_encode($permissions, JSON_UNESCAPED_UNICODE), $role]);
$diff = permissionChanges($before, $permissions);
if ($diff['added'] || $diff['removed']) {
    auditLog('ROLE_PERMISSIONS_CHANGED', 'Roles & Permissions', 'Role', 'ROLE-' . $role, 'Updated default role permissions.', 'Success', $diff);
}

jsonResponse(['success' => true, 'roles' => roleApiPayloads()]);
