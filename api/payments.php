<?php
// ============================================================
// api/payments.php  –  CRUD for payments
// GET    /api/payments.php           → list all (joined with student name)
// POST   /api/payments.php           → create + auto-generate receipt no.
// PUT    /api/payments.php?id=N      → update
// DELETE /api/payments.php?id=N      → delete
// ============================================================
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/payment_logic.php';
requireLogin();

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
        $studentId = (int)($d['student_id'] ?? 0);
        if ($studentId <= 0) jsonResponse(['error' => 'student_id required'], 422);

        $items = isset($d['items']) && is_array($d['items']) ? $d['items'] : [$d];
        if ($items === []) jsonResponse(['error' => 'At least one payment item is required.'], 422);

        $pdo = db();
        $pdo->beginTransaction();
        try {
            // The student row is the per-student settlement lock. Concurrent
            // requests for the same student must wait and re-read the balance.
            $student = lockedStudent($pdo, $studentId);
            $history = lockedStudentPayments($pdo, $studentId);
            $inserted = [];
            foreach ($items as $item) {
                $request = array_merge($d, $item);
                unset($request['items']);
                $prepared = prepareSettlement($request, $student, $history);
                $payment = insertPreparedPayment($pdo, $studentId, $request, $prepared);
                $inserted[] = $payment;
                $history[] = $payment;

                // Void any legacy placeholder Unpaid/Overdue rows for this student and month so they do not linger
                if (($prepared['type'] ?? '') === 'Monthly Fee' && !empty($prepared['month'])) {
                    $coveredMonths = kvPaymentMonths((string)$prepared['month']);
                    foreach ($coveredMonths as $covM) {
                        $stmtSupersede = $pdo->prepare("
                            UPDATE payments
                            SET status = 'Voided', notes = TRIM(CONCAT(COALESCE(notes, ''), ' [Superseded by payment #', ?, ']'))
                            WHERE student_id = ? AND type = 'Monthly Fee' AND month = ? AND status IN ('Unpaid', 'Overdue')
                        ");
                        $stmtSupersede->execute([$payment['id'], $studentId, $covM]);
                    }
                }
            }

            $insertedIds = array_map(static fn(array $payment): int => (int)$payment['id'], $inserted);
            $receipt = count(array_filter($inserted, static fn(array $payment): bool => in_array((string)$payment['status'], KV_SETTLED_PAYMENT_STATUSES, true))) > 0
                ? generateReceiptNumber($insertedIds[0])
                : '';
            if ($receipt !== '') {
                $placeholders = implode(',', array_fill(0, count($insertedIds), '?'));
                $setReceipt = $pdo->prepare("UPDATE paymentsSET receipt = ? WHERE id IN ($placeholders)");
                $setReceipt->execute(array_merge([$receipt], $insertedIds));
                foreach ($inserted as &$payment) $payment['receipt'] = $receipt;
                unset($payment);
            }

            foreach ($inserted as $payment) {
                $action = $payment['status'] === 'Partial' ? 'PARTIAL_PAYMENT_CREATED' : ($payment['status'] === 'Paid' ? 'PAYMENT_COMPLETED' : 'PAYMENT_CREATED');
                auditLog($action, 'Payment Management', 'Payment', 'PAY-' . $payment['id'], 'Recorded a payment transaction.', 'Success', [
                    'amount' => (float)$payment['amount'],
                    'status' => $payment['status'],
                    'balance_after' => (float)($payment['balance_after'] ?? 0),
                ]);
            }
            if ($receipt !== '') {
                auditLog('RECEIPT_GENERATED', 'Receipt Management', 'Receipt', $receipt, 'Generated a receipt for recorded payments.', 'Success');
            }
            $pdo->commit();

            $outstandingBalance = array_reduce($inserted, static fn(float $sum, array $payment): float => $sum + (float)($payment['balance_after'] ?? 0), 0.0);
            if (isset($d['items'])) {
                jsonResponse(['receipt' => $receipt, 'payments' => $inserted, 'outstanding_balance' => round($outstandingBalance, 2)], 201);
            }
            jsonResponse(array_merge($inserted[0], ['outstanding_balance' => round($outstandingBalance, 2)]), 201);
        } catch (InvalidArgumentException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            jsonResponse(['error' => $e->getMessage()], 422);
        } catch (RuntimeException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            jsonResponse(['error' => $e->getMessage() === 'Student not found.' ? $e->getMessage() : 'Unable to record the payment.'], $e->getMessage() === 'Student not found.' ? 404 : 500);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('KinderVault payment creation failed.');
            jsonResponse(['error' => 'Unable to record the payment.'], 500);
        }
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
            UPDATE paymentsSET student_id=?,type=?,amount=?,month=?,date=?,status=?,method=?,ref=?,notes=?,receipt=?
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
        $pdo = db();
        $lookup = $pdo->prepare('SELECT student_id FROM payments WHERE id = ?');
        $lookup->execute([$id]);
        $studentId = (int)$lookup->fetchColumn();
        if ($studentId <= 0) jsonResponse(['error' => 'Payment not found'], 404);
        $pdo->beginTransaction();
        try {
            // Use the same lock order as creation: student first, payments second.
            lockedStudent($pdo, $studentId);
            $currentStmt = $pdo->prepare('SELECT id, student_id, receipt, status FROM payments WHERE id = ? FOR UPDATE');
            $currentStmt->execute([$id]);
            $current = $currentStmt->fetch();
            if (!$current) {
                $pdo->rollBack();
                jsonResponse(['error' => 'Payment not found'], 404);
            }
            if (($current['status'] ?? '') === 'Voided') {
                $pdo->rollBack();
                jsonResponse(['error' => 'This payment has already been voided.'], 409);
            }
            $stmt = $pdo->prepare("UPDATE paymentsSET status = 'Voided' WHERE id = ?");
            $stmt->execute([$id]);
            auditLog('PAYMENT_VOIDED', 'Payment Management', 'Payment', 'PAY-' . $id, 'Voided a payment transaction without removing its audit history.', 'Success', [
                'receipt' => $current['receipt'] ?? '',
                'previous_status' => $current['status'] ?? '',
            ]);
            $pdo->commit();
            jsonResponse(['success' => true, 'status' => 'Voided']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('KinderVault payment void failed.');
            jsonResponse(['error' => 'Unable to void the payment.'], 500);
        }
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
