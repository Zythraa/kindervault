# KinderVault Render + TiDB post-deploy smoke checklist

Complete this checklist only after the first Render deployment. Use synthetic
records until the checklist is complete; do not import real student data during
validation.

## TiDB and Render configuration

- [ ] Render service is a **Free Web Service**, Docker runtime, Singapore region.
- [ ] `DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com` and `DB_PORT=4000`.
- [ ] `DB_NAME=kindervault` and the TiDB username are set; `DB_PASSWORD` exists
      only as a secret environment variable.
- [ ] TiDB CA uploaded under **Environment -> Secret Files** as `tidb-ca.pem`.
- [ ] `DB_SSL_ENABLED=true` and `DB_SSL_CA=/etc/secrets/tidb-ca.pem`.
- [ ] TLS verification remains enabled; no `MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=false`.
- [ ] Every CIDR shown in Render **Connect -> Outbound** for the Singapore service
      is present in TiDB Starter **Authorized Networks**. Temporary operator IPs
      are removed after setup. If using Dedicated Outbound IPs, each `/32` is
      allowlisted instead.
- [ ] `APP_ENV=production`, `APP_DEBUG=false`, and `SCANNER_ENABLED=false`.

## Application and security

- [ ] `/health.php` returns HTTP 200 and `{"status":"ok"}`; it is a minimal `SELECT 1` liveness check using the mounted TiDB CA and does not require seeded roles, settings, classes, or student data.
- [ ] Administrator login, logout, inactivity timeout, and session renewal work.
- [ ] MFA enrollment, QR scan, challenge, recovery-code use, replay rejection,
      regeneration, and disable flow work.
- [ ] Dashboard loads current counts without PHP warnings or database details.
- [ ] Student create/edit/profile/delete and generated-code validation work.
- [ ] Payment create/edit/delete, outstanding dues, advance month range, and
      receipt print/PDF work.
- [ ] KPM Development and Reading Progress create/edit/history work.
- [ ] Global search returns only records permitted to the signed-in role.
- [ ] Teacher and Authorized Staff cannot access Administrator-only actions.
- [ ] Audit log records meaningful events without passwords, MFA keys, CSRF
      tokens, or other secrets.
- [ ] English/Bahasa Melayu switching survives navigation and refresh.
- [ ] Scanner button, camera/OCR page, and scanner API are unavailable.
- [ ] Sensitive paths (`.env`, `config.php`, `database/`, `testing/`, backups,
      Docker/Render files) are blocked from HTTP access.

## Data integrity and operations

- [ ] `database/schema.sql` was imported once into the empty TiDB database.
- [ ] Synthetic transaction rollback, foreign-key cascade, student-code
      uniqueness, receipt-number generation, and duplicate development-record
      checks pass.
- [ ] A TiDB-compatible backup/export is created outside the web container and
      a restore test succeeds.
- [ ] No local WAMP database was used or modified.
- [ ] No real student/parent data was used for this checklist.