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
        // The application supports one class per age group. Keep the oldest
        // row as the canonical record so legacy duplicate rows cannot leak
        // into dropdowns or the Classes page while they are being cleaned up.
        $rows = db()->query(<<<'SQL'
            SELECT c.*
            FROM classes c
            INNER JOIN (
                SELECT age_group, MIN(id) AS canonical_id
                FROM classes
                WHERE age_group IN (4, 5, 6)
                GROUP BY age_group
            ) canonical ON canonical.canonical_id = c.id
            ORDER BY c.age_group
        SQL)->fetchAll();
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
        $duplicate = $pdo->prepare('SELECT id, name, age_group FROM classes WHERE name = ? AND id <> ?');
        $duplicate->execute([$name, $id]);
        $legacyDuplicates = [];
        foreach ($duplicate->fetchAll() as $duplicateRow) {
            // A stale duplicate with the same age group can be retired safely
            // when an administrator reuses the original class name. A name
            // used by another age group must still be rejected.
            if ((int)($duplicateRow['age_group'] ?? 0) === (int)($current['age_group'] ?? 0)
                && (int)$duplicateRow['id'] > (int)$current['id']) {
                $legacyDuplicates[] = $duplicateRow;
                continue;
            }
            jsonResponse(['error' => 'That class name is already in use.'], 422);
        }
        if ($current['name'] === $name) jsonResponse(['success' => true, 'class' => $current]);
        $pdo->beginTransaction();
        try {
            foreach ($legacyDuplicates as $legacyDuplicate) {
                $moveLegacyStudents = $pdo->prepare('UPDATE students SET class = ? WHERE TRIM(class) = ?');
                $moveLegacyStudents->execute([$name, $legacyDuplicate['name']]);
                $removeLegacyClass = $pdo->prepare('DELETE FROM classes WHERE id = ?');
                $removeLegacyClass->execute([(int)$legacyDuplicate['id']]);
            }
            $updateClass = $pdo->prepare('UPDATE classes SET name = ? WHERE id = ?');
            $updateClass->execute([$name, $id]);
            $ageGroup = (int)($current['age_group'] ?? 0);
            if ($ageGroup >= 4 && $ageGroup <= 6) {
                // Keep every student in the same age-group class, including
                // legacy rows whose class value still uses a retired name.
                $updateStudents = $pdo->prepare('UPDATE students SET class = ? WHERE TRIM(class) = ? OR CAST(program_age AS UNSIGNED) = ?');
                $updateStudents->execute([$name, $current['name'], $ageGroup]);
            } else {
                $updateStudents = $pdo->prepare('UPDATE students SET class = ? WHERE class = ?');
                $updateStudents->execute([$name, $current['name']]);
            }
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
