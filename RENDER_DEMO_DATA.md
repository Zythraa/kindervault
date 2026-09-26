# Render demo data fixture

This is an explicitly guarded, one-time fixture for the deployed FYP environment. It creates 20 fictional Malaysian student records and payment scenarios in the Render/TiDB database only. It does not run automatically, and it must not be run against the WAMP database.

## Run from the Render service shell

After the latest commit has been deployed, open the Render service shell and run:

```sh
KV_RENDER_DEMO_SEED_CONFIRM=RENDER_ONLY_2026 php testing/render_demo_student_seed.php
```

The Render service already supplies the `DB_*` and TLS environment variables. Do not paste a database password into the command or into source files.

The command is protected by all of the following:

- PHP CLI only
- `APP_ENV=production`
- the explicit `KV_RENDER_DEMO_SEED_CONFIRM=RENDER_ONLY_2026` confirmation
- `/testing` is blocked from HTTP access by `.htaccess`

The fixture is idempotent for its `DEMO26-*` student codes and `DEMO26-PAY-*` payment references. It reports only a success/failure summary and never prints credentials or connection details.

After it completes, refresh the Render dashboard and filter the student/payment pages for the `DEMO26-` records. The fixture includes mixed ages/classes, genders, enrolment dates, packages A/B/C, paid, unpaid, overdue and advance-paid monthly-fee scenarios.
