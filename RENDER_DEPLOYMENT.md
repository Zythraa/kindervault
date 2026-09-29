# KinderVault deployment on Render

This guide stops before deployment. It does not log in to Render, create
services, push GitHub, upload secrets, or import operational data.
## Selected production architecture (not deployed yet)

`Private GitHub repository -> Render Free Web Service (Docker, Singapore) -> TiDB Cloud Starter (Singapore, public endpoint, TLS)`

The current selected database is TiDB Cloud Starter. The self-managed Render
MySQL option later in this document is an alternative only; do not provision it
when following the TiDB path.

`plan: free` is intentional for the requested deployment. Render Free services can spin down after inactivity, so expect cold-start latency and treat this as a low-traffic/test deployment until a paid plan is selected.

## 1. Validate locally first

### Build the production JavaScript

The editable React/JSX sources are in `pages/*.jsx`; the application root
component is in `pages/app.jsx`. Before testing or deploying frontend changes,
run:

```powershell
npm install
npm run build:js
```

This writes browser-ready scripts to `assets/js/dist/`. Commit both the JSX
sources and generated scripts. The PHP page serves those compiled files
directly, so Node/npm are build-time tools only; Render continues to run PHP
and Apache without a Node process. No Babel Standalone runtime compilation is
used in the production page.

Install and start Docker Desktop. From this folder, create temporary test
values in your shell (never in a committed file):

```powershell
$env:KV_TEST_DB_PASSWORD = 'temporary-random-db-password'
$env:KV_TEST_ROOT_PASSWORD = 'temporary-random-root-password'
$env:KV_TEST_MFA_KEY = (php -r "echo base64_encode(random_bytes(32));")
$env:KV_TEST_ADMIN_PASSWORD = 'temporary-admin-password'
$env:KV_TEST_TEACHER_PASSWORD = 'temporary-teacher-password'
$env:KV_TEST_STAFF_PASSWORD = 'temporary-staff-password'
```

Run the isolated MySQL 8 test stack (MySQL is not published to the host):

```powershell
$docker = 'C:\Users\<you>\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe'
& $docker compose -f compose.render-test.yml up -d --build mysql web
& $docker compose -f compose.render-test.yml --profile seed run --rm seed
```

Open `http://localhost:8080/health.php`. It must return
`{"status":"ok"}`. The probe uses the same TiDB TLS CA and certificate
verification settings as the application PDO connection and performs only a
minimal `SELECT 1` liveness query; it does not require roles, settings, classes,
students, or other base data. A real database/TLS failure returns HTTP 503 with
`{"status":"unavailable"}` and no diagnostics. Use the temporary `test_admin`,
`test_teacher`, and
`test_staff` accounts created by the seed fixture for smoke testing. The
fixture contains only fictional data and is excluded from the production image.

Persistence test:

```powershell
& $docker compose -f compose.render-test.yml restart mysql
& $docker compose -f compose.render-test.yml down
& $docker compose -f compose.render-test.yml up -d mysql web
```

Confirm the same synthetic students, payments, records, settings, and users
remain. Rebuild only the web service with `up -d --build web` and confirm again.
When finished, remove the test stack and volume explicitly:

```powershell
& $docker compose -f compose.render-test.yml down
& $docker volume rm kindervault_kindervault_render_test_mysql
```

## 2. Create the GitHub repository

Install Git, review `git status` and the secret scan, and ensure the following
are not committed: `.env`, `.kindervault-mfa.key`, `backup/*.sql`,
`testing/`, OCR models, logs, and IDE metadata. The existing
`backup/pre_render_full_backup_20260916_163021.sql` is a local safety backup and
must remain outside GitHub.

## 3. Choose the database architecture

Render provides managed Postgres and Key Value, not managed MySQL. For this
MariaDB/MySQL application choose either:

1. An external managed MySQL/MariaDB provider; or
2. A self-managed Render Private Service running MySQL 8 with a persistent disk.

