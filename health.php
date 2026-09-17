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

// Temporary, opt-in diagnostics for Render runtime troubleshooting. Keep this
// disabled unless HEALTH_DIAGNOSTICS=true is explicitly set in Render.
$diagnosticsEnabled = envFlag('HEALTH_DIAGNOSTICS', false);
$healthLog = static function (string $key, string $value) use ($diagnosticsEnabled): void {
    if ($diagnosticsEnabled) {
        error_log('KINDERVAULT_HEALTH ' . $key . '=' . $value);
    }
};

$healthLog('DB_PASSWORD', (getenv('DB_PASSWORD') !== false && trim((string)getenv('DB_PASSWORD')) !== '') ? 'SET' : 'NOT_SET');
$healthLog('DB_SSL_CA_ENV', DB_SSL_CA !== '' ? 'SET' : 'NOT_SET');
$caExists = is_file('/etc/secrets/tidb-ca.pem');
$caReadable = $caExists && is_readable('/etc/secrets/tidb-ca.pem');
$healthLog('CA_FILE_EXISTS', $caExists ? 'PASS' : 'FAIL');
$healthLog('CA_FILE_READABLE', $caReadable ? 'PASS' : 'FAIL');

$dnsOk = false;
$resolvedHost = @gethostbyname(DB_HOST);
if (is_string($resolvedHost)) {
    $dnsOk = $resolvedHost !== '' && $resolvedHost !== DB_HOST;
}
$healthLog('DNS', $dnsOk ? 'PASS' : 'FAIL');

$tcpOk = false;
$socket = @fsockopen(DB_HOST, (int)DB_PORT, $socketErrno, $socketError, 3);
if (is_resource($socket)) {
    $tcpOk = true;
    fclose($socket);
}
$healthLog('TCP', $tcpOk ? 'PASS' : 'FAIL');

try {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
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
    $healthLog('PDO', 'PASS');
    $pdo->query('SELECT 1');
    echo json_encode(['status' => 'ok'], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    $category = 'UNKNOWN_DB_ERROR';
    if (DB_SSL_ENABLED && (DB_SSL_CA === '' || !$caExists || !$caReadable || !is_file(DB_SSL_CA) || !is_readable(DB_SSL_CA))) {
        $category = 'CA_FILE_FAILED';
    } elseif (!$dnsOk || !$tcpOk) {
        $category = 'NETWORK_FAILED';
    } elseif ($e instanceof PDOException) {
        $code = (string)$e->getCode();
        $message = strtolower($e->getMessage());
        if ($code === '1045' || $code === '28000' || str_contains($message, 'access denied')) {
            $category = 'AUTHENTICATION_FAILED';
        } elseif ($code === '1049' || str_contains($message, 'unknown database')) {
            $category = 'DATABASE_NOT_FOUND';
        } elseif (str_contains($message, 'ssl') || str_contains($message, 'tls') || str_contains($message, 'certificate') || str_contains($message, 'handshake')) {
            $category = 'TLS_FAILED';
        } elseif (in_array($code, ['2002', '2003', '2005', '2006', '2013'], true)) {
            $category = 'NETWORK_FAILED';
        }
    }
    $healthLog('FAILURE_CATEGORY', $category);
    http_response_code(503);
    echo json_encode(['status' => 'unavailable'], JSON_UNESCAPED_SLASHES);
}
