<?php
// ============================================================
// api/students.php  –  CRUD for students
// GET    /api/students.php           → list all
// GET    /api/students.php?id=N      → single record
// POST   /api/students.php           → create  (JSON body)
// PUT    /api/students.php?id=N      → update  (JSON body)
// DELETE /api/students.php?id=N      → delete
// ============================================================
require_once __DIR__ . '/../config.php';
requireLogin();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {

    // ── LIST / SINGLE ──────────────────────────────────────
    case 'GET':
        requirePermission('students.view');
        if ($id) {
            $stmt = db()->prepare('SELECT * FROM students WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            $row ? jsonResponse($row) : jsonResponse(['error' => 'Not found'], 404);
        } else {
            $rows = db()->query('SELECT * FROM students ORDER BY id')->fetchAll();
            jsonResponse($rows);
        }

    // ── CREATE ─────────────────────────────────────────────
    case 'POST':
        requirePermission('students.create');
        requireCsrfToken();
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        validateStudent($d);

        $pdo = db();
        $pdo->beginTransaction();
        try {
        // Use the database-generated ID as the readable code suffix. This
        // remains unique after deletions and under concurrent submissions.
        $temporaryCode = 'TMP-' . bin2hex(random_bytes(8));
        $stmt = $pdo->prepare('
            INSERT INTO students (code,name,ic,birth_cert,gender,dob,child_position,program_age,monthly_package,wants_uniform,wants_sports_uniform,wants_tudung,wants_iqra,class,parent,phone,address,father_name,father_ic,father_address,father_job,father_employer,father_phone,mother_name,mother_ic,mother_address,mother_job,mother_employer,mother_phone,fee,status,enrol)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ');
        $stmt->execute([
            $temporaryCode,
            $d['name'], $d['ic'] ?? '', $d['birth_cert'] ?? '', $d['gender'] ?? 'M',
            $d['dob'] ?: null, $d['child_position'] ?? '', $d['program_age'] ?? '', $d['monthly_package'] ?? 'A', (int)($d['wants_uniform'] ?? 1), (int)($d['wants_sports_uniform'] ?? 1), (int)($d['wants_tudung'] ?? 1), (int)($d['wants_iqra'] ?? 0), $d['class'], $d['parent'], $d['phone'] ?? '',
            $d['address'] ?? '', $d['father_name'] ?? '', $d['father_ic'] ?? '', $d['father_address'] ?? '',
            $d['father_job'] ?? '', $d['father_employer'] ?? '', $d['father_phone'] ?? '',
            $d['mother_name'] ?? '', $d['mother_ic'] ?? '', $d['mother_address'] ?? '', $d['mother_job'] ?? '',
            $d['mother_employer'] ?? '', $d['mother_phone'] ?? '', (float)($d['fee'] ?? 150),
            $d['status'] ?? 'Active', $d['enrol'] ?: null,
        ]);
        $newId = (int)$pdo->lastInsertId();
        $code = 'STU-' . date('Y') . '-' . str_pad((string)$newId, 3, '0', STR_PAD_LEFT);
        $setCode = $pdo->prepare('UPDATE students SET code = ? WHERE id = ?');
        $setCode->execute([$code, $newId]);
        $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('KinderVault student creation failed: ' . $e->getMessage());
            jsonResponse(['error' => 'Unable to create the student record.'], 500);
        }
        $stmt2 = $pdo->prepare('SELECT * FROM students WHERE id = ?');
        $stmt2->execute([$newId]);
        $created = $stmt2->fetch();
        auditLog('CREATE', 'Student Management', 'Student', 'STU-' . $newId, 'Created student record.', 'Success');
        jsonResponse($created, 201);

    // ── UPDATE ─────────────────────────────────────────────
    case 'PUT':
        requirePermission('students.update');
        requireCsrfToken();
        if (!$id) jsonResponse(['error' => 'ID required'], 400);
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        validateStudent($d);

        $beforeStmt = db()->prepare('SELECT class, status FROM students WHERE id = ?');
        $beforeStmt->execute([$id]);
        $before = $beforeStmt->fetch();
        if (!$before) jsonResponse(['error' => 'Student not found'], 404);

        $stmt = db()->prepare('
            UPDATE students
            SET name=?,ic=?,birth_cert=?,gender=?,dob=?,child_position=?,program_age=?,monthly_package=?,wants_uniform=?,wants_sports_uniform=?,wants_tudung=?,wants_iqra=?,class=?,parent=?,phone=?,address=?,father_name=?,father_ic=?,father_address=?,father_job=?,father_employer=?,father_phone=?,mother_name=?,mother_ic=?,mother_address=?,mother_job=?,mother_employer=?,mother_phone=?,fee=?,status=?,enrol=?
            WHERE id=?
        ');
        $stmt->execute([
            $d['name'], $d['ic'] ?? '', $d['birth_cert'] ?? '', $d['gender'] ?? 'M',
            $d['dob'] ?: null, $d['child_position'] ?? '', $d['program_age'] ?? '', $d['monthly_package'] ?? 'A', (int)($d['wants_uniform'] ?? 1), (int)($d['wants_sports_uniform'] ?? 1), (int)($d['wants_tudung'] ?? 1), (int)($d['wants_iqra'] ?? 0), $d['class'], $d['parent'], $d['phone'] ?? '',
            $d['address'] ?? '', $d['father_name'] ?? '', $d['father_ic'] ?? '', $d['father_address'] ?? '',
            $d['father_job'] ?? '', $d['father_employer'] ?? '', $d['father_phone'] ?? '',
            $d['mother_name'] ?? '', $d['mother_ic'] ?? '', $d['mother_address'] ?? '', $d['mother_job'] ?? '',
            $d['mother_employer'] ?? '', $d['mother_phone'] ?? '', (float)($d['fee'] ?? 150),
            $d['status'] ?? 'Active', $d['enrol'] ?: null, $id,
        ]);
        $stmt2 = db()->prepare('SELECT * FROM students WHERE id = ?');
        $stmt2->execute([$id]);
        $updated = $stmt2->fetch();
        $changes = safeAuditChanges($before, $updated ?: [], [
            'class' => 'Class',
            'status' => 'Status',
        ]);
        $description = ($before['class'] ?? '') !== ($updated['class'] ?? '')
            ? 'Transferred student record to a different class.'
            : 'Updated student record.';
        auditLog('UPDATE', 'Student Management', 'Student', 'STU-' . $id, $description, 'Success', $changes ? ['changes' => $changes] : []);
        jsonResponse($updated);

    // ── DELETE ─────────────────────────────────────────────
    case 'DELETE':
        requirePermission('students.delete');
        requireCsrfToken();
        if (!$id) jsonResponse(['error' => 'ID required'], 400);
        $exists = db()->prepare('SELECT id FROM students WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) jsonResponse(['error' => 'Student not found'], 404);
        $stmt = db()->prepare('DELETE FROM students WHERE id = ?');
        $stmt->execute([$id]);
        auditLog('DELETE', 'Student Management', 'Student', 'STU-' . $id, 'Deleted student record.', 'Success');
        jsonResponse(['success' => true]);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function validateStudent(array $d): void {
    $name = trim((string)($d['name'] ?? ''));
    $hasGuardian = trim((string)($d['parent'] ?? '')) !== '' || trim((string)($d['father_name'] ?? '')) !== '' || trim((string)($d['mother_name'] ?? '')) !== '';
    if ($name === '' || empty($d['dob']) || empty($d['class']) || !$hasGuardian) {
        jsonResponse(['error' => 'Name, date of birth, class and at least one parent/guardian are required.'], 422);
    }
    if (strlen($name) > 120 || preg_match('/[<>]/', $name)) {
        jsonResponse(['error' => 'Student name must be 120 characters or fewer and cannot contain HTML brackets.'], 422);
    }
    $date = DateTime::createFromFormat('!Y-m-d', (string)$d['dob']);
    if (!$date || $date->format('Y-m-d') !== $d['dob'] || $date > new DateTime('today')) {
        jsonResponse(['error' => 'Please enter a valid date of birth that is not in the future.'], 422);
    }
    $classes = db()->query('SELECT name FROM classes')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array((string)$d['class'], $classes, true)) {
        jsonResponse(['error' => 'Please select a valid class.'], 422);
    }
    if (!in_array((string)($d['gender'] ?? 'M'), ['M', 'F'], true)
        || !in_array((string)($d['status'] ?? 'Active'), ['Active', 'Inactive', 'Graduated'], true)
        || !in_array((string)($d['monthly_package'] ?? 'A'), ['A', 'B', 'C'], true)) {
        jsonResponse(['error' => 'Please select valid student options.'], 422);
    }
    $fee = $d['fee'] ?? 150;
    if (!is_numeric($fee) || (float)$fee < 0 || (float)$fee > 999999.99) {
        jsonResponse(['error' => 'Please enter a valid fee amount.'], 422);
    }
}
