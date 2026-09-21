<?php
require_once __DIR__ . '/../config.php';
requireAdministrator();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// Local Adminer credentials are intentionally unavailable in the deployed
// production environment. Return a safe error rather than empty credentials.
if (APP_ENV === 'production') {
    jsonResponse(['error' => 'Not available in production.'], 404);
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
auditLog(
    'BACKUP_CREDENTIALS_VIEWED',
    'Backup & Restore',
    'Local Database Credentials',
    'adminer',
    'Revealed local Adminer credentials for backup recovery.',
    'Success'
);

jsonResponse(['credentials' => localAdminerCredentials()]);
