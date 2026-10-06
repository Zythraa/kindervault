<?php
// ============================================================
// login.php – Login page
// ============================================================
require_once 'config.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if (isset($_GET['lang']) && is_string($_GET['lang']) && in_array($_GET['lang'], ['en', 'ms'], true)) {
    setLocaleCookie($_GET['lang']);
    header('Location: login.php', true, 303);
    exit;
}

function loginT(string $english, string $malay): string {
    return currentLocale() === 'ms' ? $malay : $english;
}

$sessionState = isset($_GET['session']) && is_string($_GET['session']) ? $_GET['session'] : '';
$sessionTimeoutMinutes = securityConfig()['session_timeout_minutes'];
$sessionNotice = match ($sessionState) {
    'expired' => [
        'variant' => 'expired',
        'eyebrow' => loginT('Security protection', 'Perlindungan keselamatan'),
        'title' => loginT('Session timed out', 'Sesi telah tamat'),
        'message' => loginT(
            "You were signed out after {$sessionTimeoutMinutes} minutes without activity to keep KinderVault data protected. Sign in to continue.",
            "Anda telah dilog keluar selepas {$sessionTimeoutMinutes} minit tanpa aktiviti untuk melindungi data KinderVault. Log masuk untuk meneruskan."
        ),
    ],
    'ended' => [
        'variant' => 'ended',
        'eyebrow' => loginT('Account security', 'Keselamatan akaun'),
        'title' => loginT('Session ended', 'Sesi telah berakhir'),
        'message' => loginT(
            'Your previous session is no longer authorized. Sign in again to continue securely.',
            'Sesi anda sebelum ini tidak lagi dibenarkan. Log masuk semula untuk meneruskan dengan selamat.'
        ),
    ],
    default => null,
};

if (isLoggedIn()) {
    $existingUser = currentUser();
    if ($existingUser && ($existingUser['status'] ?? '') === 'Active' && (!mfaRequiredForUser($existingUser) || !empty($_SESSION['mfa_verified_at']))) {
        header('Location: index.php', true, 303);
        exit;
    }
    clearCurrentSession();
}

if (!empty($_GET['cancel_mfa'])) {
    clearMfaLoginChallenge();
    header('Location: login.php', true, 303);
    exit;
}

