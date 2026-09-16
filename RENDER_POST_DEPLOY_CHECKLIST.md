# KinderVault post-deploy smoke checklist

- [ ] `/health.php` returns `{"status":"ok"}`.
- [ ] Administrator login, logout, timeout, and session renewal work.
- [ ] MFA enrollment, QR scan, challenge, and recovery flow work.
- [ ] Dashboard loads current counts.
- [ ] Student create/edit/profile works.
- [ ] Payment create, outstanding dues, and receipt print/download work.
- [ ] KPM Development and Reading Progress create/edit/history work.
- [ ] Global search returns permitted results.
- [ ] Teacher and Authorized Staff cannot access Administrator-only actions.
- [ ] Audit log records meaningful events without secrets.
- [ ] English/Bahasa Melayu switching survives navigation.
- [ ] Scanner button/camera/API are unavailable.
- [ ] Logout returns to the login page.
