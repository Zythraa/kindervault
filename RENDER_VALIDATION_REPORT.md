# KinderVault Render + TiDB compatibility validation

Validation date: 17 September 2026. This cycle used fictional synthetic data only.
The local WAMP `kindervault` database was not used or modified. No GitHub push,
Render service, or production secret was created.

## Verdict scope

The requested deployment architecture is:

`Private GitHub repository -> Render Free Web Service (Docker, Singapore) -> TiDB Cloud Starter (Singapore, public endpoint, TLS)`

The application is configured for `APP_ENV=production`, `APP_DEBUG=false`, and
`SCANNER_ENABLED=false` in the Render blueprint.

## Validation matrix

| Area | Result | Evidence / scope |
|---|---|---|
| Authentication | PASS | Synthetic Docker integration: valid login, invalid/inactive denial, logout/session invalidation |
| MFA | PASS | Synthetic Docker integration: enrollment, TOTP replay rejection, recovery-code use/replay, regeneration and disable |
| RBAC | PASS | Teacher restrictions and permission grant/revoke checks passed |
| CSRF | PASS | Mutation without token returned HTTP 403 |
| Student CRUD | PASS | Synthetic create, read, class transfer, delete and cascade checks passed |
| Payments | PASS | Paid/overdue transitions, validation, bulk payment transaction checks passed |
| Receipts | PASS | Receipt generation, stable regeneration, and bulk shared-receipt checks passed |
| KPM development | PASS | Create, duplicate prevention, edit and cleanup checks passed |
| Reading progress | PASS | Create, edit and cleanup checks passed |
| Search | PASS | Covered by the authenticated application/integration paths and permission-aware search code |
| User Management | PASS | Administrator CRUD/permission checks and Teacher denial passed |
| Audit Log | PASS | Expected security/CRUD action coverage and pagination passed |
| English/Bahasa Melayu | PASS | Session locale switch persisted (`en -> ms -> en`) |
| Transactions | PASS | Atomic bulk payment and rollback/error paths passed |
| Foreign keys | PASS | Student deletion cascaded dependent payment/development/reading data in isolated InnoDB test DB; schema constraints inspected |
| Student code uniqueness | PASS | `uq_students_code` schema constraint and generated-code CRUD path verified |
| Receipt number uniqueness | PASS | Receipt numbers derive from unique payment anchor IDs; bulk rows share one receipt; no collision observed in synthetic run |
| Docker -> TiDB connection | PASS | Running production-flagged Docker container used TiDB TLS CA mount; `db()->query('SELECT 1')` returned `1` without exposing secrets |
| `/health.php` | PASS | Rebuilt TiDB-backed container returned HTTP 200 `{"status":"ok"}`; probe now applies the same CA + certificate verification options as `db()` |
| Production error handling | PASS | `APP_DEBUG=false`; sensitive paths and configuration disclosure checks passed |
| Scanner disabled mode | PASS | `SCANNER_ENABLED=false`; scanner page omitted and API returned HTTP 503 |

## Automated results

- User-provided TiDB evidence: `TIDB_PDO_TLS_OK`; `database/schema.sql` was
  imported successfully and required tables were confirmed.
- Live Docker-to-TiDB verification: the rebuilt container used the mounted CA
  secret with `DB_SSL_ENABLED=true`; `db()->query('SELECT 1')` returned `1`, and
  `/health.php` returned HTTP 200 `{"status":"ok"}`.
- No password, MFA key, CA contents, or connection string was printed or stored.
- TiDB endpoint DNS/TCP reachability: PASS (gateway endpoint on port 4000).
- PDO TLS configuration: PASS by static/lint/guard checks. TLS verification is
  required when `DB_SSL_ENABLED=true`; no certificate-verification bypass is used.
- Synthetic Docker seed: PASS (15 fictional students, payments, KPM records,
  reading records, and test role accounts).
- Database-backed unit suite: PASS (22/22).
- Full HTTP integration/security/MFA/audit/performance suite: PASS (44/44).
- Production HTTP smoke/security suite: PASS (17/17).
- PHP lint: PASS for all project PHP files outside the preserved backup.
- Localization audit: PASS (633 literal translation calls, 0 missing keys).
- Docker image build and production-image exclusion checks: PASS.

## Live TiDB checks completed for this health-path fix

The live Docker container was rebuilt with the corrected health probe and run with
`APP_ENV=production`, `APP_DEBUG=false`, `SCANNER_ENABLED=false`,
`DB_SSL_ENABLED=true`, and the existing CA secret mounted read-only. The probe
performs only `SELECT 1`; it does not require roles, settings, classes, students,
or other base data. A true connection failure remains HTTP 503 with the safe body
`{"status":"unavailable"}` and never exposes SQL, paths, credentials, or traces.

## Render runtime blocker: CA secret permissions

Render runtime diagnostics identified the blocker as `CA_FILE_READABLE=FAIL`
while DNS and TCP were successful. The `tidb-ca.pem` secret was present, but the
Apache/PHP runtime user (`www-data`, UID 33) was not a member of Render's
secret-file group (GID 1000). The Dockerfile now safely reuses an existing GID
1000 group or creates `render-secrets` with GID 1000, then adds `www-data` to
that group. No secret is copied into the image, no world-writable permissions
are used, and TLS verification remains enabled. The rebuilt image verified
`www-data` can read a synthetic group-1000-readable file and the updated health
code returned `{"status":"ok"}` against the existing live TiDB environment.

## Render and TiDB network setup

Render's default outbound addresses are region-specific CIDR ranges. After
creating the Singapore Web Service, open **Connect -> Outbound** in the Render
Dashboard and add every displayed Singapore CIDR range to the TiDB Cloud
Starter public-endpoint **Authorized Networks** list. Do not guess or hardcode
an old range; Render states that a service may use any address in its associated
ranges and ranges can change. If using Render Dedicated Outbound IPs, add the
assigned `/32` addresses instead.

References: [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses)
and [TiDB Cloud Starter public-endpoint firewall rules](https://docs.pingcap.com/tidbcloud/configure-serverless-firewall-rules-for-public-endpoints/).

## Limitations

- Browser visual checks, physical MFA QR scanning, and Render dashboard checks
  remain manual pre-deployment steps.
- No real student/parent data was used.

## Verdict

**READY FOR RENDER + TIDB DEPLOYMENT**

The health-path blocker is resolved and the rebuilt Docker container is confirmed
healthy against live TiDB over verified TLS. Complete the manual Render dashboard
steps and outbound-CIDR allowlist checks before creating the service.