$error = '';
$redirectAfterLogin = false;
$mfaChallenge = pendingMfaLoginUser();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? 'password');
    if (!isValidCsrfToken($_POST['csrf_token'] ?? null)) {
        $error = 'Your form session has expired. Please try again.';
    } elseif ($action === 'mfa') {
        $mfaChallenge = pendingMfaLoginUser();
        if (!$mfaChallenge) {
            $error = 'Your MFA sign-in session has expired. Please enter your username and password again.';
        } else {
            $verification = verifyMfaLoginCode($mfaChallenge, (string)($_POST['mfa_code'] ?? ''));
            if (!empty($verification['valid'])) {
                completeLoginSession($mfaChallenge);
                auditLog('LOGIN', 'Authentication', 'User', 'USER-' . $mfaChallenge['id'], 'Successfully logged in with multi-factor authentication.', 'Success', [
                    'mfa_method' => $verification['method'] ?? 'Authenticator app',
                ], $mfaChallenge);
                $redirectAfterLogin = true;
                $mfaChallenge = null;
            } else {
                $security = securityConfig();
                $failedCount = (int)$mfaChallenge['failed_login_count'] + 1;
                $lockedUntil = null;
                $accountLocked = false;
                if ($failedCount >= $security['max_failed_logins']) {
                    $lockedUntil = date('Y-m-d H:i:s', time() + ($security['lockout_minutes'] * 60));
                    $failedCount = 0;
                    $accountLocked = true;
                }
                $failed = db()->prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?');
                $failed->execute([$failedCount, $lockedUntil, $mfaChallenge['id']]);
                $_SESSION['mfa_pending_attempts'] = (int)($_SESSION['mfa_pending_attempts'] ?? 0) + 1;
                $tooManyAttempts = $accountLocked || $_SESSION['mfa_pending_attempts'] >= 5;
                auditLog('MFA_CHALLENGE_FAILED', 'Authentication', 'User', 'USER-' . $mfaChallenge['id'], 'Failed multi-factor authentication challenge.', 'Failed', [
                    'account_locked' => $accountLocked,
                ], $mfaChallenge);
                if ($tooManyAttempts) {
                    clearMfaLoginChallenge();
                    $mfaChallenge = null;
                    $error = $accountLocked
                        ? 'Too many failed sign-in attempts. Your account has been temporarily locked.'
                        : 'Too many MFA attempts. Please sign in again.';
                } else {
                    $error = $verification['reason'] ?? 'Invalid authentication code.';
                }
            }
        }
    } else {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        if (!$username || !$password) {
            $error = 'Please enter both username and password.';
        } else {
            $stmt = db()->prepare("\n                SELECT id, username, full_name, password, role, status, language, failed_login_count, locked_until,
                       mfa_enabled, mfa_secret_encrypted, mfa_recovery_codes_json, mfa_confirmed_at, mfa_last_used_counter
                FROM users\n                WHERE username = ?\n                LIMIT 1\n            ");
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            $security = securityConfig();
            $actor = [
                'id' => $user['id'] ?? null,
                'username' => $user['username'] ?? $username,
                'full_name' => $user['full_name'] ?? $username,
                'role' => $user['role'] ?? 'Unknown',
            ];
            $locked = $user && !empty($user['locked_until']) && strtotime($user['locked_until']) > time();

            if ($user && !$locked && $user['status'] === 'Active' && password_verify($password, $user['password'])) {
                if (mfaRequiredForUser($user)) {
                    if (empty($user['mfa_enabled']) || empty($user['mfa_secret_encrypted'])) {
                        auditLog('MFA_ENROLLMENT_REQUIRED', 'Authentication', 'User', 'USER-' . $user['id'], 'Sign-in stopped because this Administrator must enroll in MFA.', 'Failed', [], $actor);
                        $error = 'Multi-factor authentication must be set up for this account before it can sign in. Ask another Administrator to temporarily turn off MFA enforcement so you can enroll.';
                    } else {
                        beginMfaLoginChallenge($user);
                        auditLog('MFA_CHALLENGE_STARTED', 'Authentication', 'User', 'USER-' . $user['id'], 'Started multi-factor authentication challenge.', 'Success', [], $actor);
                        header('Location: login.php?mfa=1', true, 303);
                        exit;
                    }
                } else {
                    completeLoginSession($user);
                    auditLog('LOGIN', 'Authentication', 'User', 'USER-' . $user['id'], 'Successfully logged in.', 'Success', [], $actor);
                    $redirectAfterLogin = true;
                }
            } else {
                if ($user && !$locked && $user['status'] === 'Active') {
                    $failedCount = (int)$user['failed_login_count'] + 1;
                    $lockedUntil = null;
                    if ($failedCount >= $security['max_failed_logins']) {
                        $lockedUntil = date('Y-m-d H:i:s', time() + ($security['lockout_minutes'] * 60));
                        $failedCount = 0;
                    }
                    $failed = db()->prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?');
                    $failed->execute([$failedCount, $lockedUntil, $user['id']]);
                }
                auditLog('LOGIN_FAILED', 'Authentication', 'User', $user ? 'USER-' . $user['id'] : $username, 'Failed login attempt.', 'Failed', [
                    'account_locked' => $locked,
                ], $actor);
                $error = 'Invalid username or password.';
            }
        }
    }
}

if ($error !== '') {
    $error = localizedServerMessage($error);
}

