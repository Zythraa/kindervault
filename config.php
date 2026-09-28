<?php
// ============================================================
// config.php – Database connection & session helper
// ============================================================

// ── Environment-based configuration ──────────────────────
// Reads from environment variables when set (Render deployment).
// Falls back to WampServer local defaults when not set.
// Local development: no .env file needed — defaults work as-is.
function envFlag(string $name, bool $default): bool {
    $value = getenv($name);
    if ($value === false || trim((string)$value) === '') {
        return $default;
    }
    return !in_array(strtolower(trim((string)$value)), ['0', 'false', 'off', 'no'], true);
}

define('APP_ENV',    (string)(getenv('APP_ENV')  ?: 'local'));   // 'local' | 'production'
define('APP_DEBUG',  envFlag('APP_DEBUG', APP_ENV !== 'production'));
define('SCANNER_ENABLED', envFlag('SCANNER_ENABLED', true)); // false on Render, true locally

// ── Database ──────────────────────────────────────────────
define('DB_HOST',    (string)(getenv('DB_HOST')     ?: 'localhost'));
// WampServer's bundled MariaDB uses port 3307 in this installation. Render
// deployments should always provide DB_PORT explicitly through the dashboard.
define('DB_PORT',    (string)(getenv('DB_PORT')     ?: '3306'));
define('DB_NAME',    (string)(getenv('DB_NAME')     ?: 'kindervault'));
define('DB_USER',    (string)(getenv('DB_USER')     ?: 'root'));
define('DB_PASS',    (string)(getenv('DB_PASSWORD') ?: ''));  // Local WampServer default: empty
define('DB_CHARSET', 'utf8mb4');
// TLS is opt-in for local WampServer compatibility and required explicitly for hosted TiDB/MySQL deployments.
define('DB_SSL_ENABLED', envFlag('DB_SSL_ENABLED', false));
define('DB_SSL_CA', trim((string)(getenv('DB_SSL_CA') ?: '')));
define('DEFAULT_LOCALE', 'en');

// ── Application ───────────────────────────────────────────
define('SCHOOL', 'Tadika Permata Intelek Ceria & Taska Rahiza');
define('ADDR',   'No. 12, Jalan Ceria, 43000 Kajang, Selangor');
define('APP_VERSION', '1.0');
define('MFA_ISSUER', 'KinderVault');
// Chatbot implementation is retained for possible future redevelopment, but
// it is not exposed or callable in the deployed application.
define('CHATBOT_FEATURE_AVAILABLE', false);
// LOCAL_ADMINER_* credentials are used only in local development; Adminer is not deployed to Render.
define('LOCAL_ADMINER_USERNAME', (string)(getenv('LOCAL_ADMINER_USERNAME') ?: 'kindervault_admin'));
// Never commit an Adminer password. Set LOCAL_ADMINER_PASSWORD only in the
// local environment when the credential endpoint is needed.
define('LOCAL_ADMINER_PASSWORD', (string)(getenv('LOCAL_ADMINER_PASSWORD') ?: ''));

// ── Production error handling ──────────────────────────────
// Errors are always logged; display is suppressed in production.
if (!APP_DEBUG) {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL);
    ini_set('log_errors', '1');
}

function localAdminerCredentials(): array {
    return [
        'url' => 'http://localhost/adminer/',
        'server' => 'localhost',
        'username' => LOCAL_ADMINER_USERNAME,
        'password' => LOCAL_ADMINER_PASSWORD,
        'database' => DB_NAME,
    ];
}

function normalizeLocale(mixed $locale): string {
    return $locale === 'ms' ? 'ms' : DEFAULT_LOCALE;
}

function setLocaleCookie(string $locale): void {
    if (headers_sent()) {
        return;
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((int)($_SERVER['SERVER_PORT'] ?? 0) === 443);
    setcookie('kv_locale', normalizeLocale($locale), [
        'expires' => time() + 31536000,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

function currentLocale(): string {
    return normalizeLocale($_SESSION['locale'] ?? $_COOKIE['kv_locale'] ?? DEFAULT_LOCALE);
}

function saveCurrentUserLocale(string $locale): string {
    $locale = normalizeLocale($locale);
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if ($userId > 0) {
        $stmt = db()->prepare('UPDATE users SET language = ? WHERE id = ?');
        $stmt->execute([$locale, $userId]);
    }
    $_SESSION['locale'] = $locale;
    setLocaleCookie($locale);
    return $locale;
}

// ── PDO connection (singleton) ────────────────────────────
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            if (DB_SSL_ENABLED) {
                if (DB_SSL_CA === '' || !is_file(DB_SSL_CA) || !is_readable(DB_SSL_CA)) {
                    throw new PDOException('Database TLS CA certificate is unavailable.');
                }
                $options[PDO::MYSQL_ATTR_SSL_CA] = DB_SSL_CA;
                if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
                    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
                }
            }
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            ensureKinderVaultSchema($pdo);
        } catch (PDOException $e) {
            http_response_code(500);
            // Never expose connection details (host, credentials) to the client in production.
            $detail = APP_DEBUG ? $e->getMessage() : 'Check server logs for details.';
            die(json_encode(['error' => 'Database connection failed. ' . $detail]));
        }
    }
    return $pdo;
}

