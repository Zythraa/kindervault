<?php
declare(strict_types=1);

// Render-only demo fixture. This CLI script is deliberately guarded and is
// never reachable through the web interface (.htaccess blocks /testing).
if (PHP_SAPI !== 'cli'
    || (string)(getenv('APP_ENV') ?: '') !== 'production'
    || (string)(getenv('KV_RENDER_DEMO_SEED_CONFIRM') ?: '') !== 'RENDER_ONLY_2026') {
    fwrite(STDERR, "This fixture is restricted to an explicitly confirmed Render production shell.\n");
    exit(2);
}

require_once __DIR__ . '/../config.php';

$pdo = db();
$pdo->beginTransaction();

try {
    $students = [
        ['DEMO26-01', 'Muhammad Aiman bin Hakim', 'M', '2022-02-14', '2026-01-05', 'A', 'Permata'],
        ['DEMO26-02', 'Nur Aisyah binti Rahman', 'F', '2022-07-09', '2026-01-12', 'B', 'Permata'],
        ['DEMO26-03', 'Danish Irfan bin Azmi', 'M', '2022-11-21', '2026-02-02', 'C', 'Permata'],
        ['DEMO26-04', 'Siti Nur Iman binti Zulkifli', 'F', '2022-04-30', '2026-02-16', 'A', 'Permata'],
        ['DEMO26-05', 'Adam Rayyan bin Faizal', 'M', '2022-09-18', '2026-03-02', 'B', 'Permata'],
        ['DEMO26-06', 'Nur Alya Sofea binti Rizal', 'F', '2021-01-26', '2026-01-05', 'C', 'Intelek'],
        ['DEMO26-07', 'Haziq Danish bin Shukri', 'M', '2021-06-12', '2026-01-19', 'A', 'Intelek'],
        ['DEMO26-08', 'Puteri Balqis binti Amir', 'F', '2021-10-05', '2026-02-09', 'B', 'Intelek'],
        ['DEMO26-09', 'Muhammad Harith bin Azlan', 'M', '2021-03-17', '2026-02-23', 'C', 'Intelek'],
        ['DEMO26-10', 'Nur Qistina Balqis binti Ismail', 'F', '2021-08-28', '2026-03-09', 'A', 'Intelek'],
        ['DEMO26-11', 'Iman Hakeem bin Rosli', 'M', '2021-12-03', '2026-01-05', 'B', 'Ceria'],
        ['DEMO26-12', 'Aina Sofea binti Nabil', 'F', '2020-02-19', '2026-01-26', 'C', 'Ceria'],
        ['DEMO26-13', 'Arif Hakim bin Jamal', 'M', '2020-05-11', '2026-02-16', 'A', 'Ceria'],
        ['DEMO26-14', 'Nurin Syafiqah binti Kamarul', 'F', '2020-09-24', '2026-03-02', 'B', 'Ceria'],
        ['DEMO26-15', 'Muhammad Rayyan Idris', 'M', '2020-12-15', '2026-03-16', 'C', 'Ceria'],
        ['DEMO26-16', 'Qaisara Humaira binti Firdaus', 'F', '2022-01-08', '2026-04-06', 'A', 'Permata'],
        ['DEMO26-17', 'Amirul Haziq bin Salleh', 'M', '2021-02-27', '2026-04-20', 'B', 'Intelek'],
        ['DEMO26-18', 'Nur Damia binti Azhar', 'F', '2020-07-16', '2026-05-04', 'C', 'Ceria'],
        ['DEMO26-19', 'Muhammad Danish bin Amrul', 'M', '2022-06-06', '2026-05-18', 'A', 'Permata'],
        ['DEMO26-20', 'Hannah Maisarah binti Faiz', 'F', '2021-11-29', '2026-06-01', 'B', 'Intelek'],
    ];

    $feeByPackage = ['A' => 230.00, 'B' => 320.00, 'C' => 430.00];
    $currentMonth = date('Y-m');
    $currentDate = date('Y-m-d');
    $nextMonth = (new DateTimeImmutable($currentMonth . '-01'))->modify('+1 month')->format('Y-m');
    $monthAfterNext = (new DateTimeImmutable($currentMonth . '-01'))->modify('+2 months')->format('Y-m');
    $previousMonth = (new DateTimeImmutable($currentMonth . '-01'))->modify('-1 month')->format('Y-m');

    $studentStmt = $pdo->prepare(
        'INSERT IGNORE INTO students
         (code, name, ic, birth_cert, gender, dob, child_position, program_age, monthly_package,
          wants_uniform, wants_sports_uniform, wants_tudung, wants_iqra, class, parent,
          father_name, father_phone, mother_name, mother_phone, phone, address, fee, status, enrol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Active", ?)'
    );
    $findStudent = $pdo->prepare('SELECT id, name FROM students WHERE code = ? LIMIT 1');

    $studentIds = [];
    foreach ($students as $index => [$code, $name, $gender, $dob, $enrol, $package, $class]) {
        $number = $index + 1;
        $fee = $feeByPackage[$package];
        $studentStmt->execute([
            $code,
            $name,
            'DEMO-IC-' . str_pad((string)$number, 4, '0', STR_PAD_LEFT),
            'DEMO-BC-' . str_pad((string)$number, 4, '0', STR_PAD_LEFT),
            $gender,
            $dob,
            (string)(($number % 3) + 1),
            $class === 'Permata' ? '4' : ($class === 'Intelek' ? '5' : '6'),
            $package,
            $gender === 'F' ? 1 : 0,
            $class,
            'Synthetic Parent ' . $number,
            'Father Demo ' . $number,
            '011-7000-' . str_pad((string)$number, 4, '0', STR_PAD_LEFT),
            'Mother Demo ' . $number,
            '012-7000-' . str_pad((string)$number, 4, '0', STR_PAD_LEFT),
            '013-7000-' . str_pad((string)$number, 4, '0', STR_PAD_LEFT),
            'Synthetic demo address ' . $number . ', Selangor',
            $fee,
            $enrol,
        ]);
        $findStudent->execute([$code]);
        $existingStudent = $findStudent->fetch();
        if (!$existingStudent) {
            throw new RuntimeException('Unable to locate a seeded student record.');
        }
        if ((string)$existingStudent['name'] !== $name) {
            throw new RuntimeException('A non-demo record already uses a reserved demo code.');
        }
        $studentIds[$number] = (int)$existingStudent['id'];
    }

    $paymentStmt = $pdo->prepare(
        'INSERT INTO payments
         (student_id, type, amount, month, date, status, method, ref, receipt, notes)
         VALUES (?, "Monthly Fee", ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $findPayment = $pdo->prepare('SELECT id FROM payments WHERE ref = ? LIMIT 1');

    foreach ($studentIds as $number => $studentId) {
        $package = $students[$number - 1][5];
        $fee = $feeByPackage[$package];
        $scenario = $number % 5;
        if ($scenario === 1) {
            $status = 'Paid';
            $month = $currentMonth;
            $amount = $fee;
            $method = 'Cash';
            $date = $currentDate;
        } elseif ($scenario === 2) {
            $status = 'Unpaid';
            $month = $currentMonth;
            $amount = $fee;
            $method = '';
            $date = null;
        } elseif ($scenario === 3) {
            $status = 'Advance';
            $month = $nextMonth . ',' . $monthAfterNext;
            $amount = $fee * 2;
            $method = 'Bank Transfer';
            $date = $currentDate;
        } elseif ($scenario === 4) {
            $status = 'Overdue';
            $month = $previousMonth;
            $amount = $fee;
            $method = '';
            $date = $previousMonth . '-05';
        } else {
            $status = 'Paid';
            $month = $previousMonth . ',' . $currentMonth;
            $amount = $fee * 2;
            $method = 'QR DuitNow';
            $date = $currentDate;
        }

        $ref = 'DEMO26-PAY-' . str_pad((string)$number, 2, '0', STR_PAD_LEFT);
        $findPayment->execute([$ref]);
        if ($findPayment->fetchColumn()) {
            continue;
        }
        $receipt = in_array($status, ['Paid', 'Advance'], true)
            ? 'RCP-DEMO26-' . str_pad((string)$number, 2, '0', STR_PAD_LEFT)
            : '';
        $paymentStmt->execute([
            $studentId,
            $amount,
            $month,
            $date,
            $status,
            $method,
            $ref,
            $receipt,
            'Synthetic Render demo data only',
        ]);
    }

    $pdo->commit();
    fwrite(STDOUT, "Render demo seed complete: 20 synthetic Malaysian students and payment scenarios added.\n");
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Render demo seed failed.');
    fwrite(STDERR, "Render demo seed failed.\n");
    exit(1);
}