if ($redirectAfterLogin) {
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars(currentLocale(), ENT_QUOTES, 'UTF-8') ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars(loginT('Opening KinderVault', 'Membuka KinderVault'), ENT_QUOTES, 'UTF-8') ?></title>
</head>
<body>
  <script>
    window.history.replaceState(null, '', 'index.php');
    window.location.replace('index.php');
  </script>
  <noscript><meta http-equiv="refresh" content="0;url=index.php"></noscript>
</body>
</html>
<?php
    exit;
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars(currentLocale(), ENT_QUOTES, 'UTF-8') ?>" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars(loginT('Sign In', 'Log Masuk'), ENT_QUOTES, 'UTF-8') ?> | KinderVault</title>
  <meta name="theme-color" content="#6B3FA0">
  <link rel="icon" href="assets/img/kindervault-mark.svg?v=1" type="image/svg+xml">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/app.css?v=29">
  <script>
    const t = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  </script>
</head>
<body>
<div class="login-bg">
  <div class="login-card">
    <div class="kv-login-brand" style="text-align:center;margin-bottom:2px;font-size:28px;font-weight:700;color:var(--color-text-primary);">
      Kinder<span style="color:#6B3FA0;">Vault</span>
    </div>
    <div class="kv-login-school" style="text-align:center;font-size:11px;color:var(--color-text-tertiary);margin-bottom:26px;line-height:1.4;">
      <?= htmlspecialchars(SCHOOL) ?>
    </div>
    <?php if ($error): ?>
    <div class="kv-login-error" style="background:#FCEBEB;color:#791F1F;border-radius:8px;padding:9px 14px;font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:6;">
      <i class="ti ti-alert-triangle"></i> <?= htmlspecialchars($error) ?>
    </div>
    <?php endif; ?>
    <?php if ($sessionNotice && !$error): ?>
    <div class="kv-login-session-notice is-<?= htmlspecialchars($sessionNotice['variant'], ENT_QUOTES, 'UTF-8') ?>" role="status">
      <div class="kv-login-session-icon" aria-hidden="true">
        <i class="ti <?= $sessionNotice['variant'] === 'expired' ? 'ti-clock-exclamation' : 'ti-shield-lock' ?>"></i>
      </div>
      <div class="kv-login-session-copy">
        <div class="kv-login-session-eyebrow"><?= htmlspecialchars($sessionNotice['eyebrow'], ENT_QUOTES, 'UTF-8') ?></div>
        <div class="kv-login-session-title"><?= htmlspecialchars($sessionNotice['title'], ENT_QUOTES, 'UTF-8') ?></div>
        <p><?= htmlspecialchars($sessionNotice['message'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
    </div>
    <?php endif; ?>

    <?php if ($mfaChallenge): ?>
    <div class="kv-login-mfa-intro">
      <div class="kv-login-mfa-icon"><i class="ti ti-shield-lock" aria-hidden="true"></i></div>
      <div>
        <div class="kv-login-mfa-title"><?= htmlspecialchars(loginT('Verify your identity', 'Sahkan identiti anda'), ENT_QUOTES, 'UTF-8') ?></div>
        <p><?= htmlspecialchars(loginT('Enter the current code from your authenticator app, or one of your recovery codes.', 'Masukkan kod semasa daripada aplikasi pengesah anda, atau salah satu kod pemulihan anda.'), ENT_QUOTES, 'UTF-8') ?></p>
      </div>
    </div>
    <form class="kv-login-form" method="POST" action="login.php" autocomplete="off">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <input type="hidden" name="action" value="mfa">
      <div class="kv-login-field" style="margin-bottom:18px;">
        <div class="kv-login-label" style="font-size:12px;font-weight:600;margin-bottom:5px;color:var(--color-text-secondary);"><?= htmlspecialchars(loginT('Authentication or recovery code', 'Kod pengesahan atau pemulihan'), ENT_QUOTES, 'UTF-8') ?></div>
        <input name="mfa_code" class="kv-input kv-mfa-login-code"
               style="width:100%;padding:10px 14px;font-size:16px;border:1px solid var(--color-border-secondary);border-radius:10px;background:var(--color-background-primary);color:var(--color-text-primary);box-sizing:border-box;font-family:inherit;transition:border-color .2s,box-shadow .2s;"
               placeholder="123456 or ABCDE-FGHIJ" autocomplete="one-time-code" spellcheck="false" required autofocus>
      </div>
      <button type="submit" class="login-btn">
        <i class="ti ti-shield-check" style="margin-right:6px;"></i> <?= htmlspecialchars(loginT('Verify and continue', 'Sahkan dan teruskan'), ENT_QUOTES, 'UTF-8') ?>
      </button>
    </form>
    <a class="kv-login-mfa-back" href="login.php?cancel_mfa=1"><i class="ti ti-arrow-left" aria-hidden="true"></i> <?= htmlspecialchars(loginT('Use a different account', 'Gunakan akaun lain'), ENT_QUOTES, 'UTF-8') ?></a>
    <?php else: ?>
    <form class="kv-login-form" method="POST" action="login.php">
      <input type="hidden" name="csrf_token" value="<?= csrfToken() ?>">
      <input type="hidden" name="action" value="password">

      <div class="kv-login-field" style="margin-bottom:14px;">
        <div class="kv-login-label" style="font-size:12px;font-weight:600;margin-bottom:5px;color:var(--color-text-secondary);"><?= htmlspecialchars(loginT('Username', 'Nama pengguna'), ENT_QUOTES, 'UTF-8') ?></div>
        <input name="username" value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
               class="kv-input"
               style="width:100%;padding:10px 14px;font-size:13px;border:1px solid var(--color-border-secondary);border-radius:10px;background:var(--color-background-primary);color:var(--color-text-primary);box-sizing:border-box;font-family:inherit;transition:border-color .2s,box-shadow .2s;"
               placeholder="<?= htmlspecialchars(loginT('Enter your username', 'Masukkan nama pengguna anda'), ENT_QUOTES, 'UTF-8') ?>" autocomplete="username" required autofocus>
      </div>

      <div class="kv-login-field" style="margin-bottom:22px;">
        <div class="kv-login-label" style="font-size:12px;font-weight:600;margin-bottom:5px;color:var(--color-text-secondary);"><?= htmlspecialchars(loginT('Password', 'Kata laluan'), ENT_QUOTES, 'UTF-8') ?></div>
        <input type="password" name="password"
               class="kv-input"
               style="width:100%;padding:10px 14px;font-size:13px;border:1px solid var(--color-border-secondary);border-radius:10px;background:var(--color-background-primary);color:var(--color-text-primary);box-sizing:border-box;font-family:inherit;transition:border-color .2s,box-shadow .2s;"
               placeholder="********" required>
      </div>

      <button type="submit" class="login-btn">
        <i class="ti ti-lock-open" style="margin-right:6px;"></i> <?= htmlspecialchars(loginT('Login to KinderVault', 'Log Masuk ke KinderVault'), ENT_QUOTES, 'UTF-8') ?>
      </button>
    </form>

    <?php if (KINDERVAULT_DEMO_MODE): ?>
    <aside class="kv-demo-account" aria-labelledby="kv-demo-account-title">
      <div class="kv-demo-account-heading">
        <i class="ti ti-info-circle" aria-hidden="true"></i>
        <h2 id="kv-demo-account-title">Demo Account</h2>
      </div>
      <dl class="kv-demo-account-credentials">
        <div>
          <dt>Username</dt>
          <dd>admin</dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>password</dd>
        </div>
      </dl>
      <p>For demonstration purposes only.</p>
    </aside>
    <?php endif; ?>

    <div class="kv-login-note" style="text-align:center;font-size:11px;color:var(--color-text-tertiary);margin-top:14px;">
      <?= htmlspecialchars(loginT('Secure access for authorized KinderVault staff.', 'Akses selamat untuk kakitangan KinderVault yang diberi kuasa.'), ENT_QUOTES, 'UTF-8') ?>
    </div>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
