# Render demo data fixture

This is an explicitly guarded, one-time fixture for the deployed FYP environment. It creates 20 fictional Malaysian student records and payment scenarios in the Render/TiDB database only. It does not run automatically, and it must not be run against the WAMP database.

## Recommended method for Render Free

Render Free does not provide a service shell. Use the TiDB Cloud **SQL Editor** instead:

1. Open the TiDB Cloud Starter cluster and select the `kindervault` database on the `main` branch.
2. Open [database/render_demo_student_seed.sql](database/render_demo_student_seed.sql), copy the full file, and paste it into the SQL Editor.
3. Execute it once, then refresh the deployed Render dashboard.

For development testing, run [database/render_demo_development_seed.sql](database/render_demo_development_seed.sql) after the student fixture. It creates varied KPM checklist records for 12 demo students and intentionally leaves 8 demo students without development records.

For reading-progress testing, run [database/render_demo_reading_seed.sql](database/render_demo_reading_seed.sql) after the student fixture. It creates 15 BM/English reading records for 12 demo students, including multiple history dates and language combinations, and leaves 8 demo students without reading records.

The SQL fixture is idempotent for its `DEMO26-*` student codes and `DEMO26-PAY-*` payment references. It uses synthetic records only and does not contain credentials or deployment secrets.

## Alternative when a Render shell is available

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
