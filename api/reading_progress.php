<?php
require_once __DIR__ . '/../config.php';
requireLogin();

ensureReadingProgressSchema();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        requirePermission('development.view');
        $rows = db()->query('
            SELECT r.*, s.name AS student_name, s.class AS student_class
            FROM reading_progress_records r
            LEFT JOIN students s ON s.id = r.student_id
            ORDER BY r.record_date DESC, r.id DESC
        ')->fetchAll();

        jsonResponse(array_map('mapReadingProgressRow', $rows));

    case 'POST':
        requireCsrfToken();
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($d['student_id']) || empty($d['record_date'])) {
            jsonResponse(['error' => 'student_id and record_date are required.'], 422);
        }

        $studentStmt = db()->prepare('SELECT id, name, class, status FROM students WHERE id = ?');
        $studentStmt->execute([(int)$d['student_id']]);
        $student = $studentStmt->fetch();
        if (!$student) {
            jsonResponse(['error' => 'Student not found.'], 404);
        }

        $quarter = !empty($d['quarter']) ? trim((string)$d['quarter']) : buildQuarter((string)$d['record_date']);
        $hasBm = !array_key_exists('has_bm', $d) || filter_var($d['has_bm'], FILTER_VALIDATE_BOOLEAN);
        $hasBi = !array_key_exists('has_bi', $d) || filter_var($d['has_bi'], FILTER_VALIDATE_BOOLEAN);
        if (!$hasBm && !$hasBi) {
            jsonResponse(['error' => 'Select at least one language to record reading progress.'], 422);
        }
        $requestedId = (int)($d['id'] ?? 0);
        $before = null;
        if ($requestedId > 0) {
            $existing = db()->prepare('SELECT id, quarter, record_date, has_bm, has_bi, bm_book_level, bm_page, bi_book_level, bi_page FROM reading_progress_records WHERE id = ?');
            $existing->execute([$requestedId]);
            $before = $existing->fetch();
            if (!$before) {
                jsonResponse(['error' => 'Reading progress record not found.'], 404);
            }
            requirePermission('development.update');
        } else {
            requirePermission('development.create');
        }

        if ($requestedId > 0) {
            $stmt = db()->prepare('
                UPDATE reading_progress_records
                SET student_id = ?, quarter = ?, record_date = ?, has_bm = ?, has_bi = ?, bm_book_level = ?, bm_page = ?, bi_book_level = ?, bi_page = ?, notes = ?
                WHERE id = ?
            ');
            $stmt->execute([
                (int)$d['student_id'],
                $quarter,
                $d['record_date'],
                $hasBm ? 1 : 0,
                $hasBi ? 1 : 0,
                normalizeLevel($d['bm_book_level'] ?? 1),
                normalizePage($d['bm_page'] ?? 0),
                normalizeLevel($d['bi_book_level'] ?? 1),
                normalizePage($d['bi_page'] ?? 0),
                trim((string)($d['notes'] ?? '')),
                $requestedId,
            ]);
            $savedId = $requestedId;
        } else {
            $stmt = db()->prepare('
                INSERT INTO reading_progress_records (student_id, quarter, record_date, has_bm, has_bi, bm_book_level, bm_page, bi_book_level, bi_page, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                (int)$d['student_id'],
                $quarter,
                $d['record_date'],
                $hasBm ? 1 : 0,
                $hasBi ? 1 : 0,
                normalizeLevel($d['bm_book_level'] ?? 1),
                normalizePage($d['bm_page'] ?? 0),
                normalizeLevel($d['bi_book_level'] ?? 1),
                normalizePage($d['bi_page'] ?? 0),
                trim((string)($d['notes'] ?? '')),
            ]);
            $savedId = (int)db()->lastInsertId();
        }

        $fetch = db()->prepare('
            SELECT r.*, s.name AS student_name, s.class AS student_class
            FROM reading_progress_records r
            LEFT JOIN students s ON s.id = r.student_id
            WHERE r.id = ?
        ');
        $fetch->execute([$savedId]);
        $savedRecord = $fetch->fetch() ?: [];
        $changes = safeAuditChanges($before ?: [], $savedRecord, [
            'quarter' => 'Quarter',
            'record_date' => 'Record date',
            'has_bm' => 'Bahasa Melayu recorded',
            'has_bi' => 'English recorded',
            'bm_book_level' => 'Bahasa Melayu book level',
            'bm_page' => 'Bahasa Melayu page',
            'bi_book_level' => 'English book level',
            'bi_page' => 'English page',
        ]);
        auditLog($requestedId > 0 ? 'UPDATE' : 'CREATE', 'Student Development', 'Reading Progress', 'READ-' . $savedId, $requestedId > 0 ? 'Updated reading progress record.' : 'Created reading progress record.', 'Success', $changes ? ['changes' => $changes] : []);

        jsonResponse([
            'id' => $savedId,
            'record' => mapReadingProgressRow($savedRecord),
        ], 201);

    case 'DELETE':
        requirePermission('development.delete');
        requireCsrfToken();
        if (!$id) {
            jsonResponse(['error' => 'ID required'], 400);
        }
        $existing = db()->prepare('SELECT id FROM reading_progress_records WHERE id = ?');
        $existing->execute([$id]);
        if (!$existing->fetch()) {
            jsonResponse(['error' => 'Reading progress record not found.'], 404);
        }
        $stmt = db()->prepare('DELETE FROM reading_progress_records WHERE id = ?');
        $stmt->execute([$id]);
        auditLog('DELETE', 'Student Development', 'Reading Progress', 'READ-' . $id, 'Deleted reading progress record.', 'Success');
        jsonResponse(['success' => true]);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function ensureReadingProgressSchema(): void {
    $pdo = db();
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS reading_progress_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            quarter VARCHAR(12) NOT NULL,
            record_date DATE NOT NULL,
            has_bm TINYINT(1) NOT NULL DEFAULT 1,
            has_bi TINYINT(1) NOT NULL DEFAULT 1,
            bm_book_level TINYINT(1) NOT NULL DEFAULT 1,
            bm_page INT NOT NULL DEFAULT 0,
            bi_book_level TINYINT(1) NOT NULL DEFAULT 1,
            bi_page INT NOT NULL DEFAULT 0,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_student_quarter (student_id, quarter),
            INDEX idx_record_date (record_date),
            CONSTRAINT fk_reading_progress_student
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ');

    $columns = $pdo->query('SHOW COLUMNS FROM reading_progress_records')->fetchAll(PDO::FETCH_COLUMN);
    $requiredColumns = [
        'has_bm' => 'ALTER TABLE reading_progress_records ADD COLUMN has_bm TINYINT(1) NOT NULL DEFAULT 1 AFTER record_date',
        'has_bi' => 'ALTER TABLE reading_progress_records ADD COLUMN has_bi TINYINT(1) NOT NULL DEFAULT 1 AFTER has_bm',
    ];
    foreach ($requiredColumns as $column => $sql) {
        if (!in_array($column, $columns, true)) {
            $pdo->exec($sql);
        }
    }

    $hasForeignKey = $pdo->query("\n        SELECT 1\n        FROM information_schema.KEY_COLUMN_USAGE\n        WHERE CONSTRAINT_SCHEMA = DATABASE()\n          AND TABLE_NAME = 'reading_progress_records'\n          AND COLUMN_NAME = 'student_id'\n          AND REFERENCED_TABLE_NAME = 'students'\n        LIMIT 1\n    ")->fetchColumn();
    if (!$hasForeignKey) {
        $orphanCount = (int)$pdo->query("\n            SELECT COUNT(*)\n            FROM reading_progress_records r\n            LEFT JOIN students s ON s.id = r.student_id\n            WHERE s.id IS NULL\n        ")->fetchColumn();
        if ($orphanCount === 0) {
            $pdo->exec('ALTER TABLE reading_progress_records ADD CONSTRAINT fk_reading_progress_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE');
        }
    }
}

function mapReadingProgressRow(array $row): array {
    return [
        'id' => (int)($row['id'] ?? 0),
        'student_id' => (int)($row['student_id'] ?? 0),
        'student_name' => $row['student_name'] ?? '',
        'student_class' => $row['student_class'] ?? '',
        'quarter' => $row['quarter'] ?? '',
        'record_date' => $row['record_date'] ?? '',
        'has_bm' => !array_key_exists('has_bm', $row) || (bool)$row['has_bm'],
        'has_bi' => !array_key_exists('has_bi', $row) || (bool)$row['has_bi'],
        'bm_book_level' => (int)($row['bm_book_level'] ?? 1),
        'bm_page' => (int)($row['bm_page'] ?? 0),
        'bi_book_level' => (int)($row['bi_book_level'] ?? 1),
        'bi_page' => (int)($row['bi_page'] ?? 0),
        'notes' => $row['notes'] ?? '',
    ];
}

function buildQuarter(string $date): string {
    try {
        $dt = new DateTime($date);
    } catch (Throwable $e) {
        return '';
    }
    $month = (int)$dt->format('n');
    $quarter = (int)ceil($month / 3);
    return $dt->format('Y') . '-Q' . $quarter;
}

function normalizeLevel($value): int {
    $level = (int)$value;
    if ($level < 1) return 1;
    if ($level > 8) return 8;
    return $level;
}

function normalizePage($value): int {
    $page = (int)$value;
    return $page < 0 ? 0 : $page;
}
