// ============================================================
// pages/dashboard.jsx - DashboardPage component
// ============================================================

const DashboardPage = ({students, payments, classesList, devRecords, setPage, openAddStudent, openBackupSettings, permissions = [], isAdministrator = false}) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const thisMonth = today.toISOString().slice(0, 7);
  const thisYear = today.getFullYear();
  const activeStudents = students.filter(s => s.status === "Active");
  const activeCount = activeStudents.length;
  const canViewStudents = canUsePermission(permissions, "students.view", isAdministrator);
  const canCreateStudents = canUsePermission(permissions, "students.create", isAdministrator);
  const canViewClasses = canUsePermission(permissions, "classes.view", isAdministrator);
  const canViewPayments = canUsePermission(permissions, "payments.view", isAdministrator);
  const canViewReceipts = canUsePermission(permissions, "receipts.view", isAdministrator);
  const canViewDevelopment = canUsePermission(permissions, "development.view", isAdministrator);
  const canAccessSettings = canUsePermission(permissions, "settings.access", isAdministrator);
  const canAddStudents = canViewStudents && canCreateStudents;
  const studentById = Object.fromEntries(students.map(s => [s.id, s]));
  const backupMeta = (() => {
    try {
      return JSON.parse(localStorage.getItem("kv_last_backup_meta") || "null");
    } catch (e) {
      return null;
    }
  })();

  const computeVirtualOverduePayments = () => {
    const paidAmountsByStudent = {};

    payments.forEach(p => {
      if (p.type !== "Monthly Fee" || (p.status !== "Paid" && p.status !== "Advance" && p.status !== "Partial")) return;
      const studentId = parseInt(p.student_id);
      const student = studentById[studentId];
      if (!student) return;

      const fee = parseFloat(student.fee || 0);
      if (!paidAmountsByStudent[studentId]) paidAmountsByStudent[studentId] = {};
      const months = (p.month || "").split(",").map(m => m.trim()).filter(Boolean);
      let remaining = parseFloat(p.amount || 0);

      months.forEach(m => {
        if (remaining <= 0) return;
        const already = parseFloat(paidAmountsByStudent[studentId][m] || 0);
        const payable = Math.min(Math.max(fee - already, 0), remaining);
        if (payable > 0) {
          paidAmountsByStudent[studentId][m] = already + payable;
          remaining -= payable;
        }
      });
    });

    const rows = [];
    activeStudents.forEach(s => {
      const fee = parseFloat(s.fee || 0);
      const startMonthStr = s.enrol ? s.enrol.substring(0, 7) : thisMonth;
      let [sy, sm] = startMonthStr.split("-").map(Number);
      const [cy, cm] = thisMonth.split("-").map(Number);
      const paidAmounts = paidAmountsByStudent[s.id] || {};

      while (sy < cy || (sy === cy && sm <= cm)) {
        const monthKey = `${sy}-${String(sm).padStart(2, "0")}`;
        const due = Math.max(0, fee - (paidAmounts[monthKey] || 0));
        if (due > 0 && monthKey < thisMonth) {
          rows.push({
            id: `virt_${s.id}_${monthKey}`,
            student_id: s.id,
            student_name: s.name,
            student_class: s.class,
            amount: due,
            month: monthKey,
            status: "Overdue"
          });
        }
        sm++;
        if (sm > 12) { sm = 1; sy++; }
      }
    });

    return rows;
  };

  const paidThisMonth = payments.filter(p =>
    (p.date || "").startsWith(thisMonth) && (p.status === "Paid" || p.status === "Advance" || p.status === "Partial")
  );

  const collectedThisMonth = paidThisMonth
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const paymentAlerts = [
    ...payments.filter(p => p.status === "Unpaid" || p.status === "Overdue"),
    ...computeVirtualOverduePayments()
  ].sort((a, b) => {
    const rank = {Overdue: 0, Unpaid: 1};
    const rankDiff = (rank[a.status] ?? 2) - (rank[b.status] ?? 2);
    if (rankDiff !== 0) return rankDiff;
    return String(a.month || "").localeCompare(String(b.month || ""));
  });

  const uniqueAlertRows = [];
  const seen = new Set();
  paymentAlerts.forEach(row => {
    const key = `${row.student_id}_${row.month || ""}_${row.status}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueAlertRows.push(row);
  });
  const overdueCount = new Set(uniqueAlertRows.map(p => String(p.student_id))).size;

  const currentYearDevRecords = devRecords.filter(d => {
    if (d.is_legacy || d.record_type === "legacy") return false;
    const dateValue = d.assessment_date || (d.month ? `${d.month}-01` : "");
    if (!dateValue) return false;
    const year = new Date(dateValue).getFullYear();
    return year === thisYear;
  });

  const studentsWithoutDevelopment = activeStudents.filter(s =>
    !currentYearDevRecords.some(d => parseInt(d.student_id) === parseInt(s.id))
  );

  const developmentCompletedCount = activeStudents.length - studentsWithoutDevelopment.length;

  const developmentPendingRows = studentsWithoutDevelopment
    .map(s => ({
      id: s.id,
      name: s.name,
      class: s.class,
      parent: s.parent,
    }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {sensitivity:"base"}));

  const recentPayments = payments
    .filter(p => p.status === "Paid" || p.status === "Advance" || p.status === "Partial")
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  const backupDateText = backupMeta?.at
    ? window.kvDateTime(backupMeta.at, {day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit"})
    : window.kvT("No backup recorded");

  const backupStatusText = window.kvT(backupMeta?.status || "Not recorded");

  const formatMonth = (month) => {
    const values = String(month || "").split(",").map(value => value.trim()).filter(Boolean);
    if (!values.length) return "-";
    const formatValue = (value) => {
      const d = new Date(`${value}-01`);
      return window.kvDate(d, {month: "short"}, value);
    };
    return values.length === 1
      ? formatValue(values[0])
      : `${formatValue(values[0])} - ${formatValue(values[values.length - 1])}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return window.kvDate(d, {day: "2-digit", month: "2-digit", year: "numeric"}, date);
  };

  const summaryCards = [
    ...(canViewStudents ? [{label: "Active Students", value: activeCount, sub: "Currently enrolled", icon: "users-group", tone: "blue"}] : []),
    ...(canViewPayments ? [
      {label: "Collected This Month", value: `RM ${collectedThisMonth.toFixed(2)}`, sub: window.kvT("{count} payment(s) received", {count: paidThisMonth.length}), icon: "cash-banknote", tone: "green"},
      {label: "Fee Follow-up", value: overdueCount, sub: window.kvT("{count} unpaid or overdue item(s)", {count: uniqueAlertRows.length}), icon: "alert-circle", tone: "red"}
    ] : []),
    ...(canViewDevelopment ? [{label: "Development Due", value: studentsWithoutDevelopment.length, sub: window.kvT("{completed}/{total} completed for {year}", {completed: developmentCompletedCount, total: activeCount, year: thisYear}), icon: "chart-line", tone: "amber"}] : [])
  ];

  const attentionCount = (canViewPayments ? uniqueAlertRows.length : 0) + (canViewDevelopment ? developmentPendingRows.length : 0);
  const paymentAttentionRows = canViewPayments ? uniqueAlertRows.slice(0, 4) : [];
  const developmentAttentionRows = canViewDevelopment ? developmentPendingRows.slice(0, 4) : [];
  const classNames = Array.from(new Set([
    ...(Array.isArray(classesList) ? classesList : []).map(c => typeof c === "string" ? c : c?.name).filter(Boolean),
    ...activeStudents.map(student => student.class).filter(Boolean)
  ]));
  const classOverview = classNames.map(name => ({
    name,
    students: activeStudents.filter(student => student.class === name).length
  }));
  const maxClassEnrolment = Math.max(...classOverview.map(item => item.students), 1);

  const quickActions = [
    ...(canAddStudents ? [{label: "Add Student", icon: "user-plus", action: openAddStudent || (() => setPage("students"))}] : canViewStudents ? [{label: "Students", icon: "users", action: () => setPage("students")}] : []),
    ...(canViewClasses ? [{label: "Classes", icon: "chalkboard", action: () => setPage("classes")}] : []),
    ...(canViewPayments ? [{label: "Payments", icon: "credit-card", action: () => setPage("payments")}] : []),
    ...(canViewReceipts ? [{label: "Receipts", icon: "receipt", action: () => setPage("receipts")}] : []),
    ...(canViewDevelopment ? [{label: "Development", icon: "chart-line", action: () => setPage("development")}] : []),
    ...(canAccessSettings ? [{label: "Settings", icon: "settings", action: () => setPage("settings")}] : []),
    ...(isAdministrator ? [{label: "Backups", icon: "database-export", action: openBackupSettings || (() => setPage("settings"))}] : [])
  ];

  const canShowClassOverview = canViewStudents && canViewClasses;
  const hasAttentionWidgets = canViewPayments || canViewDevelopment;
  const attentionWidgetCount = Number(canViewPayments) + Number(canViewDevelopment);
  const hasContextPanels = canShowClassOverview || isAdministrator;
  const hasOperationalPanels = canViewPayments || hasContextPanels;
  const overviewText = isAdministrator
    ? "Current student, payment and development work at a glance."
    : "Your dashboard shows the areas assigned to your account.";
  const headerActions = [
    canViewPayments ? {label: "Payments", icon: "credit-card", variant: "outline", action: () => setPage("payments")} : null,
    canAddStudents ? {label: "Add Student", icon: "user-plus", action: openAddStudent || (() => setPage("students"))} : canViewStudents ? {label: "Students", icon: "users", action: () => setPage("students")} : null,
    canViewDevelopment ? {label: "Development", icon: "chart-line", variant: "outline", action: () => setPage("development")} : null
  ].filter(Boolean).slice(0, 2);
  const quickActionsPanel = quickActions.length ? (
    <article className={`panel dashboard-quick-panel${hasAttentionWidgets ? "" : " dashboard-quick-panel--compact"}`}>
      <div className="panel-head">
        <div>
          <h2>{window.kvT("Quick actions")}</h2>
          <p>{window.kvT(isAdministrator ? "Common admin tasks" : "Available actions")}</p>
        </div>
      </div>
      <div className="dashboard-quick-actions">
        {quickActions.map(item => (
          <button key={item.label} type="button" className="dashboard-quick-action" onClick={item.action}>
            <i className={`ti ti-${item.icon}`} aria-hidden="true"/>
            <span>{window.kvT(item.label)}</span>
            <i className="ti ti-chevron-right" aria-hidden="true"/>
          </button>
        ))}
      </div>
    </article>
  ) : null;

  return (
    <main className="kv-page dashboard-2026 dashboard-workspace">
      <section className="dashboard-command-bar">
        <div>
          <div className="dashboard-eyebrow">{window.kvT(isAdministrator ? "Admin Workspace" : "Workspace")}</div>
          <h1>{window.kvT("Dashboard")}</h1>
          <p>{window.kvT(overviewText)}</p>
        </div>
        <div className="dashboard-command-actions">
          <span className="dashboard-date-context"><i className="ti ti-calendar-event" aria-hidden="true"/>{window.kvDate(today, {weekday: "long", day: "numeric", month: "long", year: "numeric"})}</span>
          {headerActions.map(action => <Btn key={action.label} variant={action.variant || "primary"} onClick={action.action}><i className={`ti ti-${action.icon}`} aria-hidden="true"/>{window.kvT(action.label)}</Btn>)}
        </div>
      </section>

      {summaryCards.length > 0 && <section className={`metric-grid dashboard-card-row dashboard-card-row--${summaryCards.length}`} aria-label={window.kvT("Key statistics")}>
        {summaryCards.map(card => (
          <article key={card.label} className={`metric-card tone-${card.tone}`}>
            <div className="metric-top">
              <div className="metric-icon"><i className={`ti ti-${card.icon}`} aria-hidden="true"/></div>
              <div className="metric-label">{window.kvT(card.label)}</div>
            </div>
            <div className="metric-value">{card.value}</div>
            <div className="metric-sub">{window.kvT(card.sub)}</div>
          </article>
        ))}
      </section>}

      {hasAttentionWidgets ? (
      <section className="dashboard-priority-section" aria-labelledby="dashboard-attention-title">
        <div className="dashboard-section-heading">
          <div>
            <div className="dashboard-eyebrow">{window.kvT("Daily priority")}</div>
            <h2 id="dashboard-attention-title">{window.kvT("Needs attention")}</h2>
          </div>
          <span className={`dashboard-attention-count${attentionCount ? " has-items" : ""}`}>{window.kvT("{count} item(s)", {count: attentionCount})}</span>
        </div>

        <div className={`dashboard-priority-grid${quickActionsPanel ? "" : " dashboard-priority-grid--attention-only"}`}>
          <div className={`dashboard-attention-grid dashboard-attention-grid--${attentionWidgetCount}`}>
            {canViewPayments && <article className="dashboard-attention-card dashboard-attention-card--payments">
              <div className="dashboard-attention-card-head">
                <div className="dashboard-attention-icon"><i className="ti ti-alert-circle" aria-hidden="true"/></div>
                <div>
                  <h3>{window.kvT("Fee Follow-up")}</h3>
                  <p>{window.kvT("{count} student(s) need payment attention", {count: overdueCount})}</p>
                </div>
              </div>
              {paymentAttentionRows.length ? (
                <div className="dashboard-attention-list">
                  {paymentAttentionRows.map(row => (
                    <div className="dashboard-attention-row" key={row.id}>
                      <div>
                        <strong>{row.student_name || studentById[row.student_id]?.name || window.kvT("Unknown")}</strong>
                        <span>{row.student_class || studentById[row.student_id]?.class || "-"} - {formatMonth(row.month)}</span>
                      </div>
                      <div className="dashboard-attention-row-meta">
                        <strong>RM {parseFloat(row.amount || 0).toFixed(2)}</strong>
                        {statusBadge(row.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="dashboard-empty-inline"><i className="ti ti-circle-check" aria-hidden="true"/>{window.kvT("No payment follow-up right now.")}</div>}
              <Btn variant="outline" className="dashboard-card-action" onClick={() => setPage("payments")}>{window.kvT("Review Payments")} <i className="ti ti-arrow-right" aria-hidden="true"/></Btn>
            </article>}

            {canViewDevelopment && <article className="dashboard-attention-card dashboard-attention-card--development">
              <div className="dashboard-attention-card-head">
                <div className="dashboard-attention-icon"><i className="ti ti-list-check" aria-hidden="true"/></div>
                <div>
                  <h3>{window.kvT("Development records")}</h3>
                  <p>{window.kvT("{completed}/{total} active students completed for {year}", {completed: developmentCompletedCount, total: activeCount, year: thisYear})}</p>
                </div>
              </div>
              {developmentAttentionRows.length ? (
                <div className="dashboard-attention-list">
                  {developmentAttentionRows.map(row => (
                    <div className="dashboard-attention-row" key={row.id}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.class || "-"}{row.parent ? ` - ${row.parent}` : ""}</span>
                      </div>
                      <span className="dashboard-row-label">{window.kvT("Pending")}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="dashboard-empty-inline"><i className="ti ti-circle-check" aria-hidden="true"/>{window.kvT("All active student records are complete.")}</div>}
              <Btn variant="outline" className="dashboard-card-action" onClick={() => setPage("development")}>{window.kvT("Open Development")} <i className="ti ti-arrow-right" aria-hidden="true"/></Btn>
            </article>}
          </div>

          {quickActionsPanel}
        </div>
      </section>
      ) : quickActionsPanel ? (
        <section className="dashboard-quick-only-section">{quickActionsPanel}</section>
      ) : (
        <section className="dashboard-access-panel">
          <div className="dashboard-access-icon"><i className="ti ti-lock-access" aria-hidden="true"/></div>
          <div>
            <h2>{window.kvT("No workspace modules are available for this account.")}</h2>
            <p>{window.kvT("Ask an Administrator to assign the access needed for your work.")}</p>
          </div>
        </section>
      )}

      {hasOperationalPanels && <section className={`dashboard-operations-grid${!canViewPayments || !hasContextPanels ? " dashboard-operations-grid--single" : ""}`} aria-label={window.kvT("Operational overview")}>
        {canViewPayments && <article className="panel dashboard-recent-payments-panel">
          <div className="panel-head">
            <div>
              <h2>{window.kvT("Recent collections")}</h2>
              <p>{window.kvT("Latest payment records received")}</p>
            </div>
            {canViewReceipts && <Btn small variant="outline" onClick={() => setPage("receipts")}>{window.kvT("View Receipts")}</Btn>}
          </div>
          <div className="compact-table-wrap">
            {recentPayments.length ? (
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>{window.kvT("Receipt")}</th>
                    <th>{window.kvT("Student")}</th>
                    <th>{window.kvT("Amount")}</th>
                    <th>{window.kvT("Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(payment => (
                    <tr key={payment.id}>
                      <td><code>{payment.receipt || "-"}</code></td>
                      <td>{payment.student_name || studentById[payment.student_id]?.name || window.kvT("Unknown")}</td>
                      <td className="money-cell">RM {parseFloat(payment.amount || 0).toFixed(2)}</td>
                      <td>{formatDate(payment.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="receipt" text={window.kvT("No recent payments.")}/>} 
          </div>
        </article>}

        {hasContextPanels && <div className="dashboard-context-stack">
          {canShowClassOverview && <article className="panel dashboard-class-panel">
            <div className="panel-head">
              <div>
                <h2>{window.kvT("Class enrolment")}</h2>
                <p>{window.kvT("Active students by class")}</p>
              </div>
              <Btn small variant="outline" onClick={() => setPage("classes")}>{window.kvT("Classes")}</Btn>
            </div>
            {classOverview.length ? (
              <div className="dashboard-class-list">
                {classOverview.map(item => (
                  <div className="dashboard-class-row" key={item.name}>
                    <div className="dashboard-class-row-top"><strong>{item.name}</strong><span>{window.kvT("{count} student(s)", {count: item.students})}</span></div>
                    <div className="dashboard-class-progress"><span style={{width: `${(item.students / maxClassEnrolment) * 100}%`}}/></div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon="chalkboard" text={window.kvT("No class enrolment data.")}/>} 
          </article>}

          {isAdministrator && <article className="panel dashboard-backup-panel">
            <div className="panel-head">
              <div>
                <h2>{window.kvT("Backup status")}</h2>
                <p>{window.kvT("Latest local backup record")}</p>
              </div>
            </div>
            <div className="dashboard-backup-content">
              <div className="dashboard-backup-icon"><i className="ti ti-database-export" aria-hidden="true"/></div>
              <div>
                <strong className={backupMeta?.status === "Successful" ? "ok-text" : "warn-text"}>{backupStatusText}</strong>
                <span>{backupDateText}</span>
              </div>
              <Btn small variant="outline" onClick={openBackupSettings || (() => setPage("settings"))}>{window.kvT("Open")}</Btn>
            </div>
          </article>}
        </div>}
      </section>}
    </main>
  );
};
