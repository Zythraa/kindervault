# KinderVault Render-preparation validation

Validation date: 17 September 2026. This report covers local, synthetic-data
checks only. No GitHub repository was pushed and no Render service or secret was
created.

## Automated results

- Docker image build: PASS (`kindervault-web:latest`, PHP 8.3 Apache image).
- Image security inspection: PASS. Backups, testing fixtures, scanner assets,
  `.env`, and the scanner page are excluded from the production image;
  `database/schema.sql` remains available for database initialization.
- MySQL isolation: PASS. MySQL 8.0.46 ran in an isolated Compose network with
  no published database port.
- Synthetic seed: PASS (15 students, 12 payments, 15 development records, 15
  reading records, and synthetic role accounts).
- HTTP smoke/security suite: PASS (17/17), including health, CSRF, RBAC,
  scanner-disabled behavior, and blocked sensitive/deployment files.
- Database-backed unit suite: PASS (22/22), including security configuration,
  permissions, MFA cryptography/recovery codes, CSRF, audit sanitization, and
  public-user field filtering.
- Full HTTP integration/security/MFA/audit/performance suite: PASS (44/44).
- PHP lint: PASS for all project PHP files outside the preserved backup.
- Localization audit: PASS (631 literal calls, 0 missing translation keys).
- Persistence: PASS. Synthetic records survived a MySQL restart and a full
  web-stack recreate using the named volume.
- Initialization safety: PASS. Class defaults use idempotent `INSERT IGNORE`
  and preserve administrator-created classes on repeated application starts.
- Cleanup: PASS. Disposable containers, network, and synthetic MySQL volume
  were removed after testing. The existing pre-render backup was preserved.

## Manual steps still required

1. Install/use Git, create the private repository, and push the reviewed source
   (without `.env`, backups, testing fixtures, or scanner resources).
2. Provision MySQL 8/MariaDB externally, or as a Render Private Service with a
   persistent disk mounted at `/var/lib/mysql`; Render does not provide managed
   MySQL.
3. Import `database/schema.sql`, configure the Render environment variables,
   generate a unique `MFA_ENCRYPTION_KEY`, and create the first Administrator
   with the CLI-only `tools/create_admin.php` procedure.
4. Deploy the Docker Web Service from `render.yaml`, then complete
   `RENDER_POST_DEPLOY_CHECKLIST.md` in a real browser, including MFA QR
   scanning, print layouts, and bilingual navigation.

## Specific limitations

- The browser/visual checklist and physical authenticator scan were not
  automated in this environment.
- Host access to Docker's mapped `127.0.0.1:8080` was unavailable from this
  sandbox; all application checks were executed successfully over the isolated
  Docker network.
- The local WAMP `kindervault` database was not used or modified.

## Verdict

**READY FOR MANUAL RENDER DEPLOYMENT**

The limitations above are post-deployment browser/manual checks, not code,
configuration, or security blockers. Follow `RENDER_DEPLOYMENT.md` in order and
complete the post-deploy checklist before introducing real operational data.
