<?php
require_once __DIR__ . '/../config.php';
requireAdministrator();

function auditRecordPayload(array $row, bool $includeMetadata = false): array {
    $payload = [
        'id' => (int)$row['id'],
        'user_id' => $row['user_id'] === null ? null : (int)$row['user_id'],
        'username_snapshot' => $row['username_snapshot'],
        'user_name_snapshot' => $row['user_name_snapshot'],
        'user_role_snapshot' => $row['user_role_snapshot'],
        'action' => $row['action'],
        'module' => $row['module'],
        'record_type' => $row['record_type'],
        'record_id' => $row['record_id'],
        'description' => $row['description'],
        'ip_address' => $row['ip_address'],
        'user_agent' => $row['user_agent'],
        'status' => $row['status'],
        'created_at' => $row['created_at'],
    ];
    if ($includeMetadata) {
        $metadata = json_decode($row['metadata_json'] ?? '', true);
        $payload['metadata'] = is_array($metadata) ? sanitizeAuditMetadata($metadata) : [];
    }
    return $payload;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id > 0) {
    $stmt = db()->prepare('SELECT * FROM audit_logs WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $record = $stmt->fetch();
    if (!$record) {
        jsonResponse(['error' => 'Audit record not found.'], 404);
    }
    jsonResponse(['record' => auditRecordPayload($record, true)]);
}

$where = [];
$params = [];
$from = trim((string)($_GET['from'] ?? ''));
$to = trim((string)($_GET['to'] ?? ''));
$query = trim((string)($_GET['q'] ?? ''));
$userId = (int)($_GET['user_id'] ?? 0);

if ($from !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
    $where[] = 'created_at >= ?';
    $params[] = $from . ' 00:00:00';
}
if ($to !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
    $where[] = 'created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    $params[] = $to;
}
if ($userId > 0) {
    $where[] = 'user_id = ?';
    $params[] = $userId;
}
foreach (['role' => 'user_role_snapshot', 'module' => 'module', 'action' => 'action', 'status' => 'status'] as $filter => $column) {
    $value = trim((string)($_GET[$filter] ?? ''));
    if ($value !== '' && strlen($value) <= 100) {
        $where[] = $column . ' = ?';
        $params[] = $value;
    }
}
if ($query !== '') {
    $where[] = "CONCAT_WS(' ', username_snapshot, user_name_snapshot, user_role_snapshot, module, action, record_id, description) LIKE ?";
    $params[] = '%' . substr($query, 0, 100) . '%';
}

$whereSql = $where ? implode(' AND ', $where) : '1=1';
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(100, max(10, (int)($_GET['per_page'] ?? 25)));
$includeDetails = filter_var($_GET['include_details'] ?? false, FILTER_VALIDATE_BOOLEAN);

$count = db()->prepare('SELECT COUNT(*) FROM audit_logs WHERE ' . $whereSql);
$count->execute($params);
$total = (int)$count->fetchColumn();
$page = min($page, max(1, (int)ceil($total / $perPage)));
$offset = ($page - 1) * $perPage;

$records = db()->prepare('SELECT * FROM audit_logs WHERE ' . $whereSql . ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?');
foreach ($params as $index => $value) {
    $records->bindValue($index + 1, $value);
}
$records->bindValue(count($params) + 1, $perPage, PDO::PARAM_INT);
$records->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
$records->execute();

$summary = db()->query("
    SELECT
        COUNT(*) AS total_records,
        SUM(DATE(created_at) = CURDATE()) AS today_activities,
        SUM(action = 'LOGIN_FAILED' AND status = 'Failed') AS failed_logins,
        SUM(action IN ('ACCESS_DENIED', 'PASSWORD_RESET', 'ROLE_CHANGED', 'PERMISSIONS_CHANGED', 'ROLE_PERMISSIONS_CHANGED', 'ACCOUNT_DEACTIVATED', 'SESSION_TIMEOUT')) AS security_events
    FROM audit_logs
")->fetch() ?: [];

jsonResponse([
    'records' => array_map(
        fn(array $record): array => auditRecordPayload($record, $includeDetails),
        $records->fetchAll()
    ),
    'summary' => [
        'total_records' => (int)($summary['total_records'] ?? 0),
        'today_activities' => (int)($summary['today_activities'] ?? 0),
        'failed_logins' => (int)($summary['failed_logins'] ?? 0),
        'security_events' => (int)($summary['security_events'] ?? 0),
    ],
    'pagination' => [
        'page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'total_pages' => max(1, (int)ceil($total / $perPage)),
    ],
]);
