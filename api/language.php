<?php
require_once __DIR__ . '/../config.php';
requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireCsrfToken();
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$requested = $data['locale'] ?? $data['language'] ?? null;
if (!in_array($requested, ['en', 'ms'], true)) {
    jsonResponse(['error' => 'Please select a valid language.'], 422);
}

$user = currentUser();
if (!$user) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$locale = saveCurrentUserLocale($requested);
if (($user['language'] ?? DEFAULT_LOCALE) !== $locale) {
    auditLog('LANGUAGE_CHANGED', 'Settings', 'Language', 'locale', 'Changed the display language preference.', 'Success');
}

$updated = currentUser();
jsonResponse([
    'success' => true,
    'locale' => $locale,
    'user' => $updated ? publicUser($updated) : null,
]);
