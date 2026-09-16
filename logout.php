<?php
// ============================================================
// logout.php – Destroy session and redirect to login
// ============================================================
require_once 'config.php';

$logoutReason = isset($_GET['reason']) && is_string($_GET['reason']) ? $_GET['reason'] : '';
$timedOut = $logoutReason === 'timeout';

if (isLoggedIn()) {
    $user = currentUser();
    if ($user) {
        auditLog(
            $timedOut ? 'SESSION_TIMEOUT' : 'LOGOUT',
            $timedOut ? 'Security' : 'Authentication',
            $timedOut ? 'Session' : 'User',
            $timedOut ? (string)$user['id'] : 'USER-' . $user['id'],
            $timedOut ? 'Session ended after the configured inactivity timeout.' : 'Signed out of KinderVault.',
            'Success',
            [],
            $user
        );
    }
}
clearCurrentSession();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Location: login.php' . ($timedOut ? '?session=expired' : ''), true, 303);
exit;
