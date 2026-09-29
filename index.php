<?php

require_once 'config.php';
requireLogin();

if (($_GET['page'] ?? '') === 'settings' && !hasPermission('settings.access')) {
    requirePermission('settings.access');
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$userName = htmlspecialchars($_SESSION['full_name'] ?? 'Administrator');
$csrfToken = csrfToken();
$locale = currentLocale();
$jsVersion = (string)filemtime(__DIR__ . '/assets/js/dist/app.js');
$description = $locale === 'ms'
    ? 'KinderVault: sistem pengurusan prasekolah lengkap untuk ' . SCHOOL
    : 'KinderVault: a complete preschool management system for ' . SCHOOL;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($locale, ENT_QUOTES, 'UTF-8') ?>" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KinderVault</title>
  <meta name="description" content="<?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?>">
  <meta name="theme-color" content="#6B3FA0">
  <link rel="icon" href="assets/img/kindervault-mark.svg?v=1" type="image/svg+xml">

  <!-- Tabler Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- App CSS -->
  <link rel="stylesheet" href="assets/css/app.css?v=60">

  <!-- React 18 production runtime -->
  <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin></script>
  <!-- Generates MFA QR codes locally in the browser; the enrollment secret is never sent to a QR service. -->
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

  <!-- Restore saved theme immediately to prevent flash -->
  <script>
    const _t = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', _t);
    window.KV_LOCALE = <?= json_encode($locale) ?>;
    document.documentElement.setAttribute('lang', window.KV_LOCALE);
    window.KV_SCANNER_ENABLED = <?= json_encode(SCANNER_ENABLED) ?>;
    window.KV_APP_ENV = <?= json_encode(APP_ENV) ?>;
    window.KV_BOOTSTRAP = {
      userName: <?= json_encode($userName, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>,
      locale: <?= json_encode($locale) ?>,
      sessionTimeoutSeconds: <?= json_encode(securityConfig()['session_timeout_minutes'] * 60) ?>,
      csrfToken: <?= json_encode($csrfToken, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>
    };
    window.KV_CSRF_TOKEN = window.KV_BOOTSTRAP.csrfToken;
  </script>
</head>
<body>
<div id="root"></div>

<!-- Compiled production scripts; order preserves the existing global component API. -->
<script src="assets/js/dist/shared.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/dashboard.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/classes.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<?php if (SCANNER_ENABLED && is_file(__DIR__ . '/assets/js/dev/registration_scanner.js')): ?>
<script src="assets/js/dev/registration_scanner.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<?php endif; ?>
<script src="assets/js/dist/students.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/payments.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/receipts.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/development.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/backup.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/settings.js?v=<?= rawurlencode($jsVersion) ?>"></script>
<script src="assets/js/dist/app.js?v=<?= rawurlencode($jsVersion) ?>"></script>

</body>
</html>
