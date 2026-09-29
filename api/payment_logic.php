<?php

declare(strict_types=1);

const KV_SETTLED_PAYMENT_STATUSES = ['Paid', 'Partial', 'Advance'];

function generateReceiptNumber(int $anchorPaymentId): string {
    return 'RCP-' . date('Y') . '-' . str_pad((string)$anchorPaymentId, 5, '0', STR_PAD_LEFT);
}

function paymentFeeConfig(): array {
    $defaults = [
        'annual' => [
            'registration' => 100,
            'books' => ['4' => 380, '5' => 460, '6' => 560],
            'uniform' => 65,
            'sports_uniform' => 55,
            'tudung' => 20,
            'lawatan' => 100,
            'sukan' => 60,
            'hadiah' => 100,
            'gambar' => 90,
            'iqra' => 30,
        ],
    ];
    $stored = appSetting('fee_config', $defaults);
    return is_array($stored) ? array_replace_recursive($defaults, $stored) : $defaults;
}

function validatePaymentInput(array $data, bool $validateStudent = true): void {
    $studentId = (int)($data['student_id'] ?? 0);
    if ($validateStudent) {
        if ($studentId <= 0) {
            throw new InvalidArgumentException('student_id required');
        }
        $student = db()->prepare('SELECT id FROM students WHERE id = ? LIMIT 1');
        $student->execute([$studentId]);
        if (!$student->fetchColumn()) {
            throw new RuntimeException('Student not found.');
        }
    }
    $amount = $data['amount'] ?? null;
    if (!is_numeric($amount) || (float)$amount <= 0 || (float)$amount > 999999.99) {
        throw new InvalidArgumentException('Payment amount must be greater than zero and within the supported range.');
    }
    $types = ['Monthly Fee','Annual Registration','Books / Materials','Uniform','Sports Uniform','Tudung','Lawatan','Sukan','Penyampaian Hadiah','Pakej Gambar','IQRA Class','Others'];
    $statuses = ['Paid','Partial','Unpaid','Overdue','Advance'];
    $methods = ['', 'Cash','Bank Transfer','QR DuitNow','Cheque'];
    if (!in_array((string)($data['type'] ?? 'Monthly Fee'), $types, true)
        || !in_array((string)($data['status'] ?? 'Paid'), $statuses, true)
        || !in_array((string)($data['method'] ?? ''), $methods, true)) {
        throw new InvalidArgumentException('Please select valid payment options.');
    }
    $dateValue = (string)($data['date'] ?? '');
    if ($dateValue !== '') {
        $date = DateTime::createFromFormat('!Y-m-d', $dateValue);
        if (!$date || $date->format('Y-m-d') !== $dateValue) {
            throw new InvalidArgumentException('Please enter a valid payment date.');
        }
    }
    $period = trim((string)($data['month'] ?? ''));
    if ($period !== '') {
        foreach (explode(',', $period) as $part) {
            if (!preg_match('/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/', trim($part))) {
                throw new InvalidArgumentException('Please enter a valid payment period.');
            }
        }
    }
}

function lockedStudent(PDO $pdo, int $studentId): array {
    $stmt = $pdo->prepare('SELECT * FROM students WHERE id = ? FOR UPDATE');
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();
    if (!$student) {
        throw new RuntimeException('Student not found.');
    }
    return $student;
}

function lockedStudentPayments(PDO $pdo, int $studentId): array {
    $stmt = $pdo->prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY id FOR UPDATE');
    $stmt->execute([$studentId]);
    return $stmt->fetchAll();
}

function kvPaymentMonths(string $period): array {
    $months = array_values(array_unique(array_filter(array_map('trim', explode(',', $period)), static function ($month) {
        return preg_match('/^\d{4}-(?:0[1-9]|1[0-2])$/', $month) === 1;
    })));
    sort($months, SORT_STRING);
    return $months;
}

