const DashboardPage = ({
  students,
  payments,
  classesList,
  devRecords,
  setPage,
  openAddStudent,
  openBackupSettings,
  permissions = [],
  isAdministrator = false
}) => {
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
    const rows = [];
    activeStudents.forEach(s => {
      const fee = parseFloat(s.fee || 0);
      const studentPayments = payments.filter(p => parseInt(p.student_id) === parseInt(s.id) && p.type === "Monthly Fee");
      const paidAmounts = window.kvAllocateMonthlyPaidAmounts(studentPayments, fee);
      const startMonthStr = s.enrol ? s.enrol.substring(0, 7) : thisMonth;
      let [sy, sm] = startMonthStr.split("-").map(Number);
      const [cy, cm] = thisMonth.split("-").map(Number);
      while (sy < cy || sy === cy && sm <= cm) {
        const monthKey = `${sy}-${String(sm).padStart(2, "0")}`;
        const paid = paidAmounts[monthKey] || 0;
        const due = Math.max(0, fee - paid);
        if (due > 0.005 && monthKey < thisMonth) {
          rows.push({
            id: `virt_${s.id}_${monthKey}`,
            student_id: s.id,
            student_name: s.name,
            student_class: s.class,
            amount: due,
            month: monthKey,
            status: paid > 0.005 ? "Partial" : "Overdue"
          });
        }
        sm++;
        if (sm > 12) {
          sm = 1;
          sy++;
        }
      }
    });
    return rows;
  };
  const paidThisMonth = payments.filter(p => (p.date || "").startsWith(thisMonth) && (p.status === "Paid" || p.status === "Advance" || p.status === "Partial"));
  const collectedThisMonth = paidThisMonth.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const nonMonthlyAlerts = payments.filter(p => (p.status === "Unpaid" || p.status === "Overdue") && p.type !== "Monthly Fee");
  const paymentAlerts = [...nonMonthlyAlerts, ...computeVirtualOverduePayments()].sort((a, b) => {
    const rank = {
      Overdue: 0,
      Unpaid: 1
    };
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
  const studentsWithoutDevelopment = activeStudents.filter(s => !currentYearDevRecords.some(d => parseInt(d.student_id) === parseInt(s.id)));
  const developmentCompletedCount = activeStudents.length - studentsWithoutDevelopment.length;
  const developmentPendingRows = studentsWithoutDevelopment.map(s => ({
    id: s.id,
    name: s.name,
    class: s.class,
    parent: s.parent
  })).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    sensitivity: "base"
  }));
  const recentPayments = payments.filter(p => p.status === "Paid" || p.status === "Advance" || p.status === "Partial").sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
  const backupDateText = backupMeta?.at ? window.kvDateTime(backupMeta.at, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }) : window.kvT("No backup recorded");
  const backupStatusText = window.kvT(backupMeta?.status || "Not recorded");
  const formatMonth = month => {
    const values = String(month || "").split(",").map(value => value.trim()).filter(Boolean);
    if (!values.length) return "-";
    const formatValue = value => {
      const d = new Date(`${value}-01`);
      return window.kvDate(d, {
        month: "short"
      }, value);
    };
    return values.length === 1 ? formatValue(values[0]) : `${formatValue(values[0])} - ${formatValue(values[values.length - 1])}`;
  };
  const formatDate = date => {
    if (!date) return "-";
    const d = new Date(date);
    return window.kvDate(d, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }, date);
  };
  const summaryCards = [...(canViewStudents ? [{
    label: "Active Students",
    value: activeCount,
    sub: "Currently enrolled",
    icon: "users-group",
    tone: "blue"
  }] : []), ...(canViewPayments ? [{
    label: "Collected This Month",
    value: `RM ${collectedThisMonth.toFixed(2)}`,
    sub: window.kvT("{count} payment(s) received", {
      count: paidThisMonth.length
    }),
    icon: "cash-banknote",
    tone: "green"
  }, {
    label: "Fee Follow-up",
    value: overdueCount,
    sub: window.kvT("{count} unpaid or overdue item(s)", {
      count: uniqueAlertRows.length
    }),
    icon: "alert-circle",
    tone: "red"
  }] : []), ...(canViewDevelopment ? [{
    label: "Development Due",
    value: studentsWithoutDevelopment.length,
    sub: window.kvT("{completed}/{total} completed for {year}", {
      completed: developmentCompletedCount,
      total: activeCount,
      year: thisYear
    }),
    icon: "chart-line",
    tone: "amber"
  }] : [])];
  const attentionCount = (canViewPayments ? uniqueAlertRows.length : 0) + (canViewDevelopment ? developmentPendingRows.length : 0);
  const paymentAttentionRows = canViewPayments ? uniqueAlertRows.slice(0, 4) : [];
  const developmentAttentionRows = canViewDevelopment ? developmentPendingRows.slice(0, 4) : [];
  const classNames = Array.from(new Set([...(Array.isArray(classesList) ? classesList : []).map(c => typeof c === "string" ? c : c?.name).filter(Boolean), ...activeStudents.map(student => student.class).filter(Boolean)]));
  const classOverview = classNames.map(name => ({
    name,
    students: activeStudents.filter(student => student.class === name).length
  }));
  const maxClassEnrolment = Math.max(...classOverview.map(item => item.students), 1);
  const quickActions = [...(canAddStudents ? [{
    label: "Add Student",
    icon: "user-plus",
    action: openAddStudent || (() => setPage("students"))
  }] : canViewStudents ? [{
    label: "Students",
    icon: "users",
    action: () => setPage("students")
  }] : []), ...(canViewClasses ? [{
    label: "Classes",
    icon: "chalkboard",
    action: () => setPage("classes")
  }] : []), ...(canViewPayments ? [{
    label: "Payments",
    icon: "credit-card",
    action: () => setPage("payments")
  }] : []), ...(canViewReceipts ? [{
    label: "Receipts",
    icon: "receipt",
    action: () => setPage("receipts")
  }] : []), ...(canViewDevelopment ? [{
    label: "Development",
    icon: "chart-line",
    action: () => setPage("development")
  }] : []), ...(canAccessSettings ? [{
    label: "Settings",
    icon: "settings",
    action: () => setPage("settings")
  }] : []), ...(isAdministrator ? [{
    label: "Backups",
    icon: "database-export",
    action: openBackupSettings || (() => setPage("settings"))
  }] : [])];
  const canShowClassOverview = canViewStudents && canViewClasses;
  const hasAttentionWidgets = canViewPayments || canViewDevelopment;
  const attentionWidgetCount = Number(canViewPayments) + Number(canViewDevelopment);
  const hasContextPanels = canShowClassOverview || isAdministrator;
  const hasOperationalPanels = canViewPayments || hasContextPanels;
  const overviewText = isAdministrator ? "Current student, payment and development work at a glance." : "Your dashboard shows the areas assigned to your account.";
  const headerActions = [canViewPayments ? {
    label: "Payments",
    icon: "credit-card",
    variant: "outline",
    action: () => setPage("payments")
  } : null, canAddStudents ? {
    label: "Add Student",
    icon: "user-plus",
    action: openAddStudent || (() => setPage("students"))
  } : canViewStudents ? {
    label: "Students",
    icon: "users",
    action: () => setPage("students")
  } : null, canViewDevelopment ? {
    label: "Development",
    icon: "chart-line",
    variant: "outline",
    action: () => setPage("development")
  } : null].filter(Boolean).slice(0, 2);
  const quickActionsPanel = quickActions.length ? React.createElement("article", {
    className: `panel dashboard-quick-panel${hasAttentionWidgets ? "" : " dashboard-quick-panel--compact"}`
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("div", null, React.createElement("h2", null, window.kvT("Quick actions")), React.createElement("p", null, window.kvT(isAdministrator ? "Common admin tasks" : "Available actions")))), React.createElement("div", {
    className: "dashboard-quick-actions"
  }, quickActions.map(item => React.createElement("button", {
    key: item.label,
    type: "button",
    className: "dashboard-quick-action",
    onClick: item.action
  }, React.createElement("i", {
    className: `ti ti-${item.icon}`,
    "aria-hidden": "true"
  }), React.createElement("span", null, window.kvT(item.label)), React.createElement("i", {
    className: "ti ti-chevron-right",
    "aria-hidden": "true"
  }))))) : null;
  return React.createElement("main", {
    className: "kv-page dashboard-2026 dashboard-workspace"
  }, React.createElement("section", {
    className: "dashboard-command-bar"
  }, React.createElement("div", null, React.createElement("div", {
    className: "dashboard-eyebrow"
  }, window.kvT(isAdministrator ? "Admin Workspace" : "Workspace")), React.createElement("h1", null, window.kvT("Dashboard")), React.createElement("p", null, window.kvT(overviewText))), React.createElement("div", {
    className: "dashboard-command-actions"
  }, React.createElement("span", {
    className: "dashboard-date-context"
  }, React.createElement("i", {
    className: "ti ti-calendar-event",
    "aria-hidden": "true"
  }), window.kvDate(today, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })), headerActions.map(action => React.createElement(Btn, {
    key: action.label,
    variant: action.variant || "primary",
    onClick: action.action
  }, React.createElement("i", {
    className: `ti ti-${action.icon}`,
    "aria-hidden": "true"
  }), window.kvT(action.label))))), summaryCards.length > 0 && React.createElement("section", {
    className: `metric-grid dashboard-card-row dashboard-card-row--${summaryCards.length}`,
    "aria-label": window.kvT("Key statistics")
  }, summaryCards.map(card => React.createElement("article", {
    key: card.label,
    className: `metric-card tone-${card.tone}`
  }, React.createElement("div", {
    className: "metric-top"
  }, React.createElement("div", {
    className: "metric-icon"
  }, React.createElement("i", {
    className: `ti ti-${card.icon}`,
    "aria-hidden": "true"
  })), React.createElement("div", {
    className: "metric-label"
  }, window.kvT(card.label))), React.createElement("div", {
    className: "metric-value"
  }, card.value), React.createElement("div", {
    className: "metric-sub"
  }, window.kvT(card.sub))))), hasAttentionWidgets ? React.createElement("section", {
    className: "dashboard-priority-section",
    "aria-labelledby": "dashboard-attention-title"
  }, React.createElement("div", {
    className: "dashboard-section-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "dashboard-eyebrow"
  }, window.kvT("Daily priority")), React.createElement("h2", {
    id: "dashboard-attention-title"
  }, window.kvT("Needs attention"))), React.createElement("span", {
    className: `dashboard-attention-count${attentionCount ? " has-items" : ""}`
  }, window.kvT("{count} item(s)", {
    count: attentionCount
  }))), React.createElement("div", {
    className: `dashboard-priority-grid${quickActionsPanel ? "" : " dashboard-priority-grid--attention-only"}`
  }, React.createElement("div", {
    className: `dashboard-attention-grid dashboard-attention-grid--${attentionWidgetCount}`
  }, canViewPayments && React.createElement("article", {
    className: "dashboard-attention-card dashboard-attention-card--payments"
  }, React.createElement("div", {
    className: "dashboard-attention-card-head"
  }, React.createElement("div", {
    className: "dashboard-attention-icon"
  }, React.createElement("i", {
    className: "ti ti-alert-circle",
    "aria-hidden": "true"
  })), React.createElement("div", null, React.createElement("h3", null, window.kvT("Fee Follow-up")), React.createElement("p", null, window.kvT("{count} student(s) need payment attention", {
    count: overdueCount
  })))), paymentAttentionRows.length ? React.createElement("div", {
    className: "dashboard-attention-list"
  }, paymentAttentionRows.map(row => React.createElement("div", {
    className: "dashboard-attention-row",
    key: row.id
  }, React.createElement("div", null, React.createElement("strong", null, row.student_name || studentById[row.student_id]?.name || window.kvT("Unknown")), React.createElement("span", null, row.student_class || studentById[row.student_id]?.class || "-", " - ", formatMonth(row.month))), React.createElement("div", {
    className: "dashboard-attention-row-meta"
  }, React.createElement("strong", null, "RM ", parseFloat(row.amount || 0).toFixed(2)), statusBadge(row.status))))) : React.createElement("div", {
    className: "dashboard-empty-inline"
  }, React.createElement("i", {
    className: "ti ti-circle-check",
    "aria-hidden": "true"
  }), window.kvT("No payment follow-up right now.")), React.createElement(Btn, {
    variant: "outline",
    className: "dashboard-card-action",
    onClick: () => setPage("payments")
  }, window.kvT("Review Payments"), " ", React.createElement("i", {
    className: "ti ti-arrow-right",
    "aria-hidden": "true"
  }))), canViewDevelopment && React.createElement("article", {
    className: "dashboard-attention-card dashboard-attention-card--development"
  }, React.createElement("div", {
    className: "dashboard-attention-card-head"
  }, React.createElement("div", {
    className: "dashboard-attention-icon"
  }, React.createElement("i", {
    className: "ti ti-list-check",
    "aria-hidden": "true"
  })), React.createElement("div", null, React.createElement("h3", null, window.kvT("Development records")), React.createElement("p", null, window.kvT("{completed}/{total} active students completed for {year}", {
    completed: developmentCompletedCount,
    total: activeCount,
    year: thisYear
  })))), developmentAttentionRows.length ? React.createElement("div", {
    className: "dashboard-attention-list"
  }, developmentAttentionRows.map(row => React.createElement("div", {
    className: "dashboard-attention-row",
    key: row.id
  }, React.createElement("div", null, React.createElement("strong", null, row.name), React.createElement("span", null, row.class || "-", row.parent ? ` - ${row.parent}` : "")), React.createElement("span", {
    className: "dashboard-row-label"
  }, window.kvT("Pending"))))) : React.createElement("div", {
    className: "dashboard-empty-inline"
  }, React.createElement("i", {
    className: "ti ti-circle-check",
    "aria-hidden": "true"
  }), window.kvT("All active student records are complete.")), React.createElement(Btn, {
    variant: "outline",
    className: "dashboard-card-action",
    onClick: () => setPage("development")
  }, window.kvT("Open Development"), " ", React.createElement("i", {
    className: "ti ti-arrow-right",
    "aria-hidden": "true"
  })))), quickActionsPanel)) : quickActionsPanel ? React.createElement("section", {
    className: "dashboard-quick-only-section"
  }, quickActionsPanel) : React.createElement("section", {
    className: "dashboard-access-panel"
  }, React.createElement("div", {
    className: "dashboard-access-icon"
  }, React.createElement("i", {
    className: "ti ti-lock-access",
    "aria-hidden": "true"
  })), React.createElement("div", null, React.createElement("h2", null, window.kvT("No workspace modules are available for this account.")), React.createElement("p", null, window.kvT("Ask an Administrator to assign the access needed for your work.")))), hasOperationalPanels && React.createElement("section", {
    className: `dashboard-operations-grid${!canViewPayments || !hasContextPanels ? " dashboard-operations-grid--single" : ""}`,
    "aria-label": window.kvT("Operational overview")
  }, canViewPayments && React.createElement("article", {
    className: "panel dashboard-recent-payments-panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("div", null, React.createElement("h2", null, window.kvT("Recent collections")), React.createElement("p", null, window.kvT("Latest payment records received"))), canViewReceipts && React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: () => setPage("receipts")
  }, window.kvT("View Receipts"))), React.createElement("div", {
    className: "compact-table-wrap"
  }, recentPayments.length ? React.createElement("table", {
    className: "compact-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, window.kvT("Receipt")), React.createElement("th", null, window.kvT("Student")), React.createElement("th", null, window.kvT("Amount")), React.createElement("th", null, window.kvT("Date")))), React.createElement("tbody", null, recentPayments.map(payment => React.createElement("tr", {
    key: payment.id
  }, React.createElement("td", null, React.createElement("code", null, payment.receipt || "-")), React.createElement("td", null, payment.student_name || studentById[payment.student_id]?.name || window.kvT("Unknown")), React.createElement("td", {
    className: "money-cell"
  }, "RM ", parseFloat(payment.amount || 0).toFixed(2)), React.createElement("td", null, formatDate(payment.date)))))) : React.createElement(EmptyState, {
    icon: "receipt",
    text: window.kvT("No recent payments.")
  }))), hasContextPanels && React.createElement("div", {
    className: "dashboard-context-stack"
  }, canShowClassOverview && React.createElement("article", {
    className: "panel dashboard-class-panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("div", null, React.createElement("h2", null, window.kvT("Class enrolment")), React.createElement("p", null, window.kvT("Active students by class"))), React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: () => setPage("classes")
  }, window.kvT("Classes"))), classOverview.length ? React.createElement("div", {
    className: "dashboard-class-list"
  }, classOverview.map(item => React.createElement("div", {
    className: "dashboard-class-row",
    key: item.name
  }, React.createElement("div", {
    className: "dashboard-class-row-top"
  }, React.createElement("strong", null, item.name), React.createElement("span", null, window.kvT("{count} student(s)", {
    count: item.students
  }))), React.createElement("div", {
    className: "dashboard-class-progress"
  }, React.createElement("span", {
    style: {
      width: `${item.students / maxClassEnrolment * 100}%`
    }
  }))))) : React.createElement(EmptyState, {
    icon: "chalkboard",
    text: window.kvT("No class enrolment data.")
  })), isAdministrator && React.createElement("article", {
    className: "panel dashboard-backup-panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("div", null, React.createElement("h2", null, window.kvT("Backup status")), React.createElement("p", null, window.kvT("Latest local backup record")))), React.createElement("div", {
    className: "dashboard-backup-content"
  }, React.createElement("div", {
    className: "dashboard-backup-icon"
  }, React.createElement("i", {
    className: "ti ti-database-export",
    "aria-hidden": "true"
  })), React.createElement("div", null, React.createElement("strong", {
    className: backupMeta?.status === "Successful" ? "ok-text" : "warn-text"
  }, backupStatusText), React.createElement("span", null, backupDateText)), React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: openBackupSettings || (() => setPage("settings"))
  }, window.kvT("Open")))))));
};