For option 2, use the exact MySQL disk mount path `/var/lib/mysql`, keep the
service private, and configure `MYSQL_DATABASE`, `MYSQL_USER`,
`MYSQL_PASSWORD`, and `MYSQL_ROOT_PASSWORD`. A persistent disk and private
service are paid/self-managed infrastructure; do not rely on a free service for
production database durability. Render documents custom MySQL deployment in
its [MySQL guide](https://render.com/docs/deploy-mysql) and disk limitations in
its [persistent disk guide](https://render.com/docs/disks).

Import `database/schema.sql` into an empty database. It creates all ten
application tables and intentionally does not create a default administrator.

## 4. Create the first Administrator

After the database is initialized, run the CLI bootstrap from a Render shell or
one-time private job. Set a temporary environment variable only for the command:

```sh
export KINDER_ADMIN_PASSWORD='choose-a-unique-password-here'
php tools/create_admin.php firstadmin "KinderVault Administrator"
unset KINDER_ADMIN_PASSWORD
```

The script uses `password_hash()` with bcrypt/PASSWORD_DEFAULT, refuses to run
if an active Administrator already exists, and cannot be called over HTTP.

## 5. Create the KinderVault Web Service

Create a Blueprint from `render.yaml`, or create a Docker Web Service manually.
Use the repository root `Dockerfile` and health check path `/health.php`.
Render supplies `PORT` at runtime; the image entrypoint binds Apache to that
value on `0.0.0.0` (defaulting to 10000 locally). Render documents runtime
environment variables [here](https://render.com/docs/environment-variables).

Set these dashboard environment variables:

```text
APP_ENV=production
APP_DEBUG=false
SCANNER_ENABLED=false
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_NAME=kindervault
DB_USER=3tg1mCiMFrW8c7z.root
DB_PASSWORD=<TiDB password from Render secret environment variable>
DB_SSL_ENABLED=true
DB_SSL_CA=/etc/secrets/tidb-ca.pem
MFA_ENCRYPTION_KEY=<base64 value generated below>
```

Generate the MFA key locally, then paste it only into the Render Dashboard
environment-variable value field (never Git, `render.yaml`, `.env.example`,
HTML, or JavaScript):

```sh
php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
```

Keep this key stable. Replacing it makes existing encrypted TOTP secrets
unreadable and requires MFA re-enrollment.

## 6. Final smoke test after your deployment

Use [RENDER_POST_DEPLOY_CHECKLIST.md](RENDER_POST_DEPLOY_CHECKLIST.md) for the
short verification list covering health, login, MFA, RBAC, payments, receipts,
development, reading, audit logs, language switching, scanner absence, and
logout.

The production backup endpoint streams SQL directly and does not treat the web
container filesystem as durable storage. Download exports to an administrator-
controlled location.

## Current limitations

- PHP file sessions are suitable for the initial single-instance deployment;
  restarting the web container invalidates active sessions.
- The scanner is intentionally omitted from the production image and its API
  returns an unavailable response when disabled. Local development can retain
  it with `SCANNER_ENABLED=true`.
- The CDN React/Babel/icon/font dependencies prevent a strict CSP without a
  separate frontend bundling project; the configured security headers remain
  enabled.

## Final handoff reference

### Repository safety and production file set

Commit the application source plus these deployment files:

- `Dockerfile`, `docker/entrypoint.sh`, `.htaccess`
- `render.yaml`, `.env.example`
- `RENDER_DEPLOYMENT.md`, `RENDER_POST_DEPLOY_CHECKLIST.md`,
  `RENDER_VALIDATION_REPORT.md`
- `database/schema.sql`, `api/`, `pages/`, `assets/`, `index.php`, `login.php`,
  `logout.php`, `health.php`, and the remaining application PHP/JS/CSS files
- `tools/create_admin.php` (CLI-only; blocked over HTTP)

Never commit `.env`, `.kindervault-mfa.key`, any `backup/*.sql`, `testing/`,
the local `scanner/` implementation or `pages/registration_scanner.jsx`,
scanner resources/models, local images, logs, IDE metadata, or Docker volumes.
The pre-render backup remains at
`backup/pre_render_full_backup_20260916_163021.sql` and is ignored by both
`.gitignore` and `.dockerignore`. The production image also excludes backups,
testing fixtures, scanner code/resources, and environment files (apart from the
placeholder `.env.example`).

### Windows Git preparation (do not push from this guide)

Install **Git for Windows** from [git-scm.com/download/win](https://git-scm.com/download/win),
restart PowerShell, then run from `C:\wamp64\www\kindervault`:

```powershell
git init
git branch -M main
git status --short --ignored
git check-ignore -v backup/pre_render_full_backup_20260916_163021.sql .env testing
git add .
git diff --cached --name-only
git diff --cached --check
git status --short
git commit -m "Prepare KinderVault for Render deployment"
```

Before committing, confirm the staged list contains no SQL dump, `.env`, key,
testing fixture, scanner model, log, or IDE file. Create a **private** empty
GitHub repository, then connect and push manually:

```powershell
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### TiDB Cloud Starter (external database option)

If using the Singapore TiDB Cloud Starter database, configure the KinderVault
Web Service with the following non-secret values:

```text
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_NAME=kindervault
DB_USER=3tg1mCiMFrW8c7z.root
DB_SSL_ENABLED=true
DB_SSL_CA=/etc/secrets/tidb-ca.pem
```

Set `DB_PASSWORD` only in Render's secret environment-variable field. Download
TiDB's CA certificate and upload it under **Environment -> Secret Files** as
`tidb-ca.pem`; Docker services read it at `/etc/secrets/tidb-ca.pem`. Do not
use a Windows path in Render and never disable certificate verification.

Before deployment, with the password supplied only through the process
environment, a local PDO check is:

```powershell
$env:DB_HOST='gateway01.ap-southeast-1.prod.aws.tidbcloud.com'
$env:DB_PORT='4000'; $env:DB_NAME='kindervault'
$env:DB_USER='3tg1mCiMFrW8c7z.root'; $env:DB_PASSWORD='<password-from-secret-store>'
$env:DB_SSL_ENABLED='true'; $env:DB_SSL_CA='C:\path\to\tidb-ca.pem'
php -r "require 'config.php'; echo db()->query('SELECT 1')->fetchColumn() === '1' ? 'TIDB_PDO_TLS_OK' : 'TIDB_PDO_CHECK_FAILED';"
Remove-Item Env:DB_PASSWORD
```

This verifies authentication and TLS without printing the password.
To verify the same path from the production image, mount the CA read-only and
pass the password only through the current shell environment:

```powershell
& $docker run --rm `
  -e APP_ENV=production -e APP_DEBUG=false -e SCANNER_ENABLED=false `
  -e DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com -e DB_PORT=4000 `
  -e DB_NAME=kindervault -e DB_USER=3tg1mCiMFrW8c7z.root `
  -e DB_PASSWORD=$env:DB_PASSWORD -e DB_SSL_ENABLED=true `
  -e DB_SSL_CA=/run/secrets/tidb-ca.pem `
  -v "${pwd}\tidb-ca.pem:/run/secrets/tidb-ca.pem:ro" `
  kindervault-web:latest php -r "require 'config.php'; echo db()->query('SELECT 1')->fetchColumn() === '1' ? 'TIDB_PDO_TLS_OK' : 'TIDB_PDO_CHECK_FAILED';"
```

The command must print only `TIDB_PDO_TLS_OK` (or a non-secret failure); never
include the password or CA contents in logs. Import the
schema only after this check succeeds.
#### TiDB Authorized Networks for Render

TiDB Cloud Starter public endpoints enforce firewall rules by authorized IP
ranges. Create the Singapore Render Web Service first, then open **Connect ->
Outbound** in its Render Dashboard and copy every outbound CIDR shown for that
service. Add each CIDR as a separate TiDB **Authorized Networks** rule. Do not
hardcode a guessed range: Render says a service may use any address in its
regional ranges and those ranges can change. If the workspace uses Render
Dedicated Outbound IPs, add those assigned IPv4 addresses as `/32` rules instead.

Keep the TiDB public endpoint restricted to the Render ranges plus any temporary
operator IP needed for setup; remove temporary operator access afterwards. TiDB
Starter permits up to 200 public firewall rules and defaults to all IPv4 when no
rules are configured, so an explicit Render allowlist is required before launch.
See [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses)
and [TiDB public-endpoint firewall rules](https://docs.pingcap.com/tidbcloud/configure-serverless-firewall-rules-for-public-endpoints/).
### MySQL Private Service (separate from the Web Service)

Render has no managed MySQL offering; use an external managed MySQL provider or
a self-managed Render Private Service. For the self-managed option:

| Dashboard field | Value |
|---|---|
| Service type | Private Service |
| Runtime | Docker |
| Image | `mysql:8.0` |
| Internal port | `3306` |
| Persistent disk mount | `/var/lib/mysql` |
| Disk size | Start at 10 GB; increase based on backups/ growth |
| Public exposure | Disabled; no public port/URL |
| Region | Same region as the KinderVault Web Service |

Set only these MySQL-service variables, using generated secret values:
`MYSQL_DATABASE=<database-name>`, `MYSQL_USER=<application-user>`,
`MYSQL_PASSWORD=<application-password>`, and
`MYSQL_ROOT_PASSWORD=<root-password>`. The exact `/var/lib/mysql` mount must
remain attached; do not mount an arbitrary application directory. Render’s
[custom MySQL guidance](https://render.com/docs/deploy-mysql) and
[persistent disk guidance](https://render.com/docs/disks) describe this
self-managed pattern.

The Web Service connects through the private service hostname, never a public
IP:

```text
DB_HOST=<mysql-private-service-hostname>
DB_PORT=3306
DB_NAME=<database-name>
DB_USER=<application-user>
DB_PASSWORD=<application-password>
DB_SSL_ENABLED=true
DB_SSL_CA=/etc/secrets/tidb-ca.pem
```

### KinderVault Web Service settings

| Dashboard field | Value |
|---|---|
| Service type | Web Service |
| Plan | Free |
| Runtime | Docker |
| Repository | `<YOUR_GITHUB_REPO_URL>` |
| Branch | `main` (or the reviewed deployment branch) |
| Dockerfile | `/Dockerfile` |
| Health Check Path | `/health.php` |
| Region | Singapore (ap-southeast-1) |
| Auto-Deploy | **Off** initially; enable after the first validated release |
| Public database port | None |

Render supplies `PORT` at runtime. The image entrypoint binds Apache to that
port on all interfaces. The expected health response is HTTP 200 with exactly
`{"status":"ok"}`. If unhealthy, first verify the MySQL private hostname,
port, credentials, schema import, disk mount, and service-region alignment;
leave `APP_DEBUG=false` and use private service logs rather than exposing
database errors.

### Production environment variables

Set these on the KinderVault Web Service:

| Variable | Secret? | Example format | Purpose |
|---|---:|---|---|
| `APP_ENV` | No | `production` | Production behavior |
| `APP_DEBUG` | No | `false` | Suppress diagnostic output |
| `SCANNER_ENABLED` | No | `false` | Keep scanner/OCR absent and unavailable |
| `DB_HOST` | No | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | TiDB public endpoint |
| `DB_PORT` | No | `4000` | TiDB TLS port |
| `DB_NAME` | No | `kindervault` | Application database |
| `DB_USER` | No | `3tg1mCiMFrW8c7z.root` | TiDB database user |
| `DB_PASSWORD` | Yes | `<generated-password>` | Database password |
| `DB_SSL_ENABLED` | No | `true` | Require TLS for TiDB |
| `DB_SSL_CA` | No | `/etc/secrets/tidb-ca.pem` | Render secret-file path for TiDB CA |
| `MFA_ENCRYPTION_KEY` | Yes | base64-encoded 32 bytes | Encrypt stored TOTP secrets |

Do not set local-only `LOCAL_ADMINER_USERNAME`, `LOCAL_ADMINER_PASSWORD`, or
`KINDERVAULT_MFA_KEY_FILE` on Render. The retained chatbot implementation is
disabled (`CHATBOT_FEATURE_AVAILABLE=false`), so its optional
`KINDERVAULT_OPENAI_API_KEY`/model variables are not required.

Generate the MFA key locally without saving it to source:

```powershell
php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
```

Copy the result directly into the Render Dashboard as `MFA_ENCRYPTION_KEY` and
keep it stable for the lifetime of the database.

For TiDB TLS, upload TiDB's CA certificate in the Web Service Dashboard under **Environment -> Secret Files** with filename `tidb-ca.pem`. Render exposes Docker secret files at `/etc/secrets/<filename>`; do not commit the certificate or a Windows path. Keep certificate verification enabled; never set `MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=false`.

### Empty-database initialization and first Administrator

Import `database/schema.sql` once into the empty TiDB database. It creates all
ten tables, system roles, and application defaults without students, parents,
payments, scanner fixtures, or a default password. The DDL uses
`CREATE TABLE IF NOT EXISTS`; rerunning it does not wipe or reset existing
users, MFA, payments, or records. Do not run it against a populated database
unless the SQL has been reviewed for the target migration.

After the schema is ready, open a private Render shell/one-time job and run:

```sh
export KINDER_ADMIN_PASSWORD='<enter-a-new-password-only-in-this-shell>'
php tools/create_admin.php firstadmin "KinderVault Administrator"
unset KINDER_ADMIN_PASSWORD
```

The script is CLI-only, uses bcrypt (`PASSWORD_DEFAULT`), refuses to create a
second active Administrator, and never prints the password. Do not create a
public setup route; delete any one-time job after success.

### Exact deployment order

1. Install Git and review the ignored/staged file list.
2. Create a private GitHub repository; initialize, commit, and push the safe source.
3. Configure the TiDB Starter endpoint, upload `tidb-ca.pem` as a Render Secret File, and add all Singapore Render outbound CIDRs to TiDB Authorized Networks.
4. Create the KinderVault Web Service from the repository and reviewed branch.
5. Set the production variables above, including `SCANNER_ENABLED=false` and a stable MFA key.
6. Deploy with Auto-Deploy off; check `/health.php` for HTTP 200 `{"status":"ok"}`.
7. Run the CLI schema import and first-Administrator procedure.
8. Sign in and complete `RENDER_POST_DEPLOY_CHECKLIST.md` using synthetic data only.
9. Configure TiDB-compatible backups/exports before adding any real records; never rely on web-container storage.

### Backup and first-data policy

Back up the hosted TiDB database with a scheduled, administrator-controlled
TiDB/MySQL-compatible export, stored outside the web container and tested by a
restore. Take and verify a backup before importing any real operational data.
Do not migrate the local WAMP database during initial deployment validation.

## Final verdict

**READY FOR RENDER + TIDB DEPLOYMENT**