<?php
declare(strict_types=1);

// Public Render health/readiness endpoint. It deliberately returns no
// configuration, SQL details, or exception messages.
// The health probe is intentionally stateless and should not create a PHP
// session file on every Render check.
define('KV_SKIP_SESSION', true);
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    // Keep the probe on the same TLS path as the application connection. The
    // previous probe created a separate PDO without the CA options, so TiDB's
    // TLS-required endpoint rejected it even though db() worked.
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 3,
    ];
    if (DB_SSL_ENABLED) {
        if (DB_SSL_CA === '' || !is_file(DB_SSL_CA) || !is_readable(DB_SSL_CA)) {
            throw new RuntimeException('Database TLS CA certificate is unavailable.');
        }
        $options[PDO::MYSQL_ATTR_SSL_CA] = DB_SSL_CA;
        if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
    }
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $pdo->query('SELECT 1');
    echo json_encode(['status' => 'ok'], JSON_UNESCAPED_SLASHES);
} catch (Throwable) {
    http_response_code(503);
    echo json_encode(['status' => 'unavailable'], JSON_UNESCAPED_SLASHES);
}