function ensureKinderVaultSchema(PDO $pdo): void {
    static $ensured = false;
    if ($ensured) return;
    $ensured = true;

    $columns = $pdo->query('SHOW COLUMNS FROM students')->fetchAll(PDO::FETCH_COLUMN);
    $needed = [
        'birth_cert' => "ALTER TABLE students ADD COLUMN birth_cert VARCHAR(30) DEFAULT '' AFTER ic",
        'child_position' => "ALTER TABLE students ADD COLUMN child_position VARCHAR(20) DEFAULT '' AFTER dob",
        'program_age' => "ALTER TABLE students ADD COLUMN program_age VARCHAR(10) DEFAULT '' AFTER child_position",
        'father_name' => "ALTER TABLE students ADD COLUMN father_name VARCHAR(120) DEFAULT '' AFTER parent",
        'father_ic' => "ALTER TABLE students ADD COLUMN father_ic VARCHAR(30) DEFAULT '' AFTER father_name",
        'father_address' => "ALTER TABLE students ADD COLUMN father_address TEXT DEFAULT NULL AFTER father_ic",
        'father_job' => "ALTER TABLE students ADD COLUMN father_job VARCHAR(120) DEFAULT '' AFTER father_address",
        'father_employer' => "ALTER TABLE students ADD COLUMN father_employer VARCHAR(160) DEFAULT '' AFTER father_job",
        'father_phone' => "ALTER TABLE students ADD COLUMN father_phone VARCHAR(20) DEFAULT '' AFTER father_employer",
        'mother_name' => "ALTER TABLE students ADD COLUMN mother_name VARCHAR(120) DEFAULT '' AFTER father_phone",
        'mother_ic' => "ALTER TABLE students ADD COLUMN mother_ic VARCHAR(30) DEFAULT '' AFTER mother_name",
        'mother_address' => "ALTER TABLE students ADD COLUMN mother_address TEXT DEFAULT NULL AFTER mother_ic",
        'mother_job' => "ALTER TABLE students ADD COLUMN mother_job VARCHAR(120) DEFAULT '' AFTER mother_address",
        'mother_employer' => "ALTER TABLE students ADD COLUMN mother_employer VARCHAR(160) DEFAULT '' AFTER mother_job",
        'mother_phone' => "ALTER TABLE students ADD COLUMN mother_phone VARCHAR(20) DEFAULT '' AFTER mother_employer",
    ];

    foreach ($needed as $name => $sql) {
        if (!in_array($name, $columns, true)) {
            $pdo->exec($sql);
        }
    }

    if (!$pdo->query("SHOW TABLES LIKE 'app_settings'")->fetchColumn()) {
        $pdo->exec("
            CREATE TABLE app_settings (
                `key` VARCHAR(80) PRIMARY KEY,
                value_json LONGTEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }

    $studentExtra = $pdo->query('SHOW COLUMNS FROM students')->fetchAll(PDO::FETCH_COLUMN);
    $studentSettings = [
        'monthly_package' => "ALTER TABLE students ADD COLUMN monthly_package VARCHAR(10) DEFAULT 'A' AFTER program_age",
        'wants_uniform' => "ALTER TABLE students ADD COLUMN wants_uniform TINYINT(1) DEFAULT 1 AFTER monthly_package",
        'wants_sports_uniform' => "ALTER TABLE students ADD COLUMN wants_sports_uniform TINYINT(1) DEFAULT 1 AFTER wants_uniform",
        'wants_tudung' => "ALTER TABLE students ADD COLUMN wants_tudung TINYINT(1) DEFAULT 1 AFTER wants_sports_uniform",
        'wants_iqra' => "ALTER TABLE students ADD COLUMN wants_iqra TINYINT(1) DEFAULT 0 AFTER wants_tudung",
    ];
    foreach ($studentSettings as $name => $sql) {
        if (!in_array($name, $studentExtra, true)) {
            $pdo->exec($sql);
        }
    }

    // Keep the age-group mapping independent from editable class names.
    // Existing installations are backfilled from the original class names.
    $classColumns = $pdo->query('SHOW COLUMNS FROM classes')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('age_group', $classColumns, true)) {
        $pdo->exec("ALTER TABLE classes ADD COLUMN age_group TINYINT UNSIGNED NULL AFTER name");
    }
    foreach ([4 => 'Permata', 5 => 'Intelek', 6 => 'Ceria'] as $ageGroup => $defaultName) {
        $stmt = $pdo->prepare('UPDATE classes SET age_group = ? WHERE age_group IS NULL AND name = ?');
        $stmt->execute([$ageGroup, $defaultName]);
    }

    $defaultFeeConfig = [
        'annual' => [
            'registration' => 100,
            'books' => ['4' => 380, '5' => 460, '6' => 560],
            'uniform' => 65,
            'sports_uniform' => 55,
            'tudung' => 20,
            'lawatan' => 100,
            'sukan' => 60,
            'hadiah' => 100,
            'gambar' => 90,
            'iqra' => 30,
        ],
        'monthly_packages' => [
            'A' => ['label' => 'Tadika Sahaja', 'amount' => 230],
            'B' => ['label' => 'Tadika + Half Daycare', 'amount' => 320],
            'C' => ['label' => 'Tadika + Full Daycare', 'amount' => 430],
        ],
    ];

    $stmt = $pdo->prepare("INSERT IGNORE INTO app_settings (`key`, value_json) VALUES ('fee_config', ?)");
    $stmt->execute([json_encode($defaultFeeConfig, JSON_UNESCAPED_UNICODE)]);

    $userColumns = $pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_COLUMN);
    $userFields = [
        'role' => "ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'Authorized Staff' AFTER password",
        'status' => "ALTER TABLE users ADD COLUMN status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' AFTER role",
        'language' => "ALTER TABLE users ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'en' AFTER status",
        'last_login_at' => "ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL AFTER status",
        'failed_login_count' => "ALTER TABLE users ADD COLUMN failed_login_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_login_at",
        'locked_until' => "ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL AFTER failed_login_count",
        'mfa_enabled' => "ALTER TABLE users ADD COLUMN mfa_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER locked_until",
        'mfa_secret_encrypted' => "ALTER TABLE users ADD COLUMN mfa_secret_encrypted TEXT NULL AFTER mfa_enabled",
        'mfa_recovery_codes_json' => "ALTER TABLE users ADD COLUMN mfa_recovery_codes_json LONGTEXT NULL AFTER mfa_secret_encrypted",
        'mfa_confirmed_at' => "ALTER TABLE users ADD COLUMN mfa_confirmed_at DATETIME DEFAULT NULL AFTER mfa_recovery_codes_json",
        'mfa_last_used_counter' => "ALTER TABLE users ADD COLUMN mfa_last_used_counter BIGINT UNSIGNED DEFAULT NULL AFTER mfa_confirmed_at",
        'updated_at' => "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
    ];
    foreach ($userFields as $name => $sql) {
        if (!in_array($name, $userColumns, true)) {
            $pdo->exec($sql);
        }
    }

    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS roles (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            name VARCHAR(50) NOT NULL UNIQUE,\n            description VARCHAR(180) NOT NULL DEFAULT '',\n            permissions_json LONGTEXT NOT NULL,\n            is_system TINYINT(1) NOT NULL DEFAULT 1,\n            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4\n    ");

    $roleInsert = $pdo->prepare("\n        INSERT IGNORE INTO roles (name, description, permissions_json, is_system)\n        VALUES (?, ?, ?, 1)\n    ");
    foreach (defaultRoleDefinitions() as $role) {
        $roleInsert->execute([
            $role['name'],
            $role['description'],
            json_encode($role['permissions'], JSON_UNESCAPED_UNICODE),
        ]);
    }

    $administratorCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='Administrator' AND status='Active'")->fetchColumn();
    if ($administratorCount === 0) {
        $promote = $pdo->prepare("UPDATE users SET role='Administrator', status='Active' WHERE username='admin' LIMIT 1");
        $promote->execute();
        if ($promote->rowCount() === 0) {
            $pdo->exec("UPDATE users SET role='Administrator', status='Active' ORDER BY id LIMIT 1");
        }
    }

    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS user_permission_overrides (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            user_id INT NOT NULL,\n            permission VARCHAR(100) NOT NULL,\n            granted TINYINT(1) NOT NULL DEFAULT 1,\n            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n            UNIQUE KEY uq_user_permission (user_id, permission),\n            INDEX idx_permission_user (permission, user_id),\n            CONSTRAINT fk_user_permission_override_user\n                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4\n    ");

    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS audit_logs (\n            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n            user_id INT DEFAULT NULL,\n            username_snapshot VARCHAR(100) NOT NULL DEFAULT '',\n            user_name_snapshot VARCHAR(150) NOT NULL DEFAULT '',\n            user_role_snapshot VARCHAR(50) NOT NULL DEFAULT '',\n            action VARCHAR(80) NOT NULL,\n            module VARCHAR(100) NOT NULL DEFAULT '',\n            record_type VARCHAR(100) NOT NULL DEFAULT '',\n            record_id VARCHAR(100) NOT NULL DEFAULT '',\n            description TEXT NOT NULL,\n            metadata_json LONGTEXT NULL,\n            ip_address VARCHAR(64) NOT NULL DEFAULT '',\n            user_agent VARCHAR(500) NOT NULL DEFAULT '',\n            status VARCHAR(20) NOT NULL DEFAULT 'Success',\n            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n            INDEX idx_audit_created_at (created_at),\n            INDEX idx_audit_user_id (user_id),\n            INDEX idx_audit_module_action (module, action),\n            INDEX idx_audit_status (status),\n            CONSTRAINT fk_audit_log_user\n                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4\n    ");

    $securityDefaults = defaultSecurityConfig();
    $securityStmt = $pdo->prepare("INSERT IGNORE INTO app_settings (`key`, value_json) VALUES ('security_config', ?)");
    $securityStmt->execute([json_encode($securityDefaults, JSON_UNESCAPED_UNICODE)]);

    ensureDefaultClasses($pdo);
}

function ensureDefaultClasses(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    $done = true;

    $map = [
        'Tadika 4A' => 'Permata',
        'Tadika 4B' => 'Permata',
        'Permata'   => 'Permata',
        'Tadika 5A' => 'Intelek',
        'Tadika 5B' => 'Intelek',
        'Intelek'   => 'Intelek',
        'Tadika 6A' => 'Ceria',
        'Tadika 6B' => 'Ceria',
        'Ceria'     => 'Ceria',
    ];

    $pdo->beginTransaction();
    try {
        foreach ($map as $from => $to) {
            if ($from !== $to) {
                $stmt = $pdo->prepare('UPDATE students SET class=? WHERE class=?');
                $stmt->execute([$to, $from]);
            }
        }

        // Keep existing administrator-created classes. The unique key and
        // INSERT IGNORE make this bootstrap safe to run repeatedly without
        // deleting or duplicating class records.
        $stmt = $pdo->prepare('INSERT IGNORE INTO classes (name) VALUES (?), (?), (?)');
        $stmt->execute(['Permata', 'Intelek', 'Ceria']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
    }
}

function permissionCatalog(): array {
    return [
        ['key' => 'dashboard.view', 'group' => 'Dashboard', 'label' => 'View dashboard'],
        ['key' => 'students.view', 'group' => 'Student Management', 'label' => 'View students'],
        ['key' => 'students.create', 'group' => 'Student Management', 'label' => 'Add students'],
        ['key' => 'students.update', 'group' => 'Student Management', 'label' => 'Edit students'],
        ['key' => 'students.delete', 'group' => 'Student Management', 'label' => 'Delete students'],
        ['key' => 'classes.view', 'group' => 'Class Management', 'label' => 'View classes'],
        ['key' => 'classes.manage', 'group' => 'Class Management', 'label' => 'Manage classes'],
        ['key' => 'payments.view', 'group' => 'Payment Management', 'label' => 'View payments'],
        ['key' => 'payments.create', 'group' => 'Payment Management', 'label' => 'Record payments'],
        ['key' => 'payments.update', 'group' => 'Payment Management', 'label' => 'Edit payments'],
        ['key' => 'payments.delete', 'group' => 'Payment Management', 'label' => 'Delete or cancel payments'],
        ['key' => 'receipts.view', 'group' => 'Receipt Management', 'label' => 'View receipts'],
        ['key' => 'receipts.print', 'group' => 'Receipt Management', 'label' => 'Print or download receipts'],
        ['key' => 'development.view', 'group' => 'Student Development', 'label' => 'View development records'],
        ['key' => 'development.create', 'group' => 'Student Development', 'label' => 'Add development records'],
        ['key' => 'development.update', 'group' => 'Student Development', 'label' => 'Edit development records'],
        ['key' => 'development.delete', 'group' => 'Student Development', 'label' => 'Delete development records'],
        ['key' => 'search.use', 'group' => 'Workspace', 'label' => 'Use global search'],
        ['key' => 'chatbot.use', 'group' => 'Workspace', 'label' => 'Use KinderVault chatbot'],
        ['key' => 'backup.access', 'group' => 'Backup & Restore', 'label' => 'Create database backups'],
        ['key' => 'settings.access', 'group' => 'Settings', 'label' => 'Access general settings'],
    ];
}

function permissionKeys(): array {
    return array_column(permissionCatalog(), 'key');
}

function defaultRoleDefinitions(): array {
    return [
        [
            'name' => 'Administrator',
            'description' => 'Full access to all KinderVault features and security records.',
            'permissions' => ['*'],
        ],
        [
            'name' => 'Teacher',
            'description' => 'Student viewing and student development work by default.',
            'permissions' => [
                'dashboard.view',
                'students.view',
                'development.view',
                'development.create',
                'development.update',
                'search.use',
            ],
        ],
        [
            'name' => 'Authorized Staff',
            'description' => 'A restricted role that an administrator can configure.',
            'permissions' => ['dashboard.view', 'search.use'],
        ],
    ];
}

function defaultRolePermissions(string $role): array {
    foreach (defaultRoleDefinitions() as $definition) {
        if ($definition['name'] === $role) {
            return $definition['permissions'];
        }
    }
    return defaultRoleDefinitions()[2]['permissions'];
}

function defaultSecurityConfig(): array {
    return [
        'session_timeout_minutes' => 60,
        'password_min_length' => 8,
        'require_mixed_case' => false,
        'require_number' => false,
        'max_failed_logins' => 5,
        'lockout_minutes' => 15,
        'mfa_required_for_administrators' => false,
        'chatbot_enabled' => false,
    ];
}

function appSetting(string $key, mixed $default = null): mixed {
    $stmt = db()->prepare('SELECT value_json FROM app_settings WHERE `key` = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) {
        return $default;
    }

    $decoded = json_decode($row['value_json'], true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
}

function saveAppSetting(string $key, mixed $value): void {
    $stmt = db()->prepare("\n        INSERT INTO app_settings (`key`, value_json) VALUES (?, ?)\n        ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)\n    ");
    $stmt->execute([$key, json_encode($value, JSON_UNESCAPED_UNICODE)]);
}

function normalizeSecurityConfig(array $input): array {
    $defaults = defaultSecurityConfig();
    $config = array_merge($defaults, array_intersect_key($input, $defaults));

    $config['session_timeout_minutes'] = max(5, min(1440, (int)$config['session_timeout_minutes']));
    $config['password_min_length'] = max(8, min(128, (int)$config['password_min_length']));
    $config['max_failed_logins'] = max(3, min(20, (int)$config['max_failed_logins']));
    $config['lockout_minutes'] = max(1, min(1440, (int)$config['lockout_minutes']));
    $config['require_mixed_case'] = !empty($config['require_mixed_case']);
    $config['require_number'] = !empty($config['require_number']);
    $config['mfa_required_for_administrators'] = !empty($config['mfa_required_for_administrators']);
    $config['chatbot_enabled'] = CHATBOT_FEATURE_AVAILABLE && !empty($config['chatbot_enabled']);

    return $config;
}

function securityConfig(): array {
    $stored = appSetting('security_config', []);
    return normalizeSecurityConfig(is_array($stored) ? $stored : []);
}

function chatbotFeatureAvailable(): bool {
    return CHATBOT_FEATURE_AVAILABLE;
}

function chatbotIsEnabled(): bool {
    return chatbotFeatureAvailable() && !empty(securityConfig()['chatbot_enabled']);
}

function mfaKeyFilePath(): string {
    $configured = trim((string)(getenv('KINDERVAULT_MFA_KEY_FILE') ?: ''));
    if ($configured !== '') {
        return $configured;
    }

    // Keep the local fallback outside the web root. Production should supply
    // MFA_ENCRYPTION_KEY (or one of the backwards-compatible aliases) instead.
    return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.kindervault-mfa.key';
}

function mfaEncryptionKey(): string {
    static $key = null;
    if (is_string($key)) {
        return $key;
    }

    $configured = trim((string)(
        getenv('MFA_ENCRYPTION_KEY')
        ?: getenv('KINDERVAULT_MFA_KEY')
        ?: getenv('KV_MFA_ENCRYPTION_KEY')
        ?: ''
    ));
    if ($configured !== '') {
        $decoded = base64_decode($configured, true);
        if ($decoded === false || strlen($decoded) !== 32) {
            throw new RuntimeException('The configured KinderVault MFA encryption key must be a base64-encoded 32-byte value.');
        }
        $key = $decoded;
        return $key;
    }

    $path = mfaKeyFilePath();
    if (is_file($path)) {
        $encoded = trim((string)@file_get_contents($path));
        $decoded = base64_decode($encoded, true);
        if ($decoded === false || strlen($decoded) !== 32) {
            throw new RuntimeException('The local KinderVault MFA key file is invalid.');
        }
        $key = $decoded;
        return $key;
    }

    $newKey = random_bytes(32);
    $directory = dirname($path);
    if (!is_dir($directory) || !is_writable($directory) || @file_put_contents($path, base64_encode($newKey) . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('KinderVault could not create its local MFA encryption key. Set MFA_ENCRYPTION_KEY to enable MFA.');
    }
    @chmod($path, 0600);
    $key = $newKey;
    return $key;
}

function mfaEncryptionAvailable(): bool {
    if (!function_exists('sodium_crypto_secretbox') && !function_exists('openssl_encrypt')) {
        return false;
    }

    try {
        mfaEncryptionKey();
        return true;
    } catch (Throwable $e) {
        error_log('KinderVault MFA key error: ' . $e->getMessage());
        return false;
    }
}

function encryptMfaSecret(string $secret): string {
    $key = mfaEncryptionKey();
    if (function_exists('sodium_crypto_secretbox')) {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = sodium_crypto_secretbox($secret, $nonce, $key);
        return 'sodium:v1:' . base64_encode($nonce . $ciphertext);
    }

    if (function_exists('openssl_encrypt')) {
        $iv = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt($secret, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($ciphertext === false) {
            throw new RuntimeException('Unable to encrypt MFA secret.');
        }
        return 'openssl:v1:' . base64_encode($iv . $tag . $ciphertext);
    }

    throw new RuntimeException('No supported encryption extension is available for MFA.');
}

function decryptMfaSecret(string $payload): string {
    $key = mfaEncryptionKey();
    if (str_starts_with($payload, 'sodium:v1:')) {
        $decoded = base64_decode(substr($payload, 10), true);
        if ($decoded === false || strlen($decoded) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            throw new RuntimeException('Stored MFA secret is invalid.');
        }
        $nonce = substr($decoded, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = substr($decoded, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plain = sodium_crypto_secretbox_open($ciphertext, $nonce, $key);
        if ($plain === false) {
            throw new RuntimeException('Stored MFA secret could not be decrypted.');
        }
        return $plain;
    }

    if (str_starts_with($payload, 'openssl:v1:')) {
        $decoded = base64_decode(substr($payload, 11), true);
        if ($decoded === false || strlen($decoded) <= 28) {
            throw new RuntimeException('Stored MFA secret is invalid.');
        }
        $iv = substr($decoded, 0, 12);
        $tag = substr($decoded, 12, 16);
        $ciphertext = substr($decoded, 28);
        $plain = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($plain === false) {
            throw new RuntimeException('Stored MFA secret could not be decrypted.');
        }
        return $plain;
    }

    throw new RuntimeException('Stored MFA secret format is not supported.');
}

function mfaBase32Encode(string $bytes): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $buffer = 0;
    $bits = 0;
    $encoded = '';

    foreach (unpack('C*', $bytes) as $byte) {
        $buffer = ($buffer << 8) | $byte;
        $bits += 8;
        while ($bits >= 5) {
            $bits -= 5;
            $encoded .= $alphabet[($buffer >> $bits) & 31];
        }
    }
    if ($bits > 0) {
        $encoded .= $alphabet[($buffer << (5 - $bits)) & 31];
    }

    return $encoded;
}

function mfaBase32Decode(string $secret): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = strtoupper((string)preg_replace('/[\s-]+/', '', $secret));
    if ($secret === '' || preg_match('/[^A-Z2-7]/', $secret)) {
        throw new InvalidArgumentException('Invalid MFA secret.');
    }

    $buffer = 0;
    $bits = 0;
    $decoded = '';
    for ($i = 0, $length = strlen($secret); $i < $length; $i++) {
        $value = strpos($alphabet, $secret[$i]);
        if ($value === false) {
            throw new InvalidArgumentException('Invalid MFA secret.');
        }
        $buffer = ($buffer << 5) | $value;
        $bits += 5;
        while ($bits >= 8) {
            $bits -= 8;
            $decoded .= chr(($buffer >> $bits) & 255);
        }
    }

    return $decoded;
}

function generateMfaSecret(): string {
    return mfaBase32Encode(random_bytes(20));
}

function mfaTotpCode(string $secret, int $counter): string {
    if ($counter < 0) {
        throw new InvalidArgumentException('Invalid MFA counter.');
    }
    $counterBytes = pack('N2', intdiv($counter, 4294967296), $counter % 4294967296);
    $hash = hash_hmac('sha1', $counterBytes, mfaBase32Decode($secret), true);
    $offset = ord($hash[19]) & 15;
    $value = ((ord($hash[$offset]) & 127) << 24)
        | (ord($hash[$offset + 1]) << 16)
        | (ord($hash[$offset + 2]) << 8)
        | ord($hash[$offset + 3]);

    return str_pad((string)($value % 1000000), 6, '0', STR_PAD_LEFT);
}

function normalizeMfaCode(string $code): string {
    return strtoupper((string)preg_replace('/[^A-Z0-9]/', '', trim($code)));
}

function mfaMatchedTotpCounter(string $secret, string $code, ?int $currentCounter = null): ?int {
    $code = normalizeMfaCode($code);
    if (!preg_match('/^\d{6}$/', $code)) {
        return null;
    }

    $currentCounter ??= intdiv(time(), 30);
    for ($offset = -1; $offset <= 1; $offset++) {
        $counter = $currentCounter + $offset;
        if ($counter >= 0 && hash_equals(mfaTotpCode($secret, $counter), $code)) {
            return $counter;
        }
    }

    return null;
}

function generateMfaRecoveryCodes(int $count = 10): array {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $codes = [];
    while (count($codes) < $count) {
        $raw = '';
        for ($i = 0; $i < 10; $i++) {
            $raw .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $codes[] = substr($raw, 0, 5) . '-' . substr($raw, 5);
    }
    return $codes;
}

function mfaRecoveryCodePayload(array $codes): string {
    $hashes = [];
    foreach ($codes as $code) {
        $hashes[] = password_hash(normalizeMfaCode((string)$code), PASSWORD_BCRYPT, ['cost' => 12]);
    }
    return json_encode(['version' => 1, 'codes' => $hashes], JSON_UNESCAPED_SLASHES);
}

function mfaRecoveryCodeHashes(?string $payload): array {
    if (!$payload) {
        return [];
    }
    $decoded = json_decode($payload, true);
    $codes = is_array($decoded) ? ($decoded['codes'] ?? []) : [];
    return is_array($codes) ? array_values(array_filter($codes, 'is_string')) : [];
}

function mfaProvisioningUri(string $username, string $secret): string {
    $label = MFA_ISSUER . ':' . $username;
    return 'otpauth://totp/' . rawurlencode($label)
        . '?secret=' . rawurlencode($secret)
        . '&issuer=' . rawurlencode(MFA_ISSUER)
        . '&algorithm=SHA1&digits=6&period=30';
}

function mfaRequiredForUser(array $user): bool {
    return !empty($user['mfa_enabled'])
        || (($user['role'] ?? '') === 'Administrator' && !empty(securityConfig()['mfa_required_for_administrators']));
}

function mfaUserById(int $id): ?array {
    $stmt = db()->prepare("\n        SELECT id, username, full_name, password, role, status, last_login_at, failed_login_count, locked_until,
               language, mfa_enabled, mfa_secret_encrypted, mfa_recovery_codes_json, mfa_confirmed_at, mfa_last_used_counter, created_at
        FROM users\n        WHERE id = ?\n        LIMIT 1\n    ");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function mfaStatusForUser(array $user): array {
    $enabled = !empty($user['mfa_enabled']);
    $requiredByAdministratorPolicy = ($user['role'] ?? '') === 'Administrator'
        && !empty(securityConfig()['mfa_required_for_administrators']);
    $payload = $user['mfa_recovery_codes_json'] ?? null;
    if ($enabled && !array_key_exists('mfa_recovery_codes_json', $user)) {
        $full = mfaUserById((int)$user['id']);
        $payload = $full['mfa_recovery_codes_json'] ?? null;
    }

    return [
        'enabled' => $enabled,
        'confirmed_at' => $user['mfa_confirmed_at'] ?? null,
        'recovery_codes_remaining' => $enabled ? count(mfaRecoveryCodeHashes(is_string($payload) ? $payload : null)) : 0,
        'enforced_for_account' => mfaRequiredForUser($user),
        'required_by_administrator_policy' => $requiredByAdministratorPolicy,
    ];
}

function verifyMfaLoginCode(array $user, string $code): array {
    if (empty($user['mfa_enabled']) || empty($user['mfa_secret_encrypted'])) {
        return ['valid' => false, 'reason' => 'MFA is not enabled for this account.'];
    }

    $code = normalizeMfaCode($code);
    if (preg_match('/^\d{6}$/', $code)) {
        try {
            $counter = mfaMatchedTotpCounter(decryptMfaSecret($user['mfa_secret_encrypted']), $code);
        } catch (Throwable $e) {
            error_log('KinderVault MFA verification error: ' . $e->getMessage());
            return ['valid' => false, 'reason' => 'Unable to verify this authentication code.'];
        }
        if ($counter === null) {
            return ['valid' => false, 'reason' => 'Invalid authentication code.'];
        }

        $claim = db()->prepare("\n            UPDATE users\n            SET mfa_last_used_counter = ?\n            WHERE id = ?\n              AND (mfa_last_used_counter IS NULL OR mfa_last_used_counter < ?)\n        ");
        $claim->execute([$counter, (int)$user['id'], $counter]);
        if ($claim->rowCount() !== 1) {
            return ['valid' => false, 'reason' => 'That authentication code has already been used. Wait for the next code and try again.'];
        }

        return ['valid' => true, 'method' => 'Authenticator app'];
    }

    $hashes = mfaRecoveryCodeHashes($user['mfa_recovery_codes_json'] ?? null);
    foreach ($hashes as $index => $hash) {
        if (password_verify($code, $hash)) {
            array_splice($hashes, $index, 1);
            $updated = json_encode(['version' => 1, 'codes' => array_values($hashes)], JSON_UNESCAPED_SLASHES);
            $stmt = db()->prepare('UPDATE users SET mfa_recovery_codes_json = ? WHERE id = ?');
            $stmt->execute([$updated, (int)$user['id']]);
            return ['valid' => true, 'method' => 'Recovery code'];
        }
    }

    return ['valid' => false, 'reason' => 'Invalid authentication or recovery code.'];
}

function verifyMfaTotpForUser(array $user, string $code): bool {
    if (empty($user['mfa_enabled']) || empty($user['mfa_secret_encrypted'])) {
        return false;
    }
    try {
        return mfaMatchedTotpCounter(decryptMfaSecret($user['mfa_secret_encrypted']), $code) !== null;
    } catch (Throwable $e) {
        error_log('KinderVault MFA verification error: ' . $e->getMessage());
        return false;
    }
}

function beginMfaLoginChallenge(array $user): void {
    $locale = normalizeLocale($user['language'] ?? currentLocale());
    session_regenerate_id(true);
    $_SESSION = [];
    $_SESSION['mfa_pending_user_id'] = (int)$user['id'];
    $_SESSION['mfa_pending_started_at'] = time();
    $_SESSION['mfa_pending_attempts'] = 0;
    $_SESSION['locale'] = $locale;
    setLocaleCookie($locale);
    csrfToken();
}

function clearMfaLoginChallenge(): void {
    unset($_SESSION['mfa_pending_user_id'], $_SESSION['mfa_pending_started_at'], $_SESSION['mfa_pending_attempts']);
}

function pendingMfaLoginUser(): ?array {
    $userId = (int)($_SESSION['mfa_pending_user_id'] ?? 0);
    $startedAt = (int)($_SESSION['mfa_pending_started_at'] ?? 0);
    if ($userId <= 0 || $startedAt <= 0 || time() - $startedAt > 300) {
        clearMfaLoginChallenge();
        return null;
    }

    $user = mfaUserById($userId);
    if (!$user || ($user['status'] ?? '') !== 'Active' || empty($user['mfa_enabled'])) {
        clearMfaLoginChallenge();
        return null;
    }

    return $user;
}

function completeLoginSession(array $user): void {
    $loginTime = date('Y-m-d H:i:s');
    $reset = db()->prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = ? WHERE id = ?');
    $reset->execute([$loginTime, (int)$user['id']]);

    session_regenerate_id(true);
    $_SESSION = [];
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['locale'] = normalizeLocale($user['language'] ?? DEFAULT_LOCALE);
    $_SESSION['last_activity'] = time();
    $_SESSION['mfa_verified_at'] = time();
    setLocaleCookie($_SESSION['locale']);
    csrfToken();
}

function passwordValidationError(string $password): ?string {
    $config = securityConfig();
    if (strlen($password) < $config['password_min_length']) {
        return 'Password must be at least ' . $config['password_min_length'] . ' characters.';
    }
    if ($config['require_mixed_case'] && (!preg_match('/[a-z]/', $password) || !preg_match('/[A-Z]/', $password))) {
        return 'Password must include both upper- and lower-case letters.';
    }
    if ($config['require_number'] && !preg_match('/\d/', $password)) {
        return 'Password must include at least one number.';
    }
    return null;
}

function currentUser(): ?array {
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $stmt = db()->prepare("\n        SELECT id, username, full_name, role, status, language, last_login_at, failed_login_count, locked_until,
               mfa_enabled, mfa_confirmed_at, created_at\n        FROM users\n        WHERE id = ?\n        LIMIT 1\n    ");
    $stmt->execute([(int)$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function rolePermissions(string $role): array {
    if ($role === 'Administrator') {
        return ['*'];
    }

    $stmt = db()->prepare('SELECT permissions_json FROM roles WHERE name = ? LIMIT 1');
    $stmt->execute([$role]);
    $row = $stmt->fetch();
    $permissions = $row ? json_decode($row['permissions_json'], true) : null;
    if (!is_array($permissions)) {
        $permissions = defaultRolePermissions($role);
    }

    return array_values(array_intersect(permissionKeys(), $permissions));
}

function userPermissionOverrides(int $userId): array {
    $stmt = db()->prepare('SELECT permission, granted FROM user_permission_overrides WHERE user_id = ?');
    $stmt->execute([$userId]);
    $overrides = [];
    foreach ($stmt->fetchAll() as $row) {
        $overrides[$row['permission']] = (bool)$row['granted'];
    }
    return $overrides;
}

function effectivePermissionsForUser(array $user, ?array $overrides = null): array {
    if (($user['role'] ?? '') === 'Administrator') {
        return permissionKeys();
    }

    $permissions = rolePermissions((string)($user['role'] ?? 'Authorized Staff'));
    $granted = array_fill_keys($permissions, true);
    foreach ($overrides ?? userPermissionOverrides((int)$user['id']) as $permission => $isGranted) {
        if (in_array($permission, permissionKeys(), true)) {
            $granted[$permission] = (bool)$isGranted;
        }
    }
    return array_values(array_keys(array_filter($granted)));
}

function currentUserPermissions(): array {
    $user = currentUser();
    return $user ? effectivePermissionsForUser($user) : [];
}

function hasPermission(string $permission): bool {
    $user = currentUser();
    if (!$user || ($user['status'] ?? '') !== 'Active') {
        return false;
    }
    if (($user['role'] ?? '') === 'Administrator') {
        return true;
    }
    return in_array($permission, effectivePermissionsForUser($user), true);
}

function isAdministrator(): bool {
    $user = currentUser();
    return $user && ($user['status'] ?? '') === 'Active' && ($user['role'] ?? '') === 'Administrator';
}

function permissionChanges(array $before, array $after): array {
    $before = array_values(array_unique(array_intersect(permissionKeys(), $before)));
    $after = array_values(array_unique(array_intersect(permissionKeys(), $after)));
    return [
        'added' => array_values(array_diff($after, $before)),
        'removed' => array_values(array_diff($before, $after)),
    ];
}

function saveUserPermissionOverrides(int $userId, string $role, array $selectedPermissions): array {
    $selectedPermissions = array_values(array_unique(array_intersect(permissionKeys(), $selectedPermissions)));
    $pdo = db();
    $delete = $pdo->prepare('DELETE FROM user_permission_overrides WHERE user_id = ?');
    $delete->execute([$userId]);

    if ($role === 'Administrator') {
        return [];
    }

    $defaults = array_fill_keys(rolePermissions($role), true);
    $selected = array_fill_keys($selectedPermissions, true);
    $insert = $pdo->prepare('INSERT INTO user_permission_overrides (user_id, permission, granted) VALUES (?, ?, ?)');
    $overrides = [];

    foreach (permissionKeys() as $permission) {
        $defaultGranted = isset($defaults[$permission]);
        $isGranted = isset($selected[$permission]);
        if ($defaultGranted !== $isGranted) {
            $insert->execute([$userId, $permission, $isGranted ? 1 : 0]);
            $overrides[$permission] = $isGranted;
        }
    }

    return $overrides;
}

function publicUser(array $user, bool $includePermissions = false): array {
    $payload = [
        'id' => (int)$user['id'],
        'username' => $user['username'],
        'full_name' => $user['full_name'],
        'role' => $user['role'],
        'status' => $user['status'],
        'language' => normalizeLocale($user['language'] ?? DEFAULT_LOCALE),
        'last_login_at' => $user['last_login_at'],
        'failed_login_count' => (int)$user['failed_login_count'],
        'locked_until' => $user['locked_until'],
        'mfa_enabled' => !empty($user['mfa_enabled']),
        'mfa_confirmed_at' => $user['mfa_confirmed_at'] ?? null,
        'created_at' => $user['created_at'],
    ];
    if ($includePermissions) {
        $overrides = userPermissionOverrides((int)$user['id']);
        $payload['overrides'] = $overrides;
        $payload['effective_permissions'] = effectivePermissionsForUser($user, $overrides);
    }
    return $payload;
}

function clientIpAddress(): string {
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
}

function sanitizeAuditMetadata(array $metadata, int $depth = 0): array {
    if ($depth > 3) {
        return [];
    }

    $safe = [];
    foreach ($metadata as $key => $value) {
        $key = (string)$key;
        if (preg_match('/password|hash|token|secret|csrf|session|cookie|recovery|authorization/i', $key)) {
            continue;
        }
        if (is_array($value)) {
            $safe[$key] = sanitizeAuditMetadata($value, $depth + 1);
        } elseif (is_bool($value) || is_int($value) || is_float($value) || is_string($value) || $value === null) {
            $safe[$key] = is_string($value) ? substr($value, 0, 500) : $value;
        }
    }
    return $safe;
}

function safeAuditChanges(array $before, array $after, array $labels): array {
    $changes = [];
    foreach ($labels as $field => $label) {
        $previous = $before[$field] ?? null;
        $next = $after[$field] ?? null;
        if ((string)$previous !== (string)$next) {
            $changes[] = [
                'field' => $label,
                'before' => substr((string)$previous, 0, 120),
                'after' => substr((string)$next, 0, 120),
            ];
        }
    }
    return $changes;
}

function auditLog(
    string $action,
    string $module,
    string $recordType,
    string|int|null $recordId,
    string $description,
    string $status = 'Success',
    array $metadata = [],
    ?array $actor = null
): void {
    try {
        $actor = $actor ?? currentUser();
        $metadata = sanitizeAuditMetadata($metadata);
        $metadataJson = $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
        $stmt = db()->prepare("\n            INSERT INTO audit_logs\n                (user_id, username_snapshot, user_name_snapshot, user_role_snapshot, action, module, record_type, record_id, description, metadata_json, ip_address, user_agent, status)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ");
        $actorId = isset($actor['id']) && (int)$actor['id'] > 0 ? (int)$actor['id'] : null;
        $stmt->execute([
            $actorId,
            substr((string)($actor['username'] ?? ''), 0, 100),
            substr((string)($actor['full_name'] ?? ''), 0, 150),
            substr((string)($actor['role'] ?? 'Unknown'), 0, 50),
            substr(strtoupper($action), 0, 80),
            substr($module, 0, 100),
            substr($recordType, 0, 100),
            substr((string)($recordId ?? ''), 0, 100),
            substr($description, 0, 4000),
            $metadataJson,
            clientIpAddress(),
            substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
            substr($status, 0, 20),
        ]);
    } catch (Throwable $e) {
        error_log('KinderVault audit log error: ' . $e->getMessage());
    }
}

function clearCurrentSession(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
}

function localizedServerMessage(string $message): string {
    if (currentLocale() !== 'ms') {
        return $message;
    }

    $messages = [
        'Unauthorized' => 'Tidak dibenarkan.',
        'Method not allowed' => 'Kaedah tidak dibenarkan.',
        'Not found' => 'Tidak ditemui.',
        'ID required' => 'ID diperlukan.',
        'Access Denied' => 'Akses Ditolak',
        'Access Denied. You do not have permission to access this section.' => 'Akses ditolak. Anda tidak mempunyai kebenaran untuk mengakses bahagian ini.',
        'Please select a valid language.' => 'Sila pilih bahasa yang sah.',
        'Only an Administrator can update the fee structure.' => 'Hanya Pentadbir boleh mengemas kini struktur yuran.',
        'Your session requires multi-factor authentication. Please sign in again.' => 'Sesi anda memerlukan pengesahan berbilang faktor. Sila log masuk semula.',
        'Your session has expired. Please sign in again.' => 'Sesi anda telah tamat tempoh. Sila log masuk semula.',
        'Invalid security token. Please refresh the page and try again.' => 'Token keselamatan tidak sah. Sila muat semula halaman dan cuba lagi.',
        'Passwords do not match.' => 'Kata laluan tidak sepadan.',
        'Full name is required and must be 100 characters or fewer.' => 'Nama penuh diperlukan dan mesti tidak melebihi 100 aksara.',
        'Username must use 3 to 50 letters, numbers, dots, underscores, or hyphens.' => 'Nama pengguna mesti menggunakan 3 hingga 50 huruf, nombor, titik, garis bawah atau sempang.',
        'User account not found.' => 'Akaun pengguna tidak ditemui.',
        'Please select a valid role.' => 'Sila pilih peranan yang sah.',
        'That username is already in use.' => 'Nama pengguna itu telah digunakan.',
        'Unable to create the user account.' => 'Tidak dapat mencipta akaun pengguna.',
        'Unable to update the user account.' => 'Tidak dapat mengemas kini akaun pengguna.',
        'Please choose a student.' => 'Sila pilih seorang murid.',
        'Student not found.' => 'Murid tidak ditemui.',
        'Student not found' => 'Murid tidak ditemui.',
        'Payment not found' => 'Bayaran tidak ditemui.',
        'Development record not found.' => 'Rekod perkembangan tidak ditemui.',
        'Reading progress record not found.' => 'Rekod kemajuan membaca tidak ditemui.',
        'Audit record not found.' => 'Rekod audit tidak ditemui.',
        'Select at least one language to record reading progress.' => 'Pilih sekurang-kurangnya satu bahasa untuk merekod kemajuan membaca.',
        'student_id and amount are required.' => 'Murid dan jumlah bayaran diperlukan.',
        'student_id and assessment_date are required.' => 'Murid dan tarikh penilaian diperlukan.',
        'student_id and record_date are required.' => 'Murid dan tarikh rekod diperlukan.',
        'Name, date of birth, class and at least one parent/guardian are required.' => 'Nama, tarikh lahir, kelas dan sekurang-kurangnya seorang ibu bapa atau penjaga diperlukan.',
        'Class structure is fixed: Permata, Intelek, Ceria.' => 'Struktur kelas adalah tetap: Permata, Intelek dan Ceria.',
        'Permissions are required.' => 'Kebenaran diperlukan.',
        'Role not found.' => 'Peranan tidak ditemui.',
        'Administrator access is always full and cannot be restricted.' => 'Akses Pentadbir sentiasa penuh dan tidak boleh dihadkan.',
        'Invalid authentication code.' => 'Kod pengesahan tidak sah.',
        'Invalid authentication or recovery code.' => 'Kod pengesahan atau kod pemulihan tidak sah.',
        'Your current password is incorrect.' => 'Kata laluan semasa anda tidak betul.',
        'Unknown MFA action.' => 'Tindakan MFA tidak diketahui.',
        'student_id required' => 'ID murid diperlukan.',
        'student_id and amount are required.' => 'ID murid dan jumlah bayaran diperlukan.',
        'Payment not found.' => 'Bayaran tidak ditemui.',
        'This borang is only for students aged 4 to 6 years old.' => 'Borang ini hanya untuk murid berumur 4 hingga 6 tahun.',
        'Legacy development records are preserved as read-only history.' => 'Rekod perkembangan lama dikekalkan sebagai sejarah baca sahaja.',
        'Create the account with a non-administrator role first, let the user enable MFA, then promote the account to Administrator.' => 'Cipta akaun dengan peranan bukan Pentadbir terlebih dahulu, benarkan pengguna mengaktifkan MFA, kemudian naik taraf akaun kepada Pentadbir.',
        'This account must enable MFA before it can be an active Administrator while MFA enforcement is enabled.' => 'Akaun ini mesti mengaktifkan MFA sebelum boleh menjadi Pentadbir aktif apabila penguatkuasaan MFA diaktifkan.',
        'You cannot remove or deactivate your own administrator access.' => 'Anda tidak boleh membuang atau menyahaktifkan akses Pentadbir sendiri.',
        'KinderVault must keep at least one active Administrator account.' => 'KinderVault mesti mengekalkan sekurang-kurangnya satu akaun Pentadbir aktif.',
        'MFA cannot be required until KinderVault can access its local encryption key.' => 'MFA tidak boleh diwajibkan sehingga KinderVault dapat mengakses kunci penyulitan tempatannya.',
        'Every active Administrator must enable MFA before you can require it system-wide.' => 'Setiap Pentadbir aktif mesti mengaktifkan MFA sebelum anda boleh mewajibkannya untuk seluruh sistem.',
        'Multi-factor authentication is unavailable because KinderVault could not access its encryption key.' => 'Pengesahan berbilang faktor tidak tersedia kerana KinderVault tidak dapat mengakses kunci penyulitannya.',
        'Your account is no longer available.' => 'Akaun anda tidak lagi tersedia.',
        'Multi-factor authentication is already enabled for this account.' => 'Pengesahan berbilang faktor telah diaktifkan untuk akaun ini.',
        'Your MFA setup session has expired. Start setup again.' => 'Sesi persediaan MFA anda telah tamat. Mulakan persediaan semula.',
        'Enter the current six-digit code from your authenticator app.' => 'Masukkan kod enam digit semasa daripada aplikasi pengesah anda.',
        'Multi-factor authentication is not enabled for this account.' => 'Pengesahan berbilang faktor tidak diaktifkan untuk akaun ini.',
        'MFA is currently required for Administrators. Turn off the enforcement setting before disabling it on this account.' => 'MFA kini diwajibkan untuk Pentadbir. Matikan tetapan penguatkuasaan sebelum menyahaktifkannya pada akaun ini.',
        'Enter a current code from your authenticator app.' => 'Masukkan kod semasa daripada aplikasi pengesah anda.',
        'Enable multi-factor authentication before generating recovery codes.' => 'Aktifkan pengesahan berbilang faktor sebelum menjana kod pemulihan.',
        'Unable to verify this authentication code.' => 'Tidak dapat mengesahkan kod pengesahan ini.',
        'That authentication code has already been used. Wait for the next code and try again.' => 'Kod pengesahan itu telah digunakan. Tunggu kod seterusnya dan cuba lagi.',
        'Password must include both upper- and lower-case letters.' => 'Kata laluan mesti mengandungi huruf besar dan kecil.',
        'Password must include at least one number.' => 'Kata laluan mesti mengandungi sekurang-kurangnya satu nombor.',
        'Your form session has expired. Please try again.' => 'Sesi borang anda telah tamat. Sila cuba lagi.',
        'Your MFA sign-in session has expired. Please enter your username and password again.' => 'Sesi log masuk MFA anda telah tamat. Sila masukkan nama pengguna dan kata laluan semula.',
        'Too many failed sign-in attempts. Your account has been temporarily locked.' => 'Terlalu banyak percubaan log masuk gagal. Akaun anda telah dikunci sementara.',
        'Too many MFA attempts. Please sign in again.' => 'Terlalu banyak percubaan MFA. Sila log masuk semula.',
        'Please enter a message.' => 'Sila masukkan mesej.',
        'Your message is too long. Please keep it under 500 characters.' => 'Mesej anda terlalu panjang. Sila hadkan kepada 500 aksara.',
        'Too many chatbot requests. Please wait a few minutes and try again.' => 'Terlalu banyak permintaan chatbot. Sila tunggu beberapa minit dan cuba lagi.',
        'The KinderVault chatbot is currently disabled by an Administrator.' => 'Chatbot KinderVault sedang dimatikan oleh Pentadbir.',
        'Please enter both username and password.' => 'Sila masukkan kedua-dua nama pengguna dan kata laluan.',
        'Multi-factor authentication must be set up for this account before it can sign in. Ask another Administrator to temporarily turn off MFA enforcement so you can enroll.' => 'Pengesahan berbilang faktor mesti disediakan untuk akaun ini sebelum boleh log masuk. Minta Pentadbir lain mematikan penguatkuasaan MFA buat sementara waktu supaya anda boleh mendaftar.',
        'Invalid username or password.' => 'Nama pengguna atau kata laluan tidak sah.',
    ];

    if (isset($messages[$message])) {
        return $messages[$message];
    }
    if (preg_match('/^Password must be at least (\d+) characters\.$/', $message, $match)) {
        return 'Kata laluan mesti sekurang-kurangnya ' . $match[1] . ' aksara.';
    }
    return $message;
}

function denyAccess(string $message = 'Access Denied. You do not have permission to access this section.'): never {
    $message = localizedServerMessage($message);
    if (isApiRequest()) {
        jsonResponse(['error' => $message, 'code' => 'FORBIDDEN'], 403);
    }

    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    $locale = currentLocale();
    $title = localizedServerMessage('Access Denied');
    $returnText = $locale === 'ms' ? 'Kembali ke KinderVault' : 'Return to KinderVault';
    echo '<!doctype html><html lang="' . htmlspecialchars($locale, ENT_QUOTES, 'UTF-8') . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . ' - KinderVault</title></head><body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#f7f4fb;color:#25163d;font-family:Arial,sans-serif"><main style="max-width:440px;padding:32px;text-align:center;background:#fff;border:1px solid #e5dcef;border-radius:18px;box-shadow:0 16px 40px rgba(42,18,80,.12)"><h1 style="margin:0 0 10px;font-size:24px">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1><p style="margin:0;color:#625a70;line-height:1.55">' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p><p style="margin:20px 0 0"><a href="index.php" style="color:#6b3fa0;font-weight:700;text-decoration:none">' . htmlspecialchars($returnText, ENT_QUOTES, 'UTF-8') . '</a></p></main></body></html>';
    exit;
}

// ── Session ───────────────────────────────────────────────
if ((!defined('KV_SKIP_SESSION') || !KV_SKIP_SESSION) && session_status() === PHP_SESSION_NONE) {
    // On Render, HTTPS is terminated by the proxy before PHP sees the request.
    // Trust X-Forwarded-Proto only in production (APP_ENV=production) to prevent
    // local spoofing. Render sends this header reliably for HTTPS connections.
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((int)($_SERVER['SERVER_PORT'] ?? 0) === 443)
        || (APP_ENV === 'production' && ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        if (isApiRequest()) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }
        header('Location: login.php', true, 303);
        exit;
    }

    $user = currentUser();
    if (!$user || ($user['status'] ?? '') !== 'Active') {
        if ($user) {
            auditLog('SESSION_REVOKED', 'Security', 'User', $user['id'], 'A session was rejected because the account is inactive.', 'Failed', [], $user);
        }
        clearCurrentSession();
        if (isApiRequest()) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }
        header('Location: login.php', true, 303);
        exit;
    }

    if (mfaRequiredForUser($user) && empty($_SESSION['mfa_verified_at'])) {
        auditLog('SESSION_REVOKED', 'Security', 'User', $user['id'], 'A session was rejected because MFA verification is required.', 'Failed', [], $user);
        clearCurrentSession();
        if (isApiRequest()) {
            jsonResponse(['error' => 'Your session requires multi-factor authentication. Please sign in again.'], 401);
        }
        header('Location: login.php', true, 303);
        exit;
    }

    $timeoutSeconds = securityConfig()['session_timeout_minutes'] * 60;
    $lastActivity = (int)($_SESSION['last_activity'] ?? time());
    if (time() - $lastActivity > $timeoutSeconds) {
        auditLog('SESSION_TIMEOUT', 'Security', 'Session', (string)$user['id'], 'Session ended after the configured inactivity timeout.', 'Success', [], $user);
        clearCurrentSession();
        if (isApiRequest()) {
            jsonResponse(['error' => 'Your session has expired. Please sign in again.', 'code' => 'SESSION_EXPIRED'], 401);
        }
        header('Location: login.php?session=expired', true, 303);
        exit;
    }

    $_SESSION['last_activity'] = time();
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['locale'] = normalizeLocale($user['language'] ?? DEFAULT_LOCALE);
}

function isApiRequest(): bool {
    return str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/');
}

function requirePermission(string $permission): void {
    requireLogin();
    if (!hasPermission($permission)) {
        auditLog('ACCESS_DENIED', 'Security', 'Permission', $permission, 'A protected action was denied.', 'Failed', ['permission' => $permission]);
        denyAccess();
    }
}

function requireAdministrator(): void {
    requireLogin();
    if (!isAdministrator()) {
        auditLog('ACCESS_DENIED', 'Security', 'Administrator Area', 'administrator', 'An administrator-only action was denied.', 'Failed');
        denyAccess();
    }
}

// ── JSON response helper ──────────────────────────────────
function jsonResponse(mixed $data, int $code = 200): never {
    if (is_array($data) && isset($data['error']) && is_string($data['error'])) {
        $data['error'] = localizedServerMessage($data['error']);
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, private');
    header('Pragma: no-cache');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── CSRF token helper ─────────────────────────────────────
function csrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function isValidCsrfToken(?string $token): bool {
    return is_string($token) && $token !== '' && hash_equals(csrfToken(), $token);
}

function requireCsrfToken(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? null;
    if (!isValidCsrfToken(is_string($token) ? $token : null)) {
        // Use the standard Forbidden status. The local FastCGI stack rewrites
        // non-standard 419 responses to 500, which obscures a normal CSRF denial.
        jsonResponse(['error' => 'Invalid security token. Please refresh the page and try again.'], 403);
    }
}