function kvPaymentAllocationFromRow(array $payment, float $monthlyFee, array &$paidByMonth): void {
    if (($payment['type'] ?? '') !== 'Monthly Fee'
        || !in_array((string)($payment['status'] ?? ''), KV_SETTLED_PAYMENT_STATUSES, true)) {
        return;
    }

    $stored = json_decode((string)($payment['allocation_json'] ?? ''), true);
    if (is_array($stored) && $stored !== []) {
        foreach ($stored as $allocation) {
            $month = (string)($allocation['month'] ?? '');
            $amount = round((float)($allocation['amount'] ?? 0), 2);
            if (preg_match('/^\d{4}-(?:0[1-9]|1[0-2])$/', $month) && $amount > 0) {
                $paidByMonth[$month] = round(($paidByMonth[$month] ?? 0) + $amount, 2);
            }
        }
        return;
    }

    // Backward-compatible allocation for payment rows created before
    // allocation_json existed.
    $remaining = round((float)($payment['amount'] ?? 0), 2);
    $months = kvPaymentMonths((string)($payment['month'] ?? ''));
    if (($payment['status'] ?? '') === 'Advance' && count($months) === 1 && $monthlyFee > 0 && $remaining > $monthlyFee) {
        $count = (int)round($remaining / $monthlyFee);
        if ($count > 1 && $count <= 60 && abs($remaining - ($count * $monthlyFee)) <= 0.01) {
            [$year, $month] = array_map('intval', explode('-', $months[0]));
            $months = [];
            for ($offset = 0; $offset < $count; $offset++) {
                $date = new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
                $months[] = $date->modify("+{$offset} months")->format('Y-m');
            }
        }
    }
    foreach ($months as $month) {
        if ($remaining <= 0) break;
        $available = max(0, $monthlyFee - ($paidByMonth[$month] ?? 0));
        $applied = min($available, $remaining);
        if ($applied > 0) {
            $paidByMonth[$month] = round(($paidByMonth[$month] ?? 0) + $applied, 2);
            $remaining = round($remaining - $applied, 2);
        }
    }
}

function kvMonthlyPaidByMonth(array $payments, float $monthlyFee): array {
    usort($payments, static fn(array $left, array $right): int => (int)($left['id'] ?? 0) <=> (int)($right['id'] ?? 0));
    $paidByMonth = [];
    foreach ($payments as $payment) {
        if (($payment['status'] ?? '') === 'Voided') continue;
        kvPaymentAllocationFromRow($payment, $monthlyFee, $paidByMonth);
    }
    return $paidByMonth;
}

function kvAllocateMonthlyPayment(array $payments, float $monthlyFee, array $requestedMonths, float $amount): array {
    $requestedMonths = array_values(array_unique($requestedMonths));
    sort($requestedMonths, SORT_STRING);
    $paidByMonth = kvMonthlyPaidByMonth($payments, $monthlyFee);
    $outstandingBefore = 0.0;
    foreach ($requestedMonths as $month) {
        $outstandingBefore += max(0, $monthlyFee - ($paidByMonth[$month] ?? 0));
    }
    $outstandingBefore = round($outstandingBefore, 2);

    if ($amount <= 0 || $amount > $outstandingBefore + 0.005) {
        throw new InvalidArgumentException('Payment amount cannot exceed the current outstanding balance.');
    }

    $remaining = round($amount, 2);
    $allocations = [];
    foreach ($requestedMonths as $month) {
        if ($remaining <= 0) break;
        $monthOutstanding = max(0, $monthlyFee - ($paidByMonth[$month] ?? 0));
        $applied = min($monthOutstanding, $remaining);
        if ($applied <= 0) continue;
        $paidByMonth[$month] = round(($paidByMonth[$month] ?? 0) + $applied, 2);
        $allocations[] = [
            'month' => $month,
            'amount' => round($applied, 2),
            'balance_after' => round(max(0, $monthlyFee - $paidByMonth[$month]), 2),
        ];
        $remaining = round($remaining - $applied, 2);
    }

    if ($remaining > 0.005) {
        throw new InvalidArgumentException('Payment amount cannot be allocated to the selected fee period.');
    }

    return [
        'amount_due' => $outstandingBefore,
        'balance_after' => round(max(0, $outstandingBefore - $amount), 2),
        'allocations' => $allocations,
        'months' => array_values(array_unique(array_column($allocations, 'month'))),
    ];
}

