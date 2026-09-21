<?php
// Full in-application SQL export.
// In local development: writes SQL file to backup/ directory (original behaviour).
// In production (Render): streams SQL directly as a download — no filesystem write,
// because the Render application container filesystem is ephemeral.
require_once __DIR__ . '/../config.php';
requireLogin();
requirePermission('backup.access');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$pdo = db();
$filename = 'kindervault_backup_' . date('Ymd_His') . '.sql';

$lines = [
    '-- KinderVault Full SQL Backup',
    '-- Generated: ' . date('Y-m-d H:i:s'),
    '-- Contains schema and data for every application table.',
    '',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS=0;',
    '',
];

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$redactedColumns = [
    'password',
    'mfa_secret_encrypted',
    'mfa_recovery_codes_json',
    'session_token',
    'csrf_token',
    'api_key',
    'access_token',
    'secret_key',
    'encryption_key',
];
$redactedPasswordPlaceholder = '!BACKUP_REDACTED!';
foreach ($tables as $table) {
    $safeTable = str_replace('`', '``', (string)$table);
    $createRow = $pdo->query("SHOW CREATE TABLE `{$safeTable}`")->fetch();
    $createValues = array_values($createRow ?: []);
    $createSql = $createRow['Create Table'] ?? ($createValues[1] ?? null);
    if (!is_string($createSql) || $createSql === '') {
        jsonResponse(['error' => 'Unable to read the schema for a backup table.'], 500);
    }

    $lines[] = '-- Table: ' . $table;
    $lines[] = "DROP TABLE IF EXISTS `{$safeTable}`;";
    $lines[] = $createSql . ';';

    $rows = $pdo->query("SELECT * FROM `{$safeTable}`")->fetchAll();
    foreach ($rows as $row) {
        $columns = array_map(
            static fn(string $column): string => '`' . str_replace('`', '``', $column) . '`',
            array_keys($row)
        );
        $values = [];
        foreach ($row as $column => $value) {
            $columnName = strtolower((string)$column);
            $isSensitiveColumn = in_array($columnName, $redactedColumns, true)
                || preg_match('/(?:password|passhash|secret|token|api[_-]?key)/i', $columnName) === 1;
            if ($isSensitiveColumn) {
                // Password columns are NOT NULL in the users table, so use a
                // non-credential placeholder. Other secret fields can be NULL.
                $values[] = preg_match('/(?:password|passhash)/i', $columnName) === 1
                    ? $pdo->quote($redactedPasswordPlaceholder)
                    : 'NULL';
                continue;
            }
            $values[] = $value === null ? 'NULL' : $pdo->quote((string)$value);
        }
        $lines[] = "INSERT INTO `{$safeTable}` (" . implode(', ', $columns) . ') VALUES (' . implode(', ', $values) . ');';
    }
    $lines[] = '';
}

$lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
$lines[] = '';
$sql = implode("\n", $lines);

// ── Write to disk (local) or stream directly (production) ──
if (APP_ENV !== 'production') {
    // Local development: persist the file in backup/ for later reference.
    $backupDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'backup';
    if (!is_dir($backupDir) && !mkdir($backupDir, 0770, true) && !is_dir($backupDir)) {
        jsonResponse(['error' => 'Unable to prepare the backup folder.'], 500);
    }
    $target = $backupDir . DIRECTORY_SEPARATOR . $filename;
    if (file_put_contents($target, $sql, LOCK_EX) === false) {
        jsonResponse(['error' => 'Unable to write the backup file.'], 500);
    }
}
// In production the SQL is only streamed — no local copy is kept on the ephemeral filesystem.

auditLog('BACKUP_EXPORTED', 'Backup & Restore', 'Database Backup', $filename, 'Created and downloaded a full database backup.', 'Success', [
    'table_count' => count($tables),
    'mode'        => APP_ENV === 'production' ? 'stream' : 'file+stream',
]);

header('Content-Type: application/sql; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($sql));
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
echo $sql;
exit;
