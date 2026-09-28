<?php
// ============================================================
// api/development.php  -  CRUD for KPM development borang
// ============================================================
require_once __DIR__ . '/../config.php';
requireLogin();

ensureDevelopmentSchema();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        requirePermission('development.view');
        $rows = db()->query('
            SELECT d.*, s.name AS student_name, s.class AS student_class
            FROM dev_records d
            LEFT JOIN students s ON s.id = d.student_id
            ORDER BY COALESCE(d.assessment_date, CONCAT(d.month, "-01")) DESC, d.id DESC
        ')->fetchAll();

        $records = array_map(function (array $row): array {
            $checklist = [];
            if (!empty($row['checklist_json'])) {
                $decoded = json_decode($row['checklist_json'], true);
                if (is_array($decoded)) {
                    $checklist = $decoded;
                }
            }
            $isLegacy = isLegacyDevelopmentRecord($row);

            return [
                'id' => (int)$row['id'],
                'student_id' => (int)$row['student_id'],
                'student_name' => $row['student_name'] ?? '',
                'student_class' => $row['student_class'] ?? '',
                'month' => $row['month'] ?? '',
                'assessment_date' => $row['assessment_date'] ?: (($row['month'] ?? '') ? $row['month'] . '-01' : null),
                'assessment_place' => $row['assessment_place'] ?? '',
                'assessor_name' => $row['assessor_name'] ?? '',
                'age_group' => isset($row['age_group']) ? (int)$row['age_group'] : null,
                'checklist' => $checklist,
                'record_type' => $isLegacy ? 'legacy' : 'kpm',
                'status' => $isLegacy ? 'Legacy' : 'Saved',
                'type' => $isLegacy ? 'Legacy Development' : 'KPM SSP',
                'is_legacy' => $isLegacy,
                'legacy_summary' => $isLegacy ? legacyDevelopmentSummary($row) : '',
                'date' => $row['assessment_date'] ?: (($row['month'] ?? '') ? $row['month'] . '-01' : null),
                'notes' => trim(($row['assessment_place'] ?? '') . ' ' . ($row['assessor_name'] ?? '')),
                'comment' => $row['comment'] ?? '',
                'bm_book_level' => isset($row['bm_book_level']) ? (int)$row['bm_book_level'] : 1,
                'bm_page' => isset($row['bm_page']) ? (int)$row['bm_page'] : 0,
                'bi_book_level' => isset($row['bi_book_level']) ? (int)$row['bi_book_level'] : 1,
                'bi_page' => isset($row['bi_page']) ? (int)$row['bi_page'] : 0,
            ];
        }, $rows);

        jsonResponse($records);

    case 'POST':
        requireCsrfToken();
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($d['student_id']) || empty($d['assessment_date'])) {
            jsonResponse(['error' => 'student_id and assessment_date are required.'], 422);
        }

        $student = db()->prepare('SELECT id, dob, class FROM students WHERE id = ?');
        $student->execute([(int)$d['student_id']]);
        $studentRow = $student->fetch();
        if (!$studentRow) {
            jsonResponse(['error' => 'Student not found.'], 404);
        }

        $ageGroup = detectAgeGroupFromClass($studentRow['class'] ?? '') ?? detectAgeGroup($studentRow['dob'] ?? null, $d['assessment_date']);
        if ($ageGroup === null) {
            jsonResponse(['error' => 'This borang is only for students aged 4 to 6 years old.'], 422);
        }

        $month = !empty($d['month']) ? $d['month'] : substr((string)$d['assessment_date'], 0, 7);
        $requestedId = (int)($d['id'] ?? 0);
        $existingId = null;
        $before = null;
        if ($requestedId > 0) {
            $existing = db()->prepare('SELECT id, record_type, assessment_date, bm_book_level, bm_page, bi_book_level, bi_page FROM dev_records WHERE id = ?');
            $existing->execute([$requestedId]);
            $before = $existing->fetch();
            if (!$before) {
                jsonResponse(['error' => 'Development record not found.'], 404);
            }
            if (($before['record_type'] ?? '') === 'legacy') {
                jsonResponse(['error' => 'Legacy development records are preserved as read-only history.'], 409);
            }
            $existingId = (int)$before['id'];
            requirePermission('development.update');

            $conflict = db()->prepare("SELECT id FROM dev_records WHERE student_id = ? AND month = ? AND record_type = 'kpm' AND id <> ? LIMIT 1");
            $conflict->execute([(int)$d['student_id'], $month, $existingId]);
            if ($conflictId = $conflict->fetchColumn()) {
                jsonResponse([
                    'error' => 'Another KPM development record already exists for this student and month.',
                    'code' => 'DEVELOPMENT_RECORD_EXISTS',
                    'existing_id' => (int)$conflictId,
                ], 409);
            }
        } else {
            requirePermission('development.create');
            $existing = db()->prepare("SELECT id, assessment_date, bm_book_level, bm_page, bi_book_level, bi_page FROM dev_records WHERE student_id = ? AND month = ? AND record_type = 'kpm'");
            $existing->execute([(int)$d['student_id'], $month]);
            $before = $existing->fetch();
            $existingId = $before ? (int)$before['id'] : null;
            if ($existingId) {
                jsonResponse([
                    'error' => 'A KPM development record already exists for this student and month. Open that record to edit it.',
                    'code' => 'DEVELOPMENT_RECORD_EXISTS',
                    'existing_id' => $existingId,
                ], 409);
            }
        }
        $checklistJson = json_encode($d['checklist'] ?? [], JSON_UNESCAPED_UNICODE);
        $comment = buildSummaryComment($d['checklist'] ?? []);

        if ($requestedId > 0) {
            $stmt = db()->prepare('
                UPDATE dev_records
                SET student_id=?, month=?, record_type=\'kpm\', assessment_date=?, assessment_place=?, assessor_name=?, age_group=?, checklist_json=?, comment=?, bm_book_level=?, bm_page=?, bi_book_level=?, bi_page=?
                WHERE id=?
            ');
            $stmt->execute([
                (int)$d['student_id'],
                $month,
                $d['assessment_date'],
                $d['assessment_place'] ?? '',
                $d['assessor_name'] ?? '',
                $ageGroup,
                $checklistJson,
                $comment,
                (int)($d['bm_book_level'] ?? 1),
                (int)($d['bm_page'] ?? 0),
                (int)($d['bi_book_level'] ?? 1),
                (int)($d['bi_page'] ?? 0),
                (int)$d['id'],
            ]);
            $savedId = $requestedId;
        } else {
            $stmt = db()->prepare('
                INSERT INTO dev_records (student_id, month, record_type, assessment_date, assessment_place, assessor_name, age_group, checklist_json, comment, bm_book_level, bm_page, bi_book_level, bi_page)
                VALUES (?, ?, \'kpm\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                (int)$d['student_id'],
                $month,
                $d['assessment_date'],
                $d['assessment_place'] ?? '',
                $d['assessor_name'] ?? '',
                $ageGroup,
                $checklistJson,
                $comment,
                (int)($d['bm_book_level'] ?? 1),
                (int)($d['bm_page'] ?? 0),
                (int)($d['bi_book_level'] ?? 1),
                (int)($d['bi_page'] ?? 0),
            ]);
            $savedId = (int)db()->lastInsertId();
        }

        $fetch = db()->prepare('
            SELECT d.*, s.name AS student_name, s.class AS student_class
            FROM dev_records d
            LEFT JOIN students s ON s.id = d.student_id
            WHERE d.id = ?
        ');
        $fetch->execute([$savedId]);
        $row = $fetch->fetch();
        $changes = safeAuditChanges($before ?: [], $row ?: [], [
            'assessment_date' => 'Assessment date',
            'bm_book_level' => 'Bahasa Melayu book level',
            'bm_page' => 'Bahasa Melayu page',
            'bi_book_level' => 'English book level',
            'bi_page' => 'English page',
        ]);
        auditLog($requestedId > 0 ? 'UPDATE' : 'CREATE', 'Student Development', 'Development Record', 'DEV-' . $savedId, $requestedId > 0 ? 'Updated student development record.' : 'Created student development record.', 'Success', $changes ? ['changes' => $changes] : []);

        jsonResponse([
            'id' => $savedId,
            'record' => [
                'id' => (int)$row['id'],
                'student_id' => (int)$row['student_id'],
                'student_name' => $row['student_name'] ?? '',
                'student_class' => $row['student_class'] ?? '',
                'month' => $row['month'] ?? '',
                'assessment_date' => $row['assessment_date'],
                'assessment_place' => $row['assessment_place'] ?? '',
                'assessor_name' => $row['assessor_name'] ?? '',
                'age_group' => (int)$row['age_group'],
                'checklist' => json_decode($row['checklist_json'] ?? '[]', true) ?: [],
                'record_type' => 'kpm',
                'status' => 'Saved',
                'type' => 'KPM SSP',
                'date' => $row['assessment_date'],
                'notes' => trim(($row['assessment_place'] ?? '') . ' ' . ($row['assessor_name'] ?? '')),
                'comment' => $row['comment'] ?? '',
                'bm_book_level' => isset($row['bm_book_level']) ? (int)$row['bm_book_level'] : 1,
                'bm_page' => isset($row['bm_page']) ? (int)$row['bm_page'] : 0,
                'bi_book_level' => isset($row['bi_book_level']) ? (int)$row['bi_book_level'] : 1,
                'bi_page' => isset($row['bi_page']) ? (int)$row['bi_page'] : 0,
            ],
        ], 201);

    case 'DELETE':
        requirePermission('development.delete');
        requireCsrfToken();
        if (!$id) {
            jsonResponse(['error' => 'ID required'], 400);
        }
        $existing = db()->prepare('SELECT id, student_id, month, record_type FROM dev_records WHERE id = ?');
        $existing->execute([$id]);
        $existingRecord = $existing->fetch();
        if (!$existingRecord) {
            jsonResponse(['error' => 'Development record not found.'], 404);
        }
        if (($existingRecord['record_type'] ?? '') === 'legacy') {
            jsonResponse(['error' => 'Legacy development records are preserved as read-only history.'], 409);
        }
        $stmt = db()->prepare('DELETE FROM dev_records WHERE id = ?');
        $stmt->execute([$id]);
        auditLog('DELETE', 'Student Development', 'Development Record', 'DEV-' . $id, 'Deleted student development record.', 'Success', [
            'student_id' => (int)$existingRecord['student_id'],
            'month' => (string)$existingRecord['month'],
        ]);
        jsonResponse(['success' => true]);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function ensureDevelopmentSchema(): void {
    $pdo = db();

    $columns = $pdo->query('SHOW COLUMNS FROM dev_records')->fetchAll(PDO::FETCH_COLUMN);
    $required = [
        'assessment_date' => "ALTER TABLE dev_records ADD COLUMN assessment_date DATE DEFAULT NULL AFTER month",
        'assessment_place' => "ALTER TABLE dev_records ADD COLUMN assessment_place VARCHAR(255) DEFAULT '' AFTER assessment_date",
        'assessor_name' => "ALTER TABLE dev_records ADD COLUMN assessor_name VARCHAR(120) DEFAULT '' AFTER assessment_place",
        'age_group' => "ALTER TABLE dev_records ADD COLUMN age_group TINYINT(1) DEFAULT NULL AFTER assessor_name",
        'checklist_json' => "ALTER TABLE dev_records ADD COLUMN checklist_json LONGTEXT DEFAULT NULL AFTER age_group",
        'record_type' => "ALTER TABLE dev_records ADD COLUMN record_type VARCHAR(20) NOT NULL DEFAULT 'kpm' AFTER checklist_json",
        'bm_book_level' => "ALTER TABLE dev_records ADD COLUMN bm_book_level TINYINT(1) DEFAULT 1 AFTER record_type",
        'bm_page' => "ALTER TABLE dev_records ADD COLUMN bm_page INT DEFAULT 0 AFTER bm_book_level",
        'bi_book_level' => "ALTER TABLE dev_records ADD COLUMN bi_book_level TINYINT(1) DEFAULT 1 AFTER bm_page",
        'bi_page' => "ALTER TABLE dev_records ADD COLUMN bi_page INT DEFAULT 0 AFTER bi_book_level",
    ];

    foreach ($required as $column => $sql) {
        if (!in_array($column, $columns, true)) {
            $pdo->exec($sql);
        }
    }

    if (in_array('reading', $columns, true) && in_array('writing', $columns, true) && in_array('behaviour', $columns, true)) {
        $pdo->exec("
            UPDATE dev_records
            SET record_type = 'legacy'
            WHERE COALESCE(checklist_json, '') = ''
              AND assessment_date IS NULL
              AND age_group IS NULL
              AND record_type <> 'legacy'
        ");
    }

    $indexes = $pdo->query('SHOW INDEX FROM dev_records')->fetchAll();
    $uniqueIndexes = [];
    foreach ($indexes as $index) {
        if ((int)$index['Non_unique'] === 0 && $index['Key_name'] !== 'PRIMARY') {
            $uniqueIndexes[$index['Key_name']][(int)$index['Seq_in_index']] = $index['Column_name'];
        }
    }

    $hasTypedUniqueIndex = false;
    $legacyMonthlyUniqueIndexes = [];
    foreach ($uniqueIndexes as $name => $columnsByOrder) {
        ksort($columnsByOrder);
        $indexColumns = array_values($columnsByOrder);
        if ($indexColumns === ['student_id', 'month', 'record_type']) {
            $hasTypedUniqueIndex = true;
        }
        if ($indexColumns === ['student_id', 'month']) {
            $legacyMonthlyUniqueIndexes[] = (string)$name;
        }
    }

    if ($legacyMonthlyUniqueIndexes) {
        $hasRetainedStudentIndex = false;
        foreach ($indexes as $index) {
            if ((int)$index['Seq_in_index'] === 1
                && $index['Column_name'] === 'student_id'
                && !in_array((string)$index['Key_name'], $legacyMonthlyUniqueIndexes, true)) {
                $hasRetainedStudentIndex = true;
                break;
            }
        }
        if (!$hasRetainedStudentIndex) {
            $pdo->exec('ALTER TABLE dev_records ADD INDEX idx_dev_records_student_id (student_id)');
        }
        foreach ($legacyMonthlyUniqueIndexes as $name) {
            $safeName = str_replace('`', '``', $name);
            $pdo->exec("ALTER TABLE dev_records DROP INDEX `{$safeName}`");
        }
    }

    if (!$hasTypedUniqueIndex) {
        $pdo->exec('ALTER TABLE dev_records ADD UNIQUE KEY uq_student_month_type (student_id, month, record_type)');
    }
}

function detectAgeGroup(?string $dob, string $assessmentDate): ?int {
    if (!$dob) {
        return null;
    }
    $dobDate = new DateTime($dob);
    $assessed = new DateTime($assessmentDate);
    $months = ((int)$assessed->format('Y') - (int)$dobDate->format('Y')) * 12;
    $months += ((int)$assessed->format('n') - (int)$dobDate->format('n'));
    if ((int)$assessed->format('j') < (int)$dobDate->format('j')) {
        $months--;
    }

    if ($months >= 48 && $months <= 59) {
        return 4;
    }
    if ($months >= 60 && $months <= 71) {
        return 5;
    }
    if ($months >= 72 && $months <= 83) {
        return 6;
    }
    return null;
}

function detectAgeGroupFromClass(string $className): ?int {
    $normalized = strtolower(trim($className));
    try {
        $stmt = db()->prepare('SELECT age_group FROM classes WHERE name = ? LIMIT 1');
        $stmt->execute([$className]);
        $storedAge = $stmt->fetchColumn();
        if ($storedAge !== false && (int)$storedAge >= 4 && (int)$storedAge <= 6) {
            return (int)$storedAge;
        }
    } catch (Throwable $e) {
        // Fall back to the legacy name mapping for older/incomplete databases.
    }
    $mapped = [
        'permata' => 4,
        'intelek' => 5,
        'ceria' => 6,
    ];
    if (isset($mapped[$normalized])) {
        return $mapped[$normalized];
    }
    if (preg_match('/\b([456])\b/i', $className, $m) || preg_match('/tadika\s*([456])/i', $className, $m)) {
        return (int)$m[1];
    }
    return null;
}

function buildSummaryComment(array $checklist): string {
    $achieved = 0;
    $notAchieved = 0;
    foreach ($checklist as $key => $value) {
        if (str_starts_with((string)$key, 'note_')) {
            continue;
        }
        if ($value === '/') {
            $achieved++;
        } elseif ($value === 'X') {
            $notAchieved++;
        }
    }
    return "Achieved: {$achieved}, Not achieved: {$notAchieved}";
}

function isLegacyDevelopmentRecord(array $row): bool {
    if (($row['record_type'] ?? '') === 'legacy') {
        return true;
    }
    return empty($row['checklist_json'])
        && empty($row['assessment_date'])
        && empty($row['age_group'])
        && (isset($row['reading']) || isset($row['writing']) || isset($row['behaviour']));
}

function legacyDevelopmentSummary(array $row): string {
    $parts = [];
    if (isset($row['reading'])) $parts[] = 'Reading ' . (int)$row['reading'] . '/5';
    if (isset($row['writing'])) $parts[] = 'Writing ' . (int)$row['writing'] . '/5';
    if (!empty($row['behaviour'])) $parts[] = (string)$row['behaviour'];
    return implode(' / ', $parts);
}