function kvAnnualFeeAmount(array $student, array $feeConfig, string $type): ?float {
    $annual = is_array($feeConfig['annual'] ?? null) ? $feeConfig['annual'] : [];
    $map = [
        'Annual Registration' => $annual['registration'] ?? null,
        'Uniform' => !empty($student['wants_uniform']) ? ($annual['uniform'] ?? null) : 0,
        'Sports Uniform' => !empty($student['wants_sports_uniform']) ? ($annual['sports_uniform'] ?? null) : 0,
        'Tudung' => (($student['gender'] ?? '') === 'F' && !empty($student['wants_tudung'])) ? ($annual['tudung'] ?? null) : 0,
        'Lawatan' => $annual['lawatan'] ?? null,
        'Sukan' => $annual['sukan'] ?? null,
        'Penyampaian Hadiah' => $annual['hadiah'] ?? null,
        'Pakej Gambar' => $annual['gambar'] ?? null,
        'IQRA Class' => !empty($student['wants_iqra']) ? ($annual['iqra'] ?? null) : 0,
    ];
    if ($type === 'Books / Materials') {
        $age = (string)($student['program_age'] ?? '5');
        return isset($annual['books'][$age]) ? round((float)$annual['books'][$age], 2) : null;
    }
    return array_key_exists($type, $map) && $map[$type] !== null ? round((float)$map[$type], 2) : null;
}

function kvAllocateAnnualPayment(array $payments, string $type, string $year, float $totalDue, float $amount): array {
    $paid = 0.0;
    foreach ($payments as $payment) {
        if (($payment['type'] ?? '') === $type
            && (string)($payment['month'] ?? '') === $year
            && in_array((string)($payment['status'] ?? ''), KV_SETTLED_PAYMENT_STATUSES, true)) {
            $paid += (float)($payment['amount'] ?? 0);
        }
    }
    $outstandingBefore = round(max(0, $totalDue - $paid), 2);
    if ($amount <= 0 || $amount > $outstandingBefore + 0.005) {
        throw new InvalidArgumentException('Payment amount cannot exceed the current outstanding balance.');
    }
    return [
        'amount_due' => $outstandingBefore,
        'balance_after' => round(max(0, $outstandingBefore - $amount), 2),
        'allocations' => [],
        'months' => [$year],
    ];
}

