# KinderVault Assistant (retired deployment feature)

The chatbot is intentionally retired from the deployed KinderVault interface. Its implementation remains in the repository for possible future redevelopment, but `CHATBOT_FEATURE_AVAILABLE` is `false`, the launcher and administration controls are not loaded, and direct requests to `api/chatbot.php` return HTTP 404 before authentication, intent processing, external requests, or database lookups.

The remaining sections document the preserved implementation only; they do not indicate that the chatbot is currently available.

Common questions supported locally include:

- `How many students are there?` / `Brp student ada?`
- `Who has not paid this month?` / `Sapa x bayar bln ni?`
- `Who did not pay last month?` / `Siapa belum bayar bulan lepas?`
- `Which fees are overdue?` / `Yuran mana tertunggak?`
- `Why is a fee overdue?` / `Kenapa jadi overdue?`
- Current-month collection totals, KPM and reading records, receipt lookup, student search, MFA help, and page navigation.

Monthly unpaid and overdue answers use the same fee-allocation rules as the Payments and Dashboard screens. They include active students who have no payment row yet, partial payments, and payments allocated to multiple months.

The built-in system guide also answers open-ended how-to and explanation questions about Dashboard, Students, Classes, Payments, Receipts, KPM Development, Reading Progress, Search, User Management, Roles & Permissions, Settings, Security, Audit Log, Backup & Restore, login/session behaviour, language switching, printing, WhatsApp reminders, and the chatbot itself. Live summaries are available for class counts, paid/unpaid students, recent payments, KPM/reading completion, and the overall dashboard. These answers remain read-only and permission-aware.

For broader natural-language classification, configure these environment variables for the Apache/PHP process, outside the web root:

- `KINDERVAULT_OPENAI_API_KEY` — an OpenAI API key.
- `KINDERVAULT_OPENAI_MODEL` — optional; defaults to `gpt-5.6-luna`.

Restart WampServer after changing the process environment. Never save an API key in this repository or in browser-side JavaScript.

When OpenAI classification is enabled, KinderVault sends only the current user's message, its locally normalized shorthand, and the interface language. Student, payment, receipt, and development rows remain on the KinderVault server. The response request uses `store: false`, and KinderVault executes the resulting intent against its own permission-checked, read-only handlers.

## Access and auditing

- The deployment kill switch is OFF in `config.php`; there is no chatbot control in **Settings** and no launcher in the application shell.
- `api/chatbot.php` returns HTTP 404 with `FEATURE_UNAVAILABLE` before it can authenticate a user, process text, contact an external service, or query application data.
- Administrators receive `chatbot.use` automatically.
- The preserved `chatbot.use` permission is hidden from **User Management** while the feature is retired.
- Every data request also requires the relevant module permission, such as `students.view`, `payments.view`, or `development.view`.
- Chatbot queries and permission-blocked attempts appear in **Settings → Security Audit Log**, including the detected intent, language, processing mode, safe query preview, and result count. Security-filtered input is redacted as described below.

## Security design

- User text is treated as untrusted input and checked locally before any optional AI request or database lookup.
- Prompt-injection phrases, exploit-like payloads, coding/source requests, credential or configuration requests, and bulk sensitive-data extraction requests are refused.
- OpenAI is used only as an optional intent classifier. It cannot run code, generate SQL, choose database columns, or return database content.
- Only allowlisted PHP handlers can answer, and each handler performs its own module-permission check and read-only prepared query.
- Security-blocked requests are auditable, but their original content is replaced with a redacted marker, length, category, and SHA-256 fingerprint so attempted secrets are not copied into the audit log.
- Input is limited to 500 characters and 30 requests per five minutes per signed-in session.
