<?php
// ============================================================
// api/classes.php  –  CRUD for classes
// GET    /api/classes.php           → list all classes
// POST   /api/classes.php           → create new class
// PUT    /api/classes.php?id=N      → update class
// DELETE /api/classes.php?id=N      → delete class
// ============================================================
require_once __DIR__ . '/../config.php';
requireLogin();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        requirePermission('classes.view');
        $rows = db()->query('SELECT * FROM classes ORDER BY COALESCE(age_group, 99), name')->fetchAll();
        jsonResponse($rows);

    case 'POST':
        jsonResponse(['error' => 'Only the existing age-group class names can be changed.'], 405);

    case 'PUT':
        requirePermission('settings.access');
        requireCsrfToken();
        if (!$id) jsonResponse(['error' => 'Class ID required.'], 400);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '' || strlen($name) > 80 || preg_match('/[<>]/', $name)) {
            jsonResponse(['error' => 'Class name is required and must be 80 characters or fewer.'], 422);
        }
        $pdo = db();
        $currentStmt = $pdo->prepare('SELECT id, name, age_group FROM classes WHERE id = ? LIMIT 1');
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) jsonResponse(['error' => 'Class not found.'], 404);
        $duplicate = $pdo->prepare('SELECT id FROM classes WHERE name = ? AND id <> ? LIMIT 1');
        $duplicate->execute([$name, $id]);
        if ($duplicate->fetchColumn()) jsonResponse(['error' => 'That class name is already in use.'], 422);
        if ($current['name'] === $name) jsonResponse(['success' => true, 'class' => $current]);
        $pdo->beginTransaction();
        try {
            $updateClass = $pdo->prepare('UPDATE classes SET name = ? WHERE id = ?');
            $updateClass->execute([$name, $id]);
            $updateStudents = $pdo->prepare('UPDATE students SET class = ? WHERE class = ?');
            $updateStudents->execute([$name, $current['name']]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('KinderVault class rename failed: ' . $e->getMessage());
            jsonResponse(['error' => 'Unable to rename the class.'], 500);
        }
        auditLog('CLASS_RENAMED', 'Settings', 'Class', 'CLASS-' . $id, 'Renamed a class and updated assigned students.', 'Success', [
            'changes' => [['field' => 'Class name', 'before' => $current['name'], 'after' => $name]],
            'age_group' => (int)($current['age_group'] ?? 0),
        ]);
        $fetch = $pdo->prepare('SELECT * FROM classes WHERE id = ?');
        $fetch->execute([$id]);
        jsonResponse(['success' => true, 'class' => $fetch->fetch()]);

    case 'DELETE':
        jsonResponse(['error' => 'Age-group classes cannot be deleted.'], 405);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