function prepareSettlement(array $data, array $student, array $payments): array {
    validatePaymentInput($data, false);
    $type = (string)($data['type'] ?? 'Monthly Fee');
    $amount = round((float)($data['amount'] ?? 0), 2);
    $requestedStatus = (string)($data['status'] ?? 'Paid');
    $period = trim((string)($data['month'] ?? ''));

    if ($type === 'Monthly Fee') {
        $months = kvPaymentMonths($period);
        if ($months === []) {
            throw new InvalidArgumentException('Please select at least one valid monthly fee period.');
        }
        $allocation = kvAllocateMonthlyPayment($payments, (float)$student['fee'], $months, $amount);
        $allocatesFutureMonth = false;
        foreach ($allocation['allocations'] as $al) {
            if (($al['amount'] ?? 0) > 0.005 && ($al['month'] ?? '') > date('Y-m')) {
                $allocatesFutureMonth = true;
                break;
            }
        }
        $status = $allocation['balance_after'] > 0.005 ? 'Partial' : ($allocatesFutureMonth ? 'Advance' : 'Paid');
        return [
            'type' => $type,
            'amount' => $amount,
            'month' => implode(',', $allocation['months']),
            'status' => $status,
            'balance_after' => $allocation['balance_after'],
            'allocation_json' => json_encode($allocation['allocations'], JSON_UNESCAPED_UNICODE),
        ];
    }

    $year = preg_match('/^\d{4}$/', $period) ? $period : substr((string)($data['date'] ?? date('Y-m-d')), 0, 4);
    $annualDue = kvAnnualFeeAmount($student, paymentFeeConfig(), $type);
    if ($annualDue !== null) {
        $allocation = kvAllocateAnnualPayment($payments, $type, $year, $annualDue, $amount);
        return [
            'type' => $type,
            'amount' => $amount,
            'month' => $year,
            'status' => $allocation['balance_after'] > 0.005 ? 'Partial' : 'Paid',
            'balance_after' => $allocation['balance_after'],
            'allocation_json' => null,
        ];
    }

    // Check if paying against an existing tracked payment or ad-hoc balance
    $targetPaymentId = (int)($data['target_payment_id'] ?? $data['payment_id'] ?? 0);
    if ($targetPaymentId > 0) {
        $target = null;
        foreach ($payments as $p) {
            if ((int)($p['id'] ?? 0) === $targetPaymentId) {
                $target = $p;
                break;
            }
        }
        if ($target) {
            $origDue = (float)($target['amount'] ?? 0);
            $paid = 0.0;
            foreach ($payments as $p) {
                if (in_array((string)($p['status'] ?? ''), KV_SETTLED_PAYMENT_STATUSES, true)
                    && (int)($p['ref_payment_id'] ?? 0) === $targetPaymentId) {
                    $paid += (float)($p['amount'] ?? 0);
                }
            }
            $outstanding = round(max(0, $origDue - $paid), 2);
            if ($amount <= 0 || $amount > $outstanding + 0.005) {
                throw new InvalidArgumentException('Payment amount cannot exceed the current outstanding balance.');
            }
            $balanceAfter = round(max(0, $outstanding - $amount), 2);
            return [
                'type' => $type,
                'amount' => $amount,
                'month' => $period ?: (string)($target['month'] ?? ''),
                'status' => $balanceAfter > 0.005 ? 'Partial' : 'Paid',
                'balance_after' => $balanceAfter,
                'allocation_json' => null,
            ];
        }
    }

    // Ad-hoc charges do not have a configured obligation amount. They are
    // recorded as one complete transaction and cannot create an overpayment.
    return [
        'type' => $type,
        'amount' => $amount,
        'month' => $period,
        'status' => in_array($requestedStatus, ['Unpaid', 'Overdue'], true) ? $requestedStatus : 'Paid',
        'balance_after' => in_array($requestedStatus, ['Unpaid', 'Overdue'], true) ? $amount : 0.0,
        'allocation_json' => null,
    ];
}

function insertPreparedPayment(PDO $pdo, int $studentId, array $request, array $prepared): array {
    $stmt = $pdo->prepare('
        INSERT INTO payments (student_id,type,amount,month,date,status,method,ref,receipt,notes,balance_after,allocation_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ');
    $stmt->execute([
        $studentId,
        $prepared['type'],
        $prepared['amount'],
        $prepared['month'],
        !empty($request['date']) ? $request['date'] : date('Y-m-d'),
        $prepared['status'],
        $request['method'] ?? 'Cash',
        $request['ref'] ?? '',
        '',
        $request['notes'] ?? '',
        $prepared['balance_after'],
        $prepared['allocation_json'],
    ]);
    $id = (int)$pdo->lastInsertId();
    $select = $pdo->prepare('
        SELECT p.*, s.name AS student_name, s.class AS student_class, s.parent AS student_parent
        FROM payments p LEFT JOIN students s ON s.id = p.student_id WHERE p.id = ?
    ');
    $select->execute([$id]);
    $payment = $select->fetch();
    if (!$payment) {
        throw new RuntimeException('Created payment could not be loaded.');
    }
    return $payment;
}
