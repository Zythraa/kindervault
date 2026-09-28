<?php
// ============================================================
// api/payments.php  –  CRUD for payments
// GET    /api/payments.php           → list all (joined with student name)
// POST   /api/payments.php           → create + auto-generate receipt no.
// PUT    /api/payments.php?id=N      → update
// DELETE /api/payments.php?id=N      → delete
// ============================================================
require_once __DIR__ . '/../config.php';
requireLogin();

function generateReceiptNumber(int $anchorPaymentId): string {
    return 'RCP-' . date('Y') . '-' . str_pad((string)$anchorPaymentId, 5, '0', STR_PAD_LEFT);
}

function validatePaymentInput(array $data, bool $validateStudent = true): void {
    $studentId = (int)($data['student_id'] ?? 0);
    if ($validateStudent) {
        if ($studentId <= 0) jsonResponse(['error' => 'student_id required'], 422);
        $student = db()->prepare('SELECT id FROM students WHERE id = ? LIMIT 1');
        $student->execute([$studentId]);
        if (!$student->fetchColumn()) jsonResponse(['error' => 'Student not found.'], 404);
    }
    $amount = $data['amount'] ?? null;
    if (!is_numeric($amount) || (float)$amount <= 0 || (float)$amount > 999999.99) {
        jsonResponse(['error' => 'Payment amount must be greater than zero and within the supported range.'], 422);
    }
    $types = ['Monthly Fee','Annual Registration','Books / Materials','Uniform','Sports Uniform','Tudung','Lawatan','Sukan','Penyampaian Hadiah','Pakej Gambar','IQRA Class','Others'];
    $statuses = ['Paid','Partial','Unpaid','Overdue','Advance'];
    $methods = ['', 'Cash','Bank Transfer','QR DuitNow','Cheque'];
    if (!in_array((string)($data['type'] ?? 'Monthly Fee'), $types, true)
        || !in_array((string)($data['status'] ?? 'Paid'), $statuses, true)
        || !in_array((string)($data['method'] ?? ''), $methods, true)) {
        jsonResponse(['error' => 'Please select valid payment options.'], 422);
    }
    $dateValue = (string)($data['date'] ?? '');
    if ($dateValue !== '') {
        $date = DateTime::createFromFormat('!Y-m-d', $dateValue);
        if (!$date || $date->format('Y-m-d') !== $dateValue) jsonResponse(['error' => 'Please enter a valid payment date.'], 422);
    }
    $period = trim((string)($data['month'] ?? ''));
    if ($period !== '') {
        foreach (explode(',', $period) as $part) {
            if (!preg_match('/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/', trim($part))) {
                jsonResponse(['error' => 'Please enter a valid payment period.'], 422);
            }
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {

    case 'GET':
        requirePermission('payments.view');
        if ($id) {
            $stmt = db()->prepare('
                SELECT p.*, s.name AS student_name, s.class AS student_class, s.parent AS student_parent
                FROM payments p
                LEFT JOIN students s ON s.id = p.student_id
                WHERE p.id = ?
            ');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            $row ? jsonResponse($row) : jsonResponse(['error' => 'Not found'], 404);
        } else {
            $rows = db()->query('
                SELECT p.*, s.name AS student_name, s.class AS student_class
                FROM payments p
                LEFT JOIN students s ON s.id = p.student_id
                ORDER BY p.id DESC
            ')->fetchAll();
            jsonResponse($rows);
        }

    case 'POST':
        requirePermission('payments.create');
        requireCsrfToken();
        $d = json_decode(file_get_contents('php://input'), true) ?? [];

        // ── Bulk payment (array of items) ──────────────────────────
        if (isset($d['items']) && is_array($d['items'])) {
            if (empty($d['student_id'])) jsonResponse(['error' => 'student_id required'], 422);
            if (!$d['items']) jsonResponse(['error' => 'At least one payment item is required.'], 422);
            $status  = isset($d['status']) ? $d['status'] : 'Paid';
            foreach ($d['items'] as $item) {
                $itemStatus = isset($item['status']) ? (string)$item['status'] : $status;
                validatePaymentInput(array_merge($d, $item, ['status' => $itemStatus]), true);
            }
            $pdo = db();
            $pdo->beginTransaction();
            try {
            $stmt = $pdo->prepare('
                INSERT INTO payments (student_id,type,amount,month,date,status,method,ref,receipt,notes)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            ');
            $inserted = [];
            $insertedIds = [];
            foreach ($d['items'] as $i => $item) {
                $itemStatus = isset($item['status']) ? (string)$item['status'] : $status;
                $stmt->execute([
                    (int)$d['student_id'],
                    $item['type']   ?? 'Monthly Fee',
                    (float)($item['amount'] ?? 0),
                    $item['month']  ?? '',
                    $d['date']      ?: date('Y-m-d'),
                    $itemStatus,
                    $d['method']    ?? 'Cash',
                    $d['ref']       ?? '',
                    '',
                    $d['notes']     ?? '',
                ]);
                $newId = (int)$pdo->lastInsertId();
                $insertedIds[] = $newId;
                $stmt2 = $pdo->prepare('
                    SELECT p.*, s.name AS student_name, s.class AS student_class, s.parent AS student_parent
                    FROM payments p LEFT JOIN students s ON s.id = p.student_id WHERE p.id = ?
                ');
                $stmt2->execute([$newId]);
                $inserted[] = $stmt2->fetch();
            }
            $receipt = count(array_filter($inserted, static fn($payment) => in_array((string)($payment['status'] ?? ''), ['Paid', 'Partial', 'Advance'], true))) > 0 ? generateReceiptNumber($insertedIds[0]) : '';
            if ($receipt !== '') {
                $placeholders = implode(',', array_fill(0, count($insertedIds), '?'));
                $setReceipt = $pdo->prepare("UPDATE payments SET receipt = ? WHERE id IN ($placeholders)");
                $setReceipt->execute(array_merge([$receipt], $insertedIds));
                foreach ($inserted as &$payment) if ($payment) $payment['receipt'] = $receipt;
                unset($payment);
            }
            $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                error_log('KinderVault bulk payment creation failed: ' . $e->getMessage());
                jsonResponse(['error' => 'Unable to record the payments.'], 500);
            }
            foreach ($inserted as $payment) {
                if (!$payment) continue;
                auditLog('CREATE', 'Payment Management', 'Payment', 'PAY-' . $payment['id'], 'Recorded a payment.', 'Success', [
                    'amount' => (float)$payment['amount'],
                    'status' => $payment['status'],
                ]);
            }
            if ($receipt) {
                auditLog('RECEIPT_GENERATED', 'Receipt Management', 'Receipt', $receipt, 'Generated a receipt for recorded payments.', 'Success');
            }
            jsonResponse(['receipt' => $receipt, 'payments' => $inserted], 201);

        }
        // ── Single payment (original) ──────────────────────────────
        validatePaymentInput($d);
        $status  = isset($d['status']) ? $d['status'] : 'Paid';
        $pdo = db();
        $pdo->beginTransaction();
        try {
        $stmt = $pdo->prepare('
            INSERT INTO payments (student_id,type,amount,month,date,status,method,ref,receipt,notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        ');
        $stmt->execute([
            (int)($d['student_id'] ?? 0),
            $d['type']   ?? 'Monthly Fee',
            (float)($d['amount'] ?? 0),
            $d['month']  ?? '',
            $d['date']   ?: null,
            $status,
            $d['method'] ?? 'Cash',
            $d['ref']    ?? '',
            '',
            $d['notes']  ?? '',
        ]);
        $newId = (int)$pdo->lastInsertId();
        $receipt = in_array($status, ['Paid', 'Partial', 'Advance'], true) ? generateReceiptNumber($newId) : '';
        if ($receipt !== '') {
            $setReceipt = $pdo->prepare('UPDATE payments SET receipt = ? WHERE id = ?');
            $setReceipt->execute([$receipt, $newId]);
        }
        $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('KinderVault payment creation failed: ' . $e->getMessage());
            jsonResponse(['error' => 'Unable to record the payment.'], 500);
        }
        $stmt2 = $pdo->prepare('
            SELECT p.*, s.name AS student_name, s.class AS student_class, s.parent AS student_parent
            FROM payments p LEFT JOIN students s ON s.id = p.student_id WHERE p.id = ?
        ');
        $stmt2->execute([$newId]);
        $created = $stmt2->fetch();
        auditLog('CREATE', 'Payment Management', 'Payment', 'PAY-' . $newId, 'Recorded a payment.', 'Success', [
            'amount' => (float)($created['amount'] ?? 0),
            'status' => $created['status'] ?? $status,
        ]);
        if ($receipt) {
            auditLog('RECEIPT_GENERATED', 'Receipt Management', 'Receipt', $receipt, 'Generated a receipt for a recorded payment.', 'Success');
        }
        jsonResponse($created, 201);

    case 'PUT':
        requirePermission('payments.update');
        requireCsrfToken();
        if (!$id) jsonResponse(['error' => 'ID required'], 400);
        $d = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt0 = db()->prepare('SELECT id, student_id, amount, month, status, receipt FROM payments WHERE id = ?');
        $stmt0->execute([$id]);
        $current = $stmt0->fetch();
        if (!$current) jsonResponse(['error' => 'Payment not found'], 404);

        if (in_array((string)($current['status'] ?? ''), ['Paid', 'Advance', 'Partial', 'Voided'], true)) {
            jsonResponse(['error' => 'Completed payments cannot be edited. View or delete the record, then create a new payment if a correction is required.'], 409);
        }
        $status = isset($d['status']) ? $d['status'] : ($current['status'] ?? 'Paid');
        validatePaymentInput(array_merge($current, $d));
        if (in_array($status, ['Paid', 'Partial', 'Advance'], true)) {
            $receipt = $current['receipt'] ?: generateReceiptNumber((int)$current['id']);
        } else {
            $receipt = '';
        }

        $stmt = db()->prepare('
            UPDATE payments SET student_id=?,type=?,amount=?,month=?,date=?,status=?,method=?,ref=?,notes=?,receipt=?
            WHERE id=?
        ');
        $stmt->execute([
            (int)($d['student_id'] ?? 0),
            $d['type']   ?? 'Monthly Fee',
            (float)($d['amount'] ?? 0),
            $d['month']  ?? '',
            $d['date']   ?: null,
            $status,
            $d['method'] ?? '',
            $d['ref']    ?? '',
            $d['notes']  ?? '',
            $receipt,
            $id,
        ]);
        $stmt2 = db()->prepare('SELECT * FROM payments WHERE id = ?');
        $stmt2->execute([$id]);
        $updated = $stmt2->fetch();
        $changes = safeAuditChanges($current, $updated ?: [], [
            'amount' => 'Amount',
            'month' => 'Fee period',
            'status' => 'Payment status',
            'receipt' => 'Receipt number',
        ]);
        auditLog('UPDATE', 'Payment Management', 'Payment', 'PAY-' . $id, 'Updated a payment record.', 'Success', $changes ? ['changes' => $changes] : []);
        if (empty($current['receipt']) && !empty($updated['receipt'])) {
            auditLog('RECEIPT_GENERATED', 'Receipt Management', 'Receipt', $updated['receipt'], 'Generated a receipt while updating a payment.', 'Success');
        }
        jsonResponse($updated);

    case 'DELETE':
        requirePermission('payments.delete');
        requireCsrfToken();
        if (!$id) jsonResponse(['error' => 'ID required'], 400);
        $currentStmt = db()->prepare('SELECT id, receipt, status FROM payments WHERE id = ?');
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) jsonResponse(['error' => 'Payment not found'], 404);
        if (($current['status'] ?? '') === 'Voided') {
            jsonResponse(['error' => 'This payment has already been voided.'], 409);
        }
        $stmt = db()->prepare("UPDATE payments SET status = 'Voided', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$id]);
        auditLog('VOID', 'Payment Management', 'Payment', 'PAY-' . $id, 'Voided a payment record without removing its audit history.', 'Success', [
            'receipt' => $current['receipt'] ?? '',
            'status' => $current['status'] ?? '',
        ]);
        jsonResponse(['success' => true, 'status' => 'Voided']);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
