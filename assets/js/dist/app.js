const {
  useState,
  useEffect,
  useRef
} = React;
const SESSION_USER = window.KV_BOOTSTRAP.userName;
const SESSION_LOCALE = window.KV_BOOTSTRAP.locale;
const SESSION_TIMEOUT_SECONDS = window.KV_BOOTSTRAP.sessionTimeoutSeconds;
const SESSION_WARNING_SECONDS = 60;
const DEFAULT_FEE_CONFIG = {
  annual: {
    registration: 100,
    books: {
      4: 380,
      5: 460,
      6: 560
    },
    uniform: 65,
    sports_uniform: 55,
    tudung: 20,
    lawatan: 100,
    sukan: 60,
    hadiah: 100,
    gambar: 90
  },
  monthly_iqra: 30,
  monthly_packages: {
    A: {
      label: "Tadika Sahaja",
      amount: 230
    },
    B: {
      label: "Tadika + Half Daycare",
      amount: 320
    },
    C: {
      label: "Tadika + Full Daycare",
      amount: 430
    }
  }
};
const KV_NAVIGATION_KEY = "kindervaultNavigation";
const KV_VALID_PAGES = new Set(["dashboard", "students", "classes", "payments", "receipts", "development", "settings", "search"]);
const KV_PAGE_PERMISSIONS = {
  dashboard: "dashboard.view",
  students: "students.view",
  classes: "classes.view",
  payments: "payments.view",
  receipts: "receipts.view",
  development: "development.view",
  settings: "settings.access",
  search: "search.use"
};
const newNavigationId = () => `kv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeRoute = (candidate = {}) => {
  const isLegacyBackupRoute = candidate.page === "backup";
  const state = candidate.state && typeof candidate.state === "object" ? {
    ...candidate.state
  } : {};
  return {
    page: isLegacyBackupRoute ? "settings" : KV_VALID_PAGES.has(candidate.page) ? candidate.page : "dashboard",
    state: isLegacyBackupRoute ? {
      ...state,
      tab: "backup"
    } : state,
    entryId: candidate.entryId || newNavigationId()
  };
};
const routeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedPage = params.get("page");
  const isLegacyBackupRoute = requestedPage === "backup";
  const page = isLegacyBackupRoute ? "settings" : KV_VALID_PAGES.has(requestedPage) ? requestedPage : params.get("receipt") ? "receipts" : "dashboard";
  const state = {};
  if (page === "search") {
    state.query = params.get("q") || "";
  }
  if (page === "receipts") {
    state.receiptId = params.get("receipt") || null;
    state.search = params.get("receipt_search") || "";
    state.filterType = params.get("receipt_type") || "";
  }
  if (page === "students") {
    state.view = params.get("view") || "list";
    state.studentId = params.get("student") || null;
    state.search = params.get("student_search") || "";
    state.classF = params.get("student_class") || "";
  }
  if (page === "payments") {
    state.view = params.get("view") || "list";
    state.paymentId = params.get("payment") || null;
    state.statusF = params.get("payment_status") || "";
    state.typeF = params.get("payment_type") || "";
    state.activeTab = params.get("payment_tab") || "records";
  }
  if (page === "development") {
    state.screen = params.get("screen") || "history";
    state.module = params.get("module") || "reading";
    state.viewMode = params.get("mode") || "fill";
    state.recordId = params.get("record") || null;
    state.readingRecordId = params.get("reading") || null;
    state.studentId = params.get("development_student") || null;
  }
  if (page === "settings") {
    state.tab = isLegacyBackupRoute ? "backup" : params.get("settings_tab") || "";
  }
  return normalizeRoute({
    page,
    state
  });
};
const routeUrl = route => {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  ["page", "receipt", "receipt_search", "receipt_type", "view", "student", "student_search", "student_class", "payment", "payment_status", "payment_type", "payment_tab", "screen", "module", "mode", "record", "reading", "development_student", "q", "settings_tab"].forEach(key => params.delete(key));
  if (route.page !== "dashboard") params.set("page", route.page);
  const state = route.state || {};
  if (route.page === "search" && state.query) {
    params.set("q", state.query);
  }
  if (route.page === "receipts") {
    if (state.receiptId) params.set("receipt", state.receiptId);
    if (state.search) params.set("receipt_search", state.search);
    if (state.filterType) params.set("receipt_type", state.filterType);
  }
  if (route.page === "students") {
    if (state.view && state.view !== "list") params.set("view", state.view);
    if (state.studentId) params.set("student", state.studentId);
    if (state.search) params.set("student_search", state.search);
    if (state.classF) params.set("student_class", state.classF);
  }
  if (route.page === "payments") {
    if (state.view && state.view !== "list") params.set("view", state.view);
    if (state.paymentId) params.set("payment", state.paymentId);
    if (state.statusF) params.set("payment_status", state.statusF);
    if (state.typeF) params.set("payment_type", state.typeF);
    if (state.activeTab && state.activeTab !== "records") params.set("payment_tab", state.activeTab);
  }
  if (route.page === "development") {
    if (state.screen && state.screen !== "history") params.set("screen", state.screen);
    if (state.module && state.module !== "reading") params.set("module", state.module);
    if (state.viewMode && state.viewMode !== "fill") params.set("mode", state.viewMode);
    if (state.recordId) params.set("record", state.recordId);
    if (state.readingRecordId) params.set("reading", state.readingRecordId);
    if (state.studentId) params.set("development_student", state.studentId);
  }
  if (route.page === "settings" && state.tab) {
    params.set("settings_tab", state.tab);
  }
  return `${url.pathname}${url.search}${url.hash}`;
};
const mainScrollTop = () => document.querySelector(".kv-main-scroll")?.scrollTop || 0;
const restoreMainScroll = (top = 0) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const scroller = document.querySelector(".kv-main-scroll");
    if (scroller) scroller.scrollTop = top;
  }));
};
const AccessDeniedPage = () => React.createElement("div", {
  className: "kv-page kv-page--access-denied"
}, React.createElement(Card, null, React.createElement("div", {
  style: {
    padding: 28,
    textAlign: "center",
    maxWidth: 500,
    margin: "0 auto"
  }
}, React.createElement("div", {
  style: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    margin: "0 auto 14px",
    borderRadius: 16,
    background: C.redBg,
    color: C.red,
    fontSize: 26
  }
}, React.createElement("i", {
  className: "ti ti-lock",
  "aria-hidden": "true"
})), React.createElement("h2", {
  className: "kv-page-title",
  style: {
    margin: "0 0 8px"
  }
}, window.kvT("Access Denied")), React.createElement("div", {
  style: {
    fontSize: 13,
    color: "var(--color-text-secondary)",
    lineHeight: 1.55
  }
}, window.kvT("You do not have permission to access this section.")))));
const historyEntry = (route, hasInternalPrevious, scrollTop = 0) => ({
  [KV_NAVIGATION_KEY]: true,
  route,
  hasInternalPrevious: Boolean(hasInternalPrevious),
  scrollTop
});
const SearchPage = ({
  query,
  students,
  payments,
  devRecords,
  readingRecords = [],
  classesList,
  feeConfig = DEFAULT_FEE_CONFIG,
  goReceipt,
  openStudentProfile,
  openDevelopmentRecord,
  openClass
}) => {
  const q = (query || "").trim().toLowerCase();
  const parseSearchIntent = text => {
    const value = (text || "").trim().toLowerCase();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const intent = {
      statusFilter: null,
      monthFilter: null,
      methodFilter: null,
      receiptOnly: false,
      studentOnly: false,
      classOnly: false,
      summary: ""
    };
    if (!value) return intent;
    const has = term => value.includes(term);
    if (has('overdue') || has('due') || has('unpaid') || has('pending fee') || has('pending') || has('tertunggak') || has('belum dibayar') || has('belum bayar')) {
      intent.statusFilter = 'Overdue';
    } else if (has('paid') || has('received') || has('sudah dibayar') || has('dibayar')) {
      intent.statusFilter = 'Paid';
    }
    if (has('this month') || has('current month') || has('bulan ini')) {
      intent.monthFilter = currentMonth;
    }
    if (has('last month') || has('bulan lepas') || has('bulan lalu')) {
      intent.monthFilter = lastMonth;
    }
    if (has('cash')) intent.methodFilter = 'Cash';
    if (has('bank') || has('pindahan')) intent.methodFilter = 'Bank Transfer';
    if (has('qr') || has('duitnow')) intent.methodFilter = 'QR DuitNow';
    if (has('cheque')) intent.methodFilter = 'Cheque';
    if (has('receipt') || has('resit') || value.match(/rcp-?\d+/)) intent.receiptOnly = true;
    if (has('student') || has('murid')) intent.studentOnly = true;
    if (has('class')) intent.classOnly = true;
    const parts = [];
    if (intent.statusFilter) parts.push(window.kvT(intent.statusFilter === 'Overdue' ? 'overdue payments' : 'paid payments'));
    if (intent.monthFilter) parts.push(window.kvT(intent.monthFilter === currentMonth ? 'this month' : 'last month'));
    if (intent.methodFilter) parts.push(window.kvT('payment method {method}', {
      method: intent.methodFilter
    }));
    if (intent.receiptOnly) parts.push(window.kvT('receipt numbers'));
    if (intent.studentOnly) parts.push(window.kvT('Students'));
    if (intent.classOnly) parts.push(window.kvT('Classes'));
    intent.summary = parts.length ? window.kvT('Interpreted as: {filters}.', {
      filters: parts.join(', ')
    }) : '';
    return intent;
  };
  const intent = parseSearchIntent(query);
  const highlightText = value => {
    if (value === undefined || value === null) return '–';
    const text = String(value);
    if (!q) return text;
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(q);
    if (index === -1) return text;
    const before = text.slice(0, index);
    const match = text.slice(index, index + q.length);
    const after = text.slice(index + q.length);
    return React.createElement(React.Fragment, null, before, React.createElement("span", {
      style: {
        background: 'rgba(250,215,0,0.45)',
        borderRadius: 3,
        padding: '0 2px'
      }
    }, match), highlightText(after));
  };
  if (!q) {
    return React.createElement("div", {
      className: "kv-page kv-page--search"
    }, React.createElement(Card, null, React.createElement("div", {
      style: {
        padding: 24,
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        color: "var(--color-text-primary)",
        marginBottom: 6
      }
    }, window.kvT("Search Everything")), React.createElement("div", {
      style: {
        color: "var(--color-text-secondary)",
        maxWidth: 560,
        margin: "0 auto"
      }
    }, window.kvT("Type any student name, IC, parent, phone, receipt number, class, payment method, or note in the search box above to find matching records across the system.")))));
  }
  const searchFields = (item, keys) => keys.some(key => {
    const value = item[key];
    return value !== undefined && value !== null && String(value).toLowerCase().includes(q);
  });
  const overdueStudentIds = new Set(payments.filter(p => String(p.status || "").toLowerCase().includes('overdue')).map(p => p.student_id));
  const monthRegex = /(\d{4}-\d{2})|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;
  const studentMatches = students.filter(s => {
    const basic = searchFields(s, ["name", "ic", "parent", "phone", "address", "class", "status", "enrol", "fee"]);
    const overdueMatch = intent.statusFilter === 'Overdue' && overdueStudentIds.has(s.id);
    return basic || overdueMatch;
  });
  const paymentMatches = payments.filter(p => {
    const student = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id)) || {};
    const basic = searchFields(p, ["receipt", "type", "amount", "date", "method", "status", "ref", "notes", "month", "student_id"]) || searchFields(student, ["name", "ic", "parent", "phone", "class"]);
    const statusMatch = intent.statusFilter ? String(p.status || "").toLowerCase().includes(intent.statusFilter.toLowerCase()) : true;
    const monthMatch = intent.monthFilter ? String(p.month || "").includes(intent.monthFilter) || String(p.date || "").startsWith(intent.monthFilter) : true;
    const methodMatch = intent.methodFilter ? String(p.method || "").toLowerCase().includes(intent.methodFilter.toLowerCase()) : true;
    const receiptMatch = intent.receiptOnly ? true : true;
    const intentMatch = statusMatch && monthMatch && methodMatch && receiptMatch;
    return basic || intentMatch && (intent.statusFilter || intent.monthFilter || intent.methodFilter || intent.receiptOnly);
  });
  const searchableDevelopmentRecords = [...devRecords.map(record => ({
    ...record,
    searchModule: "borang",
    date: record.assessment_date || record.date || "",
    notes: record.is_legacy ? record.legacy_summary || record.comment || "" : record.notes || record.comment || ""
  })), ...readingRecords.map(record => ({
    ...record,
    searchModule: "reading",
    type: "Reading Progress",
    date: record.record_date || "",
    status: "Saved"
  }))];
  const devMatches = searchableDevelopmentRecords.filter(d => {
    const student = students.find(x => x.id === d.student_id || x.id === parseInt(d.student_id)) || {};
    return searchFields(d, ["type", "date", "notes", "comment", "status"]) || searchFields(student, ["name", "parent", "class", "phone"]);
  });
  const classMatches = classesList.filter(c => searchFields(c, ["name"]));
  const formatMonth = m => {
    if (!m) return "";
    const date = new Date(m + "-01");
    return window.kvDate(date, {
      month: "short",
      year: "numeric"
    }, m);
  };
  const formatDate = value => value ? window.kvDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }, value) : "–";
  return React.createElement("div", {
    className: "kv-page kv-page--search"
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 18
    }
  }, React.createElement("div", null, React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 500,
      color: "var(--color-text-primary)"
    }
  }, window.kvT("Search Results")), React.createElement("div", {
    style: {
      color: "var(--color-text-secondary)",
      fontSize: 13,
      marginTop: 4
    }
  }, window.kvT('{students} student(s), {payments} payment(s), {development} development record(s), {classes} class(es) found for "{query}".', {
    students: studentMatches.length,
    payments: paymentMatches.length,
    development: devMatches.length,
    classes: classMatches.length,
    query
  })), intent.summary ? React.createElement("div", {
    style: {
      color: "var(--color-text-secondary)",
      fontSize: 12,
      marginTop: 6
    }
  }, intent.summary) : null)), studentMatches.length || paymentMatches.length || devMatches.length || classMatches.length ? React.createElement(React.Fragment, null, studentMatches.length > 0 && React.createElement(Card, {
    style: {
      marginBottom: 20
    }
  }, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-users",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT("Student Matches")), React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--color-background-secondary)"
    }
  }, ['Name', 'IC', 'Class', 'Parent', 'Phone', 'Fee', 'Status', 'Enrol', 'Action'].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: '8px 12px',
      textAlign: 'left',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: .5,
      color: 'var(--color-text-tertiary)',
      fontWeight: 500,
      borderBottom: '0.5px solid var(--color-border-tertiary)'
    }
  }, window.kvT(h))))), React.createElement("tbody", null, studentMatches.map(s => React.createElement("tr", {
    key: s.id,
    style: {
      borderBottom: '0.5px solid var(--color-border-tertiary)'
    }
  }, React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 600,
      color: 'var(--color-text-primary)'
    }
  }, highlightText(s.name)), React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: 'var(--color-text-secondary)'
    }
  }, highlightText(s.ic || '–')), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, highlightText(s.class || '–')), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, highlightText(s.parent || '–')), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, highlightText(s.phone || '–')), React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: C.green,
      fontWeight: 700
    }
  }, highlightText(s.fee ? `RM ${window.kvStudentMonthlyFee(s, feeConfig).toFixed(2)}` : '–')), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, highlightText(window.kvT(s.status || '–'))), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, highlightText(formatDate(s.enrol))), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: () => openStudentProfile(s)
  }, window.kvT("View Details"))))))))), paymentMatches.length > 0 && React.createElement(Card, {
    style: {
      marginBottom: 20
    }
  }, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-credit-card",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT("Payment Matches")), React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--color-background-secondary)"
    }
  }, ['Receipt', 'Student', 'Type', 'Amount', 'Month', 'Date', 'Method', 'Status', 'Notes', 'Action'].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: '8px 12px',
      textAlign: 'left',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: .5,
      color: 'var(--color-text-tertiary)',
      fontWeight: 500,
      borderBottom: '0.5px solid var(--color-border-tertiary)'
    }
  }, window.kvT(h))))), React.createElement("tbody", null, paymentMatches.map(p => {
    const student = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id)) || {};
    return React.createElement("tr", {
      key: p.id,
      style: {
        borderBottom: '0.5px solid var(--color-border-tertiary)'
      }
    }, React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'var(--color-text-primary)'
      }
    }, highlightText(p.receipt || '–')), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(p.student_name || student.name || '–')), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(window.kvT(p.type || '–'))), React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontWeight: 700,
        color: C.green
      }
    }, highlightText(`RM ${parseFloat(p.amount || 0).toFixed(2)}`)), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText((p.month || '').split(',').map(formatMonth).filter(Boolean).join(', ') || '–')), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(formatDate(p.date))), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(window.kvT(p.method || '–'))), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(window.kvT(p.status || '–'))), React.createElement("td", {
      style: {
        padding: '10px 12px',
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      title: p.notes || ''
    }, highlightText(p.notes || '–')), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, p.receipt ? React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => goReceipt(p)
    }, window.kvT("View Receipt")) : '–'));
  }))))), devMatches.length > 0 && React.createElement(Card, {
    style: {
      marginBottom: 20
    }
  }, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-chart-line",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT("Development Matches")), React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--color-background-secondary)"
    }
  }, ['Student', 'Type', 'Date', 'Notes', 'Action'].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: '8px 12px',
      textAlign: 'left',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: .5,
      color: 'var(--color-text-tertiary)',
      fontWeight: 500,
      borderBottom: '0.5px solid var(--color-border-tertiary)'
    }
  }, window.kvT(h))))), React.createElement("tbody", null, devMatches.map(d => {
    const student = students.find(x => x.id === d.student_id || x.id === parseInt(d.student_id)) || {};
    return React.createElement("tr", {
      key: `${d.searchModule}-${d.id}`,
      style: {
        borderBottom: '0.5px solid var(--color-border-tertiary)'
      }
    }, React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(student.name || '–')), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(window.kvT(d.type || '–'))), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, highlightText(formatDate(d.date))), React.createElement("td", {
      style: {
        padding: '10px 12px',
        maxWidth: 260,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      title: d.notes || ''
    }, highlightText(d.notes || '–')), React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, openDevelopmentRecord ? React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => openDevelopmentRecord(d)
    }, window.kvT("View Record")) : '–'));
  }))))), classMatches.length > 0 && React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-chalkboard",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT("Class Matches")), React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--color-background-secondary)"
    }
  }, ['Class Name', 'Action'].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: '8px 12px',
      textAlign: 'left',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: .5,
      color: 'var(--color-text-tertiary)',
      fontWeight: 500,
      borderBottom: '0.5px solid var(--color-border-tertiary)'
    }
  }, window.kvT(h))))), React.createElement("tbody", null, classMatches.map(c => React.createElement("tr", {
    key: c.id,
    style: {
      borderBottom: '0.5px solid var(--color-border-tertiary)'
    }
  }, React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 600,
      color: 'var(--color-text-primary)'
    }
  }, highlightText(c.name)), React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: () => openClass(c)
  }, window.kvT("View Class")))))))))) : React.createElement(EmptyState, {
    icon: "search",
    text: window.kvT('No matches found for "{query}". Try another name, receipt, phone number or class.', {
      query
    })
  }));
};
function App() {
  const initialRouteRef = useRef(null);
  if (!initialRouteRef.current) initialRouteRef.current = routeFromUrl();
  const [route, setRoute] = useState(initialRouteRef.current);
  const routeRef = useRef(initialRouteRef.current);
  const page = route.page;
  const routeState = route.state || {};
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [devRecs, setDevRecs] = useState([]);
  const [readingRecs, setReadingRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [lang, setLang] = useState(() => window.kvNormalizeLocale(SESSION_LOCALE));
  const [feeConfig, setFeeConfig] = useState(DEFAULT_FEE_CONFIG);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    full_name: SESSION_USER,
    role: ""
  });
  const [permissions, setPermissions] = useState([]);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(SESSION_WARNING_SECONDS);
  const [sessionRenewing, setSessionRenewing] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const dataLoadedRef = useRef(new Set());
  const dataPromisesRef = useRef(new Map());
  const initialDataLoadCompleteRef = useRef(false);
  const sessionTimeoutRef = useRef(SESSION_TIMEOUT_SECONDS);
  const sessionDeadlineRef = useRef(Date.now() + SESSION_TIMEOUT_SECONDS * 1000);
  const sessionWarningRef = useRef(false);
  const sessionEndingRef = useRef(false);
  const sessionLastConfirmedRef = useRef(Date.now());
  const sessionTouchPendingRef = useRef(false);
  const sessionTouchTimerRef = useRef(null);
  const can = permission => canUsePermission(permissions, permission, isAdministrator);
  const canAccessPage = candidatePage => !KV_PAGE_PERMISSIONS[candidatePage] || can(KV_PAGE_PERMISSIONS[candidatePage]);
  const dataDefinitions = {
    students: {
      url: 'api/students.php',
      permission: 'students.view',
      set: setStudents
    },
    payments: {
      url: 'api/payments.php',
      permission: 'payments.view',
      set: setPayments
    },
    development: {
      url: 'api/development.php',
      permission: 'development.view',
      set: setDevRecs
    },
    reading: {
      url: 'api/reading_progress.php',
      permission: 'development.view',
      set: setReadingRecs
    },
    classes: {
      url: 'api/classes.php',
      permission: 'classes.view',
      set: setClassesList
    }
  };
  const requiredDataForRoute = (candidatePage, candidateState = {}, permissionCheck = can) => {
    const required = [];
    const add = (key, permission) => {
      if (permissionCheck(permission)) required.push(key);
    };
    if (candidatePage === 'dashboard') {
      add('students', 'students.view');
      add('payments', 'payments.view');
      add('development', 'development.view');
      add('classes', 'classes.view');
    } else if (candidatePage === 'students') {
      add('students', 'students.view');
      if (candidateState.view === 'profile') {
        add('payments', 'payments.view');
      } else {
        add('classes', 'classes.view');
      }
    } else if (candidatePage === 'payments') {
      add('students', 'students.view');
      add('payments', 'payments.view');
    } else if (candidatePage === 'receipts') {
      add('students', 'students.view');
      add('payments', 'payments.view');
    } else if (candidatePage === 'development') {
      add('students', 'students.view');
      add('development', 'development.view');
      add('reading', 'development.view');
      add('classes', 'classes.view');
    } else if (candidatePage === 'classes') {
      add('students', 'students.view');
      add('classes', 'classes.view');
    } else if (candidatePage === 'search') {
      add('students', 'students.view');
      add('payments', 'payments.view');
      add('development', 'development.view');
      add('reading', 'development.view');
      add('classes', 'classes.view');
    }
    return [...new Set(required)];
  };
  const loadDataForRoute = async (candidatePage, candidateState, permissionCheck = can) => {
    const keys = requiredDataForRoute(candidatePage, candidateState, permissionCheck);
    await Promise.all(keys.map(key => {
      if (dataLoadedRef.current.has(key)) return Promise.resolve();
      if (dataPromisesRef.current.has(key)) return dataPromisesRef.current.get(key);
      const definition = dataDefinitions[key];
      const request = fetch(definition.url).then(parseApiResponse).then(result => {
        if (result?.error) throw new Error(result.error);
        definition.set(Array.isArray(result) ? result : []);
        dataLoadedRef.current.add(key);
        dataPromisesRef.current.delete(key);
      }).catch(error => {
        dataPromisesRef.current.delete(key);
        throw error;
      });
      dataPromisesRef.current.set(key, request);
      return request;
    }));
  };
  const selectedReceipt = page === "receipts" && routeState.receiptId ? routeState.receiptSnapshot || payments.find(payment => String(payment.id) === String(routeState.receiptId) || payment.receipt === routeState.receiptId) || null : null;
  const resetSessionClock = (timeoutSeconds = sessionTimeoutRef.current) => {
    const safeTimeout = Math.max(300, Number(timeoutSeconds) || SESSION_TIMEOUT_SECONDS);
    sessionTimeoutRef.current = safeTimeout;
    sessionDeadlineRef.current = Date.now() + safeTimeout * 1000;
    sessionLastConfirmedRef.current = Date.now();
    if (sessionTouchTimerRef.current) {
      window.clearTimeout(sessionTouchTimerRef.current);
      sessionTouchTimerRef.current = null;
    }
    sessionWarningRef.current = false;
    setSessionWarningOpen(false);
    setSessionSecondsRemaining(Math.min(SESSION_WARNING_SECONDS, safeTimeout));
  };
  const redirectForEndedSession = (reason = 'ended') => {
    if (sessionEndingRef.current) return;
    sessionEndingRef.current = true;
    const rootElement = document.getElementById('root');
    if (rootElement) rootElement.replaceChildren();
    window.location.replace(`login.php?session=${reason === 'expired' ? 'expired' : 'ended'}`);
  };
  const expireInactiveSession = () => {
    if (sessionEndingRef.current) return;
    sessionEndingRef.current = true;
    const rootElement = document.getElementById('root');
    if (rootElement) rootElement.replaceChildren();
    window.location.replace('logout.php?reason=timeout');
  };
  const staySignedIn = async () => {
    if (sessionRenewing || sessionEndingRef.current) return;
    setSessionRenewing(true);
    try {
      const result = await api.post('api/session_renew.php', {});
      if (result.error) throw new Error(result.error);
      resetSessionClock(result.session_timeout_seconds);
    } catch (error) {
      if (!sessionEndingRef.current) {
        setFlash({
          msg: error.message || window.kvT('Unable to renew your session. Check your connection and try again.'),
          type: 'danger'
        });
      }
    } finally {
      if (!sessionEndingRef.current) setSessionRenewing(false);
    }
  };
  useEffect(() => {
    const confirmSession = () => resetSessionClock();
    const endSession = event => {
      const message = String(event?.detail?.error || '');
      const expired = event?.detail?.code === 'SESSION_EXPIRED' || /expired|tamat tempoh/i.test(message);
      redirectForEndedSession(expired ? 'expired' : 'ended');
    };
    const touchSession = () => {
      if (sessionTouchPendingRef.current || sessionEndingRef.current || sessionWarningRef.current) return;
      if (sessionTouchTimerRef.current) {
        window.clearTimeout(sessionTouchTimerRef.current);
        sessionTouchTimerRef.current = null;
      }
      sessionTouchPendingRef.current = true;
      fetch('api/session.php', {
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }).then(parseApiResponse).catch(() => {}).finally(() => {
        sessionTouchPendingRef.current = false;
      });
    };
    const recordActivity = () => {
      if (sessionEndingRef.current || sessionWarningRef.current) return;
      const now = Date.now();
      sessionDeadlineRef.current = now + sessionTimeoutRef.current * 1000;
      const untilNextTouch = 30000 - (now - sessionLastConfirmedRef.current);
      if (untilNextTouch <= 0) {
        touchSession();
      } else if (!sessionTouchTimerRef.current) {
        sessionTouchTimerRef.current = window.setTimeout(touchSession, untilNextTouch);
      }
    };
    const checkSession = () => {
      if (sessionEndingRef.current) return;
      const remaining = Math.max(0, Math.ceil((sessionDeadlineRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        expireInactiveSession();
        return;
      }
      if (remaining <= SESSION_WARNING_SECONDS) {
        sessionWarningRef.current = true;
        setSessionWarningOpen(true);
        setSessionSecondsRemaining(remaining);
      }
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(eventName => window.addEventListener(eventName, recordActivity, {
      passive: true
    }));
    window.addEventListener('kv:session-confirmed', confirmSession);
    window.addEventListener('kv:session-unauthorized', endSession);
    document.addEventListener('visibilitychange', checkWhenVisible);
    const interval = window.setInterval(checkSession, 1000);
    checkSession();
    return () => {
      activityEvents.forEach(eventName => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener('kv:session-confirmed', confirmSession);
      window.removeEventListener('kv:session-unauthorized', endSession);
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.clearInterval(interval);
      if (sessionTouchTimerRef.current) window.clearTimeout(sessionTouchTimerRef.current);
    };
  }, []);
  const applyLanguage = requestedLocale => {
    const nextLocale = window.kvNormalizeLocale(requestedLocale);
    window.kvLang = nextLocale;
    document.documentElement.setAttribute('lang', nextLocale);
    localStorage.setItem('lang', nextLocale);
    setLang(nextLocale);
    return nextLocale;
  };
  const changeLanguage = async requestedLocale => {
    const previousLocale = window.kvNormalizeLocale(currentUser.language || SESSION_LOCALE);
    const nextLocale = applyLanguage(requestedLocale);
    if (nextLocale === previousLocale) return;
    try {
      const result = await api.put('api/language.php', {
        locale: nextLocale
      });
      if (result.error) throw new Error(result.error);
      const confirmedLocale = window.kvNormalizeLocale(result.locale || nextLocale);
      applyLanguage(confirmedLocale);
      setCurrentUser(previous => ({
        ...previous,
        ...(result.user || {}),
        language: confirmedLocale
      }));
    } catch (error) {
      applyLanguage(previousLocale);
      setFlash({
        msg: error.message || window.kvT('Unable to save the language preference.'),
        type: 'danger'
      });
    }
  };
  useEffect(() => {
    const existingEntry = window.history.state;
    if (existingEntry && existingEntry[KV_NAVIGATION_KEY] && existingEntry.route) {
      const restoredRoute = normalizeRoute(existingEntry.route);
      routeRef.current = restoredRoute;
      setRoute(restoredRoute);
      restoreMainScroll(existingEntry.scrollTop || 0);
    } else {
      window.history.replaceState(historyEntry(routeRef.current, false, mainScrollTop()), "", routeUrl(routeRef.current));
    }
    const savedScrollRestoration = "scrollRestoration" in window.history ? window.history.scrollRestoration : null;
    if (savedScrollRestoration !== null) window.history.scrollRestoration = "manual";
    const onPopState = event => {
      const entry = event.state;
      if (!entry || !entry[KV_NAVIGATION_KEY] || !entry.route) return;
      const restoredRoute = normalizeRoute(entry.route);
      routeRef.current = restoredRoute;
      setRoute(restoredRoute);
      restoreMainScroll(entry.scrollTop || 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (savedScrollRestoration !== null) window.history.scrollRestoration = savedScrollRestoration;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const sessionRes = await fetch('api/session.php', {
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store'
        }).then(parseApiResponse);
        if (sessionRes.error) throw new Error(sessionRes.error);
        const nextPermissions = Array.isArray(sessionRes.permissions) ? sessionRes.permissions : [];
        const nextIsAdministrator = Boolean(sessionRes.is_administrator);
        const canLoad = permission => nextIsAdministrator || nextPermissions.includes(permission);
        if (!active) return;
        setCurrentUser(sessionRes.user || {
          full_name: SESSION_USER,
          role: ""
        });
        resetSessionClock(sessionRes.session_timeout_seconds);
        applyLanguage(sessionRes.locale || sessionRes.user?.language || SESSION_LOCALE);
        setPermissions(nextPermissions);
        setIsAdministrator(nextIsAdministrator);
        setFeeConfig(sessionRes.fee_config || DEFAULT_FEE_CONFIG);
        setSessionReady(true);
        await loadDataForRoute(initialRouteRef.current.page, initialRouteRef.current.state, canLoad);
        if (!active) return;
      } catch (error) {
        if (active) {
          setFlash({
            msg: window.kvT("Failed to load data from server. Check your database connection."),
            type: "danger"
          });
        }
      } finally {
        if (active) {
          initialDataLoadCompleteRef.current = true;
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!sessionReady || !initialDataLoadCompleteRef.current) return undefined;
    let active = true;
    const ensureRouteData = async () => {
      const required = requiredDataForRoute(page, routeState);
      const missing = required.some(key => !dataLoadedRef.current.has(key));
      if (!missing) return;
      const keepShellVisible = page === 'search';
      if (!keepShellVisible) setLoading(true);
      try {
        await loadDataForRoute(page, routeState);
      } catch (error) {
        if (active) setFlash({
          msg: window.kvT("Failed to load data from server. Check your database connection."),
          type: "danger"
        });
      } finally {
        if (active && !keepShellVisible) setLoading(false);
      }
    };
    ensureRouteData();
    return () => {
      active = false;
    };
  }, [page, route.entryId, sessionReady]);
  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 4000);
      return () => clearTimeout(t);
    }
  }, [flash]);
  const navigate = (candidate, options = {}) => {
    const nextRoute = normalizeRoute(candidate);
    const currentEntry = window.history.state && window.history.state[KV_NAVIGATION_KEY] ? window.history.state : null;
    const hasInternalPrevious = Boolean(currentEntry?.hasInternalPrevious);
    if (options.replace) {
      window.history.replaceState(historyEntry(nextRoute, hasInternalPrevious, options.preserveScroll ? mainScrollTop() : 0), "", routeUrl(nextRoute));
    } else {
      window.history.replaceState(historyEntry(routeRef.current, hasInternalPrevious, mainScrollTop()), "", routeUrl(routeRef.current));
      window.history.pushState(historyEntry(nextRoute, true, 0), "", routeUrl(nextRoute));
    }
    routeRef.current = nextRoute;
    setRoute(nextRoute);
    if (!options.preserveScroll) restoreMainScroll(0);
  };
  const replaceRouteState = patch => {
    const currentRoute = routeRef.current;
    const changes = typeof patch === "function" ? patch(currentRoute.state || {}) : patch;
    const nextRoute = normalizeRoute({
      ...currentRoute,
      state: {
        ...(currentRoute.state || {}),
        ...(changes || {})
      },
      entryId: currentRoute.entryId
    });
    const currentEntry = window.history.state && window.history.state[KV_NAVIGATION_KEY] ? window.history.state : null;
    routeRef.current = nextRoute;
    setRoute(nextRoute);
    window.history.replaceState(historyEntry(nextRoute, Boolean(currentEntry?.hasInternalPrevious), mainScrollTop()), "", routeUrl(nextRoute));
  };
  const goBack = fallback => {
    const currentEntry = window.history.state && window.history.state[KV_NAVIGATION_KEY] ? window.history.state : null;
    if (currentEntry?.hasInternalPrevious) {
      window.history.back();
      return;
    }
    navigate(fallback || {
      page: routeRef.current.page,
      state: {}
    }, {
      replace: true
    });
  };
  const navigateToPage = nextPage => {
    if (!canAccessPage(nextPage)) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to access this section."),
        type: "danger"
      });
      return;
    }
    const currentRoute = routeRef.current;
    if (currentRoute.page === nextPage && Object.keys(currentRoute.state || {}).length === 0) return;
    setFlash(null);
    navigate({
      page: nextPage,
      state: {}
    });
  };
  const goReceipt = (payment, options = {}) => {
    if (!canAccessPage("receipts")) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to access this section."),
        type: "danger"
      });
      return;
    }
    const receiptId = payment?.id || payment?.receipt || null;
    navigate({
      page: "receipts",
      state: {
        receiptId,
        receiptSnapshot: payment || null
      }
    }, options);
  };
  const openStudentProfile = student => {
    if (!canAccessPage("students")) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to access this section."),
        type: "danger"
      });
      return;
    }
    if (!student?.id) return;
    navigate({
      page: "students",
      state: {
        view: "profile",
        studentId: student.id
      }
    });
  };
  const openSearchClass = classInfo => {
    if (!canAccessPage("classes")) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to access this section."),
        type: "danger"
      });
      return;
    }
    if (!classInfo?.id) return;
    navigate({
      page: "classes",
      state: {
        classId: classInfo.id
      }
    });
  };
  const openDevelopmentRecord = record => {
    if (!canAccessPage("development")) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to access this section."),
        type: "danger"
      });
      return;
    }
    const studentId = record?.student_id || null;
    if (record?.searchModule === "reading") {
      navigate({
        page: "development",
        state: {
          module: "reading",
          screen: "workspace",
          viewMode: "fill",
          readingRecordId: record.id,
          studentId
        }
      });
      return;
    }
    if (record?.is_legacy || record?.record_type === "legacy") {
      navigate({
        page: "development",
        state: {
          module: "borang",
          screen: "history",
          viewMode: "fill",
          studentId
        }
      });
      return;
    }
    navigate({
      page: "development",
      state: {
        module: "borang",
        screen: "workspace",
        viewMode: "print",
        recordId: record?.id || null,
        studentId
      }
    });
  };
  const openAddStudent = () => {
    if (!can('students.create')) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to add students."),
        type: "danger"
      });
      return;
    }
    setFlash(null);
    navigate({
      page: "students",
      state: {
        view: "add"
      }
    });
  };
  const openBackupSettings = () => {
    if (!canAccessPage("settings")) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to access this section."),
        type: "danger"
      });
      return;
    }
    setFlash(null);
    navigate({
      page: "settings",
      state: {
        tab: "backup"
      }
    });
  };
  const handleSearch = query => {
    if (!canAccessPage("search")) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to use search."),
        type: "danger"
      });
      return;
    }
    const value = query || "";
    if (value.trim()) {
      if (routeRef.current.page === "search") {
        replaceRouteState({
          query: value
        });
      } else {
        navigate({
          page: "search",
          state: {
            query: value
          }
        });
      }
      return;
    }
    if (routeRef.current.page === "search") {
      goBack({
        page: "dashboard",
        state: {}
      });
    }
  };
  const titles = {
    dashboard: "Dashboard",
    students: "Students",
    classes: "Manage Classes",
    payments: "Payments",
    receipts: "Receipts",
    development: "Student Development",
    search: "Search",
    settings: "Settings"
  };
  useEffect(() => {
    const pageTitle = window.kvT(titles[page] || "KinderVault");
    document.title = page === "dashboard" ? "KinderVault" : `${pageTitle} | KinderVault`;
  }, [page, lang]);
  if (loading) {
    return React.createElement("div", {
      className: "kv-app-loading",
      role: "status",
      "aria-live": "polite",
      "aria-label": window.kvT("Loading KinderVault")
    }, React.createElement("div", {
      className: "kv-loading-frame",
      "aria-hidden": "true"
    }, React.createElement("aside", {
      className: "kv-loading-sidebar"
    }, React.createElement("div", {
      className: "kv-loading-brand"
    }, React.createElement("div", {
      className: "kv-loading-brand-name"
    }, "Kinder", React.createElement("span", null, "Vault")), React.createElement("div", {
      className: "kv-loading-bone kv-loading-brand-subtitle"
    })), React.createElement("div", {
      className: "kv-loading-nav-list"
    }, [1, 2, 3, 4, 5, 6].map(item => React.createElement("div", {
      className: `kv-loading-nav-item${item === 1 ? " is-active" : ""}`,
      key: item
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-nav-icon"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-nav-label"
    })))), React.createElement("div", {
      className: "kv-loading-sidebar-footer"
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-avatar"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-footer-label"
    }))), React.createElement("main", {
      className: "kv-loading-main"
    }, React.createElement("header", {
      className: "kv-loading-topbar"
    }, React.createElement("div", {
      className: "kv-loading-mobile-brand"
    }, "Kinder", React.createElement("span", null, "Vault")), React.createElement("div", {
      className: "kv-loading-bone kv-loading-search"
    }), React.createElement("div", {
      className: "kv-loading-topbar-actions"
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-topbar-circle"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-topbar-circle"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-topbar-avatar"
    }))), React.createElement("div", {
      className: "kv-loading-content"
    }, React.createElement("div", {
      className: "kv-loading-page-heading"
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-heading-line"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-subheading-line"
    })), React.createElement("div", {
      className: "kv-loading-stat-grid"
    }, [1, 2, 3, 4].map(item => React.createElement("div", {
      className: "kv-loading-stat-card",
      key: item
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-stat-icon"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-stat-label"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-stat-value"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-stat-meta"
    })))), React.createElement("div", {
      className: "kv-loading-panel-grid"
    }, React.createElement("section", {
      className: "kv-loading-panel kv-loading-panel--table"
    }, React.createElement("div", {
      className: "kv-loading-panel-head"
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-panel-title"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-panel-action"
    })), React.createElement("div", {
      className: "kv-loading-table-head"
    }, React.createElement("span", null), React.createElement("span", null), React.createElement("span", null), React.createElement("span", null)), React.createElement("div", {
      className: "kv-loading-table-body"
    }, [1, 2, 3, 4, 5].map(item => React.createElement("div", {
      className: "kv-loading-table-row",
      key: item
    }, React.createElement("span", {
      className: "kv-loading-bone"
    }), React.createElement("span", {
      className: "kv-loading-bone"
    }), React.createElement("span", {
      className: "kv-loading-bone"
    }), React.createElement("span", {
      className: "kv-loading-bone"
    }))))), React.createElement("section", {
      className: "kv-loading-panel kv-loading-panel--activity"
    }, React.createElement("div", {
      className: "kv-loading-panel-head"
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-panel-title"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-panel-action"
    })), React.createElement("div", {
      className: "kv-loading-activity-list"
    }, [1, 2, 3, 4].map(item => React.createElement("div", {
      className: "kv-loading-activity-row",
      key: item
    }, React.createElement("span", {
      className: "kv-loading-bone kv-loading-activity-icon"
    }), React.createElement("div", null, React.createElement("span", {
      className: "kv-loading-bone kv-loading-activity-title"
    }), React.createElement("span", {
      className: "kv-loading-bone kv-loading-activity-meta"
    })))))))))), React.createElement("span", {
      className: "kv-loading-sr"
    }, window.kvT("Loading KinderVault.")));
  }
  return React.createElement("div", {
    className: "kv-app-shell"
  }, React.createElement(Sidebar, {
    page: page,
    setPage: navigateToPage,
    mobileOpen: sidebarOpen,
    onClose: () => setSidebarOpen(false),
    permissions: permissions,
    isAdministrator: isAdministrator
  }), React.createElement("button", {
    type: "button",
    className: `kv-sidebar-scrim${sidebarOpen ? " is-visible" : ""}`,
    onClick: () => setSidebarOpen(false),
    "aria-label": window.kvT("Close navigation")
  }), React.createElement("div", {
    className: "kv-app-content"
  }, React.createElement(Topbar, {
    title: window.kvT(titles[page] || "KinderVault"),
    onSearch: handleSearch,
    searchQuery: page === "search" ? routeState.query || "" : "",
    userName: currentUser.full_name || SESSION_USER,
    lang: lang,
    onLanguageChange: changeLanguage,
    onMenuClick: () => setSidebarOpen(true),
    canSearch: can('search.use')
  }), React.createElement("div", {
    className: "kv-main-scroll"
  }, flash && React.createElement("div", {
    className: "kv-flash-wrap"
  }, React.createElement(Flash, {
    msg: flash.msg,
    type: flash.type,
    onClose: () => setFlash(null)
  })), !canAccessPage(page) ? React.createElement(AccessDeniedPage, null) : React.createElement(React.Fragment, null, page === "search" && React.createElement(SearchPage, {
    query: routeState.query || "",
    students: students,
    payments: payments,
    devRecords: devRecs,
    readingRecords: readingRecs,
    classesList: classesList,
    feeConfig: feeConfig,
    goReceipt: goReceipt,
    openStudentProfile: openStudentProfile,
    openDevelopmentRecord: openDevelopmentRecord,
    openClass: openSearchClass
  }), page === "dashboard" && React.createElement(DashboardPage, {
    students: students,
    payments: payments,
    classesList: classesList,
    devRecords: devRecs,
    setPage: navigateToPage,
    openAddStudent: openAddStudent,
    openBackupSettings: openBackupSettings,
    feeConfig: feeConfig,
    permissions: permissions,
    isAdministrator: isAdministrator
  }), page === "students" && React.createElement(StudentsPage, {
    students: students,
    classesList: classesList,
    setStudents: setStudents,
    setPage: navigateToPage,
    setFlash: setFlash,
    payments: payments,
    setPayments: setPayments,
    goReceipt: goReceipt,
    navigationState: routeState,
    navigationKey: route.entryId,
    navigate: navigate,
    goBack: goBack,
    replaceRouteState: replaceRouteState,
    feeConfig: feeConfig,
    permissions: permissions,
    isAdministrator: isAdministrator,
    scannerEnabled: window.KV_SCANNER_ENABLED !== false
  }), page === "classes" && React.createElement(ClassesPage, {
    classesList: classesList,
    setClassesList: setClassesList,
    students: students,
    setFlash: setFlash,
    navigationState: routeState
  }), page === "payments" && React.createElement(PaymentsPage, {
    students: students,
    payments: payments,
    setPayments: setPayments,
    setFlash: setFlash,
    goReceipt: goReceipt,
    navigationState: routeState,
    navigationKey: route.entryId,
    navigate: navigate,
    goBack: goBack,
    replaceRouteState: replaceRouteState,
    feeConfig: feeConfig,
    permissions: permissions,
    isAdministrator: isAdministrator
  }), page === "receipts" && React.createElement(ReceiptsPage, {
    students: students,
    payments: payments,
    feeConfig: feeConfig,
    selectedReceipt: selectedReceipt,
    openReceipt: goReceipt,
    goBack: goBack,
    navigationState: routeState,
    navigationKey: route.entryId,
    replaceRouteState: replaceRouteState,
    permissions: permissions,
    isAdministrator: isAdministrator
  }), page === "development" && React.createElement(PageErrorBoundary, null, React.createElement(DevPage, {
    students: students,
    devRecords: devRecs,
    setDevRecords: setDevRecs,
    readingRecords: readingRecs,
    setReadingRecords: setReadingRecs,
    currentUser: currentUser,
    setFlash: setFlash,
    navigationState: routeState,
    navigationKey: route.entryId,
    navigate: navigate,
    replaceRouteState: replaceRouteState,
    permissions: permissions,
    isAdministrator: isAdministrator
  })), page === "settings" && React.createElement(SettingsPage, {
    setFlash: setFlash,
    currentUser: currentUser,
    setCurrentUser: setCurrentUser,
    feeConfig: feeConfig,
    setFeeConfig: setFeeConfig,
    isAdministrator: isAdministrator,
    students: students,
    setStudents: setStudents,
    payments: payments,
    devRecords: devRecs,
    classesList: classesList,
    setClassesList: setClassesList,
    navigationState: routeState,
    navigationKey: route.entryId
  })))), sessionWarningOpen && React.createElement("div", {
    className: "kv-modal-backdrop kv-session-timeout-backdrop"
  }, React.createElement("section", {
    className: "kv-modal kv-session-timeout-modal",
    role: "alertdialog",
    "aria-modal": "true",
    "aria-labelledby": "kv-session-timeout-title",
    "aria-describedby": "kv-session-timeout-description"
  }, React.createElement("div", {
    className: "kv-session-timeout-icon",
    "aria-hidden": "true"
  }, React.createElement("i", {
    className: "ti ti-clock-exclamation"
  })), React.createElement("div", {
    className: "kv-session-timeout-copy"
  }, React.createElement("div", {
    className: "kv-session-timeout-eyebrow"
  }, window.kvT('Session security warning')), React.createElement("h2", {
    id: "kv-session-timeout-title"
  }, window.kvT('Session expiring soon')), React.createElement("p", {
    id: "kv-session-timeout-description"
  }, window.kvT('Your session will expire in {time} due to inactivity.', {
    time: `${Math.floor(sessionSecondsRemaining / 60)}:${String(sessionSecondsRemaining % 60).padStart(2, '0')}`
  })), React.createElement("p", {
    className: "kv-session-timeout-help"
  }, window.kvT('Select Stay signed in to continue working, or log out now.'))), React.createElement("div", {
    className: "kv-session-timeout-actions"
  }, React.createElement("a", {
    className: "kv-btn kv-btn--outline",
    href: "logout.php"
  }, window.kvT('Logout')), React.createElement("button", {
    type: "button",
    className: "kv-btn kv-btn--primary",
    onClick: staySignedIn,
    disabled: sessionRenewing,
    autoFocus: true
  }, window.kvT(sessionRenewing ? 'Staying signed in...' : 'Stay signed in'))))));
}
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(App, null));
