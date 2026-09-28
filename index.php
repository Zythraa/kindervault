<?php
// ============================================================
// index.php  –  Main entry point for KinderVault
// Checks session, then renders the React shell + all JSX pages
// ============================================================
require_once 'config.php';
requireLogin();

if (($_GET['page'] ?? '') === 'settings' && !hasPermission('settings.access')) {
    requirePermission('settings.access');
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$userName = htmlspecialchars($_SESSION['full_name'] ?? 'Administrator');
$csrfToken = csrfToken();
$locale = currentLocale();
$description = $locale === 'ms'
    ? 'KinderVault: sistem pengurusan prasekolah lengkap untuk ' . SCHOOL
    : 'KinderVault: a complete preschool management system for ' . SCHOOL;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($locale, ENT_QUOTES, 'UTF-8') ?>" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KinderVault</title>
  <meta name="description" content="<?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?>">
  <meta name="theme-color" content="#6B3FA0">
  <link rel="icon" href="assets/img/kindervault-mark.svg?v=1" type="image/svg+xml">

  <!-- Tabler Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- App CSS -->
  <link rel="stylesheet" href="assets/css/app.css?v=54">

  <!-- React 18 + Babel (CDN) -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Generates MFA QR codes locally in the browser; the enrollment secret is never sent to a QR service. -->
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

  <!-- Restore saved theme immediately to prevent flash -->
  <script>
    const _t = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', _t);
    window.KV_LOCALE = <?= json_encode($locale) ?>;
    document.documentElement.setAttribute('lang', window.KV_LOCALE);
    window.KV_SCANNER_ENABLED = <?= json_encode(SCANNER_ENABLED) ?>;
    window.KV_APP_ENV = <?= json_encode(APP_ENV) ?>;
  </script>
</head>
<body>
<div id="root"></div>

<!-- ══════════════════════════════════════════════════════════
     All JSX files loaded as Babel script blocks
     Order matters: shared → pages → app (root)
     ══════════════════════════════════════════════════════════ -->

  <script type="text/babel" src="pages/shared.jsx?v=51"></script>
<script type="text/babel" src="pages/dashboard.jsx?v=16"></script>
<script type="text/babel" src="pages/classes.jsx?v=9"></script>
<?php if (SCANNER_ENABLED): ?>
<script type="text/babel" src="pages/registration_scanner.jsx?v=2"></script>
<?php endif; ?>
<script type="text/babel" src="pages/students.jsx?v=32"></script>
<script type="text/babel" src="pages/payments.jsx?v=18"></script>
<script type="text/babel" src="pages/receipts.jsx?v=14"></script>
<script type="text/babel" src="pages/development.jsx?v=39"></script>
  <script type="text/babel" src="pages/backup.jsx?v=13"></script>
  <script type="text/babel" src="pages/settings.jsx?v=26"></script>

<!-- Root App – bootstraps React, loads data from API -->
<script type="text/babel">
const { useState, useEffect, useRef } = React;

// Session user passed from PHP
const SESSION_USER = <?= json_encode($userName) ?>;
const SESSION_LOCALE = <?= json_encode($locale) ?>;
const SESSION_TIMEOUT_SECONDS = <?= json_encode(securityConfig()['session_timeout_minutes'] * 60) ?>;
const SESSION_WARNING_SECONDS = 60;
window.KV_CSRF_TOKEN = <?= json_encode($csrfToken) ?>;
const DEFAULT_FEE_CONFIG = {
  annual: {
    registration: 100,
    books: {4:380, 5:460, 6:560},
    uniform: 65,
    sports_uniform: 55,
    tudung: 20,
    lawatan: 100,
    sukan: 60,
    hadiah: 100,
    gambar: 90,
    iqra: 30,
  },
  monthly_packages: {
    A: {label: "Tadika Sahaja", amount: 230},
    B: {label: "Tadika + Half Daycare", amount: 320},
    C: {label: "Tadika + Full Daycare", amount: 430},
  }
};

// ── Browser navigation ────────────────────────────────────
// The app is a single PHP entry point, so route context is kept in the
// History API instead of introducing a second client-side router.
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
  search: "search.use",
};

const newNavigationId = () => `kv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeRoute = (candidate = {}) => {
  const isLegacyBackupRoute = candidate.page === "backup";
  const state = candidate.state && typeof candidate.state === "object" ? {...candidate.state} : {};
  return {
    page: isLegacyBackupRoute ? "settings" : (KV_VALID_PAGES.has(candidate.page) ? candidate.page : "dashboard"),
    state: isLegacyBackupRoute ? {...state, tab:"backup"} : state,
    entryId: candidate.entryId || newNavigationId(),
  };
};

const routeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedPage = params.get("page");
  const isLegacyBackupRoute = requestedPage === "backup";
  const page = isLegacyBackupRoute
    ? "settings"
    : (KV_VALID_PAGES.has(requestedPage) ? requestedPage : (params.get("receipt") ? "receipts" : "dashboard"));
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
    state.tab = isLegacyBackupRoute ? "backup" : (params.get("settings_tab") || "");
  }

  return normalizeRoute({page, state});
};

const routeUrl = (route) => {
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

const AccessDeniedPage = () => (
  <div className="kv-page kv-page--access-denied">
    <Card>
      <div style={{padding:28,textAlign:"center",maxWidth:500,margin:"0 auto"}}>
        <div style={{width:52,height:52,display:"grid",placeItems:"center",margin:"0 auto 14px",borderRadius:16,background:C.redBg,color:C.red,fontSize:26}}>
          <i className="ti ti-lock" aria-hidden="true"/>
        </div>
        <h2 className="kv-page-title" style={{margin:"0 0 8px"}}>{window.kvT("Access Denied")}</h2>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.55}}>
          {window.kvT("You do not have permission to access this section.")}
        </div>
      </div>
    </Card>
  </div>
);

const historyEntry = (route, hasInternalPrevious, scrollTop = 0) => ({
  [KV_NAVIGATION_KEY]: true,
  route,
  hasInternalPrevious: Boolean(hasInternalPrevious),
  scrollTop,
});

const SearchPage = ({query, students, payments, devRecords, readingRecords = [], classesList, goReceipt, openDevelopmentRecord}) => {
  const q = (query || "").trim().toLowerCase();

  const parseSearchIntent = (text) => {
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
    if (intent.methodFilter) parts.push(window.kvT('payment method {method}', {method: intent.methodFilter}));
    if (intent.receiptOnly) parts.push(window.kvT('receipt numbers'));
    if (intent.studentOnly) parts.push(window.kvT('Students'));
    if (intent.classOnly) parts.push(window.kvT('Classes'));
    intent.summary = parts.length ? window.kvT('Interpreted as: {filters}.', {filters: parts.join(', ')}) : '';
    return intent;
  };

  const intent = parseSearchIntent(query);

  const highlightText = (value) => {
    if (value === undefined || value === null) return '–';
    const text = String(value);
    if (!q) return text;
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(q);
    if (index === -1) return text;
    const before = text.slice(0, index);
    const match = text.slice(index, index + q.length);
    const after = text.slice(index + q.length);
    return (
      <>
        {before}
        <span style={{background:'rgba(250,215,0,0.45)',borderRadius:3,padding:'0 2px'}}>{match}</span>
        {highlightText(after)}
      </>
    );
  };

  if (!q) {
    return (
      <div className="kv-page kv-page--search">
        <Card>
          <div style={{padding:24,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:"var(--color-text-primary)",marginBottom:6}}>{window.kvT("Search Everything")}</div>
            <div style={{color:"var(--color-text-secondary)",maxWidth:560,margin:"0 auto"}}>
              {window.kvT("Type any student name, IC, parent, phone, receipt number, class, payment method, or note in the search box above to find matching records across the system.")}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const searchFields = (item, keys) => keys.some(key => {
    const value = item[key];
    return value !== undefined && value !== null && String(value).toLowerCase().includes(q);
  });

  const overdueStudentIds = new Set(payments.filter(p => String(p.status || "").toLowerCase().includes('overdue')).map(p => p.student_id));
  const monthRegex = /(\d{4}-\d{2})|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;

  const studentMatches = students.filter(s => {
    const basic = searchFields(s, ["name","ic","parent","phone","address","class","status","enrol","fee"]);
    const overdueMatch = intent.statusFilter === 'Overdue' && overdueStudentIds.has(s.id);
    return basic || overdueMatch;
  });

  const paymentMatches = payments.filter(p => {
    const student = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id)) || {};
    const basic = searchFields(p, ["receipt","type","amount","date","method","status","ref","notes","month","student_id"]) || searchFields(student, ["name","ic","parent","phone","class"]);
    const statusMatch = intent.statusFilter ? String(p.status || "").toLowerCase().includes(intent.statusFilter.toLowerCase()) : true;
    const monthMatch = intent.monthFilter ? (String(p.month || "").includes(intent.monthFilter) || String(p.date || "").startsWith(intent.monthFilter)) : true;
    const methodMatch = intent.methodFilter ? String(p.method || "").toLowerCase().includes(intent.methodFilter.toLowerCase()) : true;
    const receiptMatch = intent.receiptOnly ? true : true;
    const intentMatch = statusMatch && monthMatch && methodMatch && receiptMatch;
    return basic || (intentMatch && (intent.statusFilter || intent.monthFilter || intent.methodFilter || intent.receiptOnly));
  });
  const searchableDevelopmentRecords = [
    ...devRecords.map(record => ({
      ...record,
      searchModule: "borang",
      date: record.assessment_date || record.date || "",
      notes: record.is_legacy ? (record.legacy_summary || record.comment || "") : (record.notes || record.comment || ""),
    })),
    ...readingRecords.map(record => ({
      ...record,
      searchModule: "reading",
      type: "Reading Progress",
      date: record.record_date || "",
      status: "Saved",
    })),
  ];
  const devMatches = searchableDevelopmentRecords.filter(d => {
    const student = students.find(x => x.id === d.student_id || x.id === parseInt(d.student_id)) || {};
    return searchFields(d, ["type","date","notes","comment","status"]) || searchFields(student, ["name","parent","class","phone"]);
  });
  const classMatches = classesList.filter(c => searchFields(c, ["name"]));

  const formatMonth = (m) => {
    if (!m) return "";
    const date = new Date(m + "-01");
    return window.kvDate(date, {month:"short", year:"numeric"}, m);
  };
  const formatDate = (value) => value
    ? window.kvDate(value, {day:"numeric", month:"short", year:"numeric"}, value)
    : "–";

  return (
    <div className="kv-page kv-page--search">
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:18}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:500,color:"var(--color-text-primary)"}}>{window.kvT("Search Results")}</h2>
          <div style={{color:"var(--color-text-secondary)",fontSize:13,marginTop:4}}>
            {window.kvT('{students} student(s), {payments} payment(s), {development} development record(s), {classes} class(es) found for "{query}".', {students: studentMatches.length, payments: paymentMatches.length, development: devMatches.length, classes: classMatches.length, query})}
          </div>
          {intent.summary ? <div style={{color:"var(--color-text-secondary)",fontSize:12,marginTop:6}}>{intent.summary}</div> : null}
        </div>
      </div>

      {(studentMatches.length || paymentMatches.length || devMatches.length || classMatches.length) ? (
        <>
          {studentMatches.length > 0 && (
            <Card style={{marginBottom:20}}>
              <CardHead><i className="ti ti-users" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Student Matches")}</CardHead>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--color-background-secondary)"}}>
                      {['Name','IC','Class','Parent','Phone','Fee','Status','Enrol'].map(h => (
                        <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:.5,color:'var(--color-text-tertiary)',fontWeight:500,borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{window.kvT(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentMatches.map(s => (
                      <tr key={s.id} style={{borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                        <td style={{padding:'10px 12px',fontWeight:600,color:'var(--color-text-primary)'}}>{highlightText(s.name)}</td>
                        <td style={{padding:'10px 12px',color:'var(--color-text-secondary)'}}>{highlightText(s.ic||'–')}</td>
                        <td style={{padding:'10px 12px'}}>{highlightText(s.class||'–')}</td>
                        <td style={{padding:'10px 12px'}}>{highlightText(s.parent||'–')}</td>
                        <td style={{padding:'10px 12px'}}>{highlightText(s.phone||'–')}</td>
                        <td style={{padding:'10px 12px',color:C.green,fontWeight:700}}>{highlightText(s.fee ? `RM ${parseFloat(s.fee).toFixed(2)}` : '–')}</td>
                        <td style={{padding:'10px 12px'}}>{highlightText(window.kvT(s.status||'–'))}</td>
                        <td style={{padding:'10px 12px'}}>{highlightText(formatDate(s.enrol))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {paymentMatches.length > 0 && (
            <Card style={{marginBottom:20}}>
              <CardHead><i className="ti ti-credit-card" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Payment Matches")}</CardHead>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--color-background-secondary)"}}>
                      {['Receipt','Student','Type','Amount','Month','Date','Method','Status','Notes','Action'].map(h => (
                        <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:.5,color:'var(--color-text-tertiary)',fontWeight:500,borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{window.kvT(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMatches.map(p => {
                      const student = students.find(x=>x.id===p.student_id||x.id===parseInt(p.student_id))||{};
                      return (
                        <tr key={p.id} style={{borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                          <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:11,color:'var(--color-text-primary)'}}>{highlightText(p.receipt||'–')}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(p.student_name||student.name||'–')}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(window.kvT(p.type||'–'))}</td>
                          <td style={{padding:'10px 12px',fontWeight:700,color:C.green}}>{highlightText(`RM ${parseFloat(p.amount||0).toFixed(2)}`)}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText((p.month||'').split(',').map(formatMonth).filter(Boolean).join(', ')||'–')}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(formatDate(p.date))}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(window.kvT(p.method||'–'))}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(window.kvT(p.status||'–'))}</td>
                          <td style={{padding:'10px 12px',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={p.notes||''}>{highlightText(p.notes||'–')}</td>
                          <td style={{padding:'10px 12px'}}>{p.receipt ? <Btn small variant="outline" onClick={()=>goReceipt(p)}>{window.kvT("View")}</Btn> : '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {devMatches.length > 0 && (
            <Card style={{marginBottom:20}}>
              <CardHead><i className="ti ti-chart-line" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Development Matches")}</CardHead>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--color-background-secondary)"}}>
                      {['Student','Type','Date','Notes','Action'].map(h => (
                        <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:.5,color:'var(--color-text-tertiary)',fontWeight:500,borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{window.kvT(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {devMatches.map(d => {
                      const student = students.find(x=>x.id===d.student_id||x.id===parseInt(d.student_id))||{};
                      return (
                        <tr key={`${d.searchModule}-${d.id}`} style={{borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                          <td style={{padding:'10px 12px'}}>{highlightText(student.name||'–')}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(window.kvT(d.type||'–'))}</td>
                          <td style={{padding:'10px 12px'}}>{highlightText(formatDate(d.date))}</td>
                          <td style={{padding:'10px 12px',maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={d.notes||''}>{highlightText(d.notes||'–')}</td>
                          <td style={{padding:'10px 12px'}}>{openDevelopmentRecord ? <Btn small variant="outline" onClick={()=>openDevelopmentRecord(d)}>{window.kvT("Open")}</Btn> : '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {classMatches.length > 0 && (
            <Card>
              <CardHead><i className="ti ti-chalkboard" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Class Matches")}</CardHead>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--color-background-secondary)"}}>
                      {['Class Name'].map(h => (
                        <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:.5,color:'var(--color-text-tertiary)',fontWeight:500,borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{window.kvT(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classMatches.map(c => (
                      <tr key={c.id} style={{borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                        <td style={{padding:'10px 12px',fontWeight:600,color:'var(--color-text-primary)'}}>{highlightText(c.name)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <EmptyState icon="search" text={window.kvT('No matches found for "{query}". Try another name, receipt, phone number or class.', {query})}/>
      )}
    </div>
  );
};

// ── Root App ──────────────────────────────────────────────
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
  const [devRecs,  setDevRecs]  = useState([]);
  const [readingRecs, setReadingRecs] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [flash,    setFlash]    = useState(null);
  const [lang, setLang] = useState(() => window.kvNormalizeLocale(SESSION_LOCALE));
  const [feeConfig, setFeeConfig] = useState(DEFAULT_FEE_CONFIG);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({full_name: SESSION_USER, role: ""});
  const [permissions, setPermissions] = useState([]);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(SESSION_WARNING_SECONDS);
  const [sessionRenewing, setSessionRenewing] = useState(false);
  const sessionTimeoutRef = useRef(SESSION_TIMEOUT_SECONDS);
  const sessionDeadlineRef = useRef(Date.now() + (SESSION_TIMEOUT_SECONDS * 1000));
  const sessionWarningRef = useRef(false);
  const sessionEndingRef = useRef(false);
  const sessionLastConfirmedRef = useRef(Date.now());
  const sessionTouchPendingRef = useRef(false);
  const sessionTouchTimerRef = useRef(null);
  const can = (permission) => canUsePermission(permissions, permission, isAdministrator);
  const canAccessPage = (candidatePage) => !KV_PAGE_PERMISSIONS[candidatePage] || can(KV_PAGE_PERMISSIONS[candidatePage]);
  const selectedReceipt = page === "receipts" && routeState.receiptId
    ? routeState.receiptSnapshot || payments.find(payment => String(payment.id) === String(routeState.receiptId) || payment.receipt === routeState.receiptId) || null
    : null;

  const resetSessionClock = (timeoutSeconds = sessionTimeoutRef.current) => {
    const safeTimeout = Math.max(300, Number(timeoutSeconds) || SESSION_TIMEOUT_SECONDS);
    sessionTimeoutRef.current = safeTimeout;
    sessionDeadlineRef.current = Date.now() + (safeTimeout * 1000);
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
        setFlash({msg:error.message || window.kvT('Unable to renew your session. Check your connection and try again.'),type:'danger'});
      }
    } finally {
      if (!sessionEndingRef.current) setSessionRenewing(false);
    }
  };

  useEffect(() => {
    const confirmSession = () => resetSessionClock();
    const endSession = (event) => {
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
      fetch('api/session.php', {headers:{'Accept':'application/json'}, cache:'no-store'})
        .then(parseApiResponse)
        .catch(() => {})
        .finally(() => { sessionTouchPendingRef.current = false; });
    };
    const recordActivity = () => {
      if (sessionEndingRef.current || sessionWarningRef.current) return;
      const now = Date.now();
      sessionDeadlineRef.current = now + (sessionTimeoutRef.current * 1000);
      const untilNextTouch = 30000 - (now - sessionLastConfirmedRef.current);
      if (untilNextTouch <= 0) {
        touchSession();
      } else if (!sessionTouchTimerRef.current) {
        // A trailing touch preserves recent real activity without polling an idle page.
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
    activityEvents.forEach(eventName => window.addEventListener(eventName, recordActivity, {passive:true}));
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

  // ── Keep language state persistent and update document language ─
  const applyLanguage = (requestedLocale) => {
    const nextLocale = window.kvNormalizeLocale(requestedLocale);
    // Update before React renders so all visible translations change in one pass.
    window.kvLang = nextLocale;
    document.documentElement.setAttribute('lang', nextLocale);
    localStorage.setItem('lang', nextLocale);
    setLang(nextLocale);
    return nextLocale;
  };

  const changeLanguage = async (requestedLocale) => {
    const previousLocale = window.kvNormalizeLocale(currentUser.language || SESSION_LOCALE);
    const nextLocale = applyLanguage(requestedLocale);
    if (nextLocale === previousLocale) return;

    try {
      const result = await api.put('api/language.php', {locale: nextLocale});
      if (result.error) throw new Error(result.error);
      const confirmedLocale = window.kvNormalizeLocale(result.locale || nextLocale);
      applyLanguage(confirmedLocale);
      setCurrentUser(previous => ({...previous, ...(result.user || {}), language: confirmedLocale}));
    } catch (error) {
      applyLanguage(previousLocale);
      setFlash({msg: error.message || window.kvT('Unable to save the language preference.'), type: 'danger'});
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
      window.history.replaceState(
        historyEntry(routeRef.current, false, mainScrollTop()),
        "",
        routeUrl(routeRef.current)
      );
    }

    const savedScrollRestoration = "scrollRestoration" in window.history ? window.history.scrollRestoration : null;
    if (savedScrollRestoration !== null) window.history.scrollRestoration = "manual";

    const onPopState = (event) => {
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

  // ── Load all data on mount ───────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchJson = (url) => fetch(url).then(parseApiResponse);

    const load = async () => {
      try {
        const sessionRes = await fetchJson('api/session.php');
        if (sessionRes.error) throw new Error(sessionRes.error);

        const nextPermissions = Array.isArray(sessionRes.permissions) ? sessionRes.permissions : [];
        const nextIsAdministrator = Boolean(sessionRes.is_administrator);
        const canLoad = (permission) => nextIsAdministrator || nextPermissions.includes(permission);
        if (!active) return;

        setCurrentUser(sessionRes.user || {full_name: SESSION_USER, role: ""});
        resetSessionClock(sessionRes.session_timeout_seconds);
        applyLanguage(sessionRes.locale || sessionRes.user?.language || SESSION_LOCALE);
        setPermissions(nextPermissions);
        setIsAdministrator(nextIsAdministrator);
        setFeeConfig(sessionRes.fee_config || DEFAULT_FEE_CONFIG);

        const loadWhenAllowed = (url, permission) => canLoad(permission)
          ? fetchJson(url)
          : Promise.resolve([]);
        const [stu, pay, dev, reading, cls] = await Promise.all([
          loadWhenAllowed('api/students.php', 'students.view'),
          loadWhenAllowed('api/payments.php', 'payments.view'),
          loadWhenAllowed('api/development.php', 'development.view'),
          loadWhenAllowed('api/reading_progress.php', 'development.view'),
          loadWhenAllowed('api/classes.php', 'classes.view'),
        ]);
        if (!active) return;

        setStudents(Array.isArray(stu) ? stu : []);
        setPayments(Array.isArray(pay) ? pay : []);
        setDevRecs(Array.isArray(dev) ? dev : []);
        setReadingRecs(Array.isArray(reading) ? reading : []);
        setClassesList(Array.isArray(cls) ? cls : []);
      } catch (error) {
        if (active) {
          setFlash({msg:window.kvT("Failed to load data from server. Check your database connection."),type:"danger"});
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  // Auto-dismiss flash after 4 s
  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 4000);
      return () => clearTimeout(t);
    }
  }, [flash]);

  const navigate = (candidate, options = {}) => {
    const nextRoute = normalizeRoute(candidate);
    const currentEntry = window.history.state && window.history.state[KV_NAVIGATION_KEY]
      ? window.history.state
      : null;
    const hasInternalPrevious = Boolean(currentEntry?.hasInternalPrevious);

    if (options.replace) {
      window.history.replaceState(
        historyEntry(nextRoute, hasInternalPrevious, options.preserveScroll ? mainScrollTop() : 0),
        "",
        routeUrl(nextRoute)
      );
    } else {
      window.history.replaceState(
        historyEntry(routeRef.current, hasInternalPrevious, mainScrollTop()),
        "",
        routeUrl(routeRef.current)
      );
      window.history.pushState(historyEntry(nextRoute, true, 0), "", routeUrl(nextRoute));
    }

    routeRef.current = nextRoute;
    setRoute(nextRoute);
    if (!options.preserveScroll) restoreMainScroll(0);
  };

  const replaceRouteState = (patch) => {
    const currentRoute = routeRef.current;
    const changes = typeof patch === "function" ? patch(currentRoute.state || {}) : patch;
    const nextRoute = normalizeRoute({
      ...currentRoute,
      state: {...(currentRoute.state || {}), ...(changes || {})},
      entryId: currentRoute.entryId,
    });
    const currentEntry = window.history.state && window.history.state[KV_NAVIGATION_KEY]
      ? window.history.state
      : null;

    routeRef.current = nextRoute;
    setRoute(nextRoute);
    window.history.replaceState(
      historyEntry(nextRoute, Boolean(currentEntry?.hasInternalPrevious), mainScrollTop()),
      "",
      routeUrl(nextRoute)
    );
  };

  const goBack = (fallback) => {
    const currentEntry = window.history.state && window.history.state[KV_NAVIGATION_KEY]
      ? window.history.state
      : null;
    if (currentEntry?.hasInternalPrevious) {
      window.history.back();
      return;
    }
    navigate(fallback || {page: routeRef.current.page, state: {}}, {replace: true});
  };

  const navigateToPage = (nextPage) => {
    if (!canAccessPage(nextPage)) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to access this section."),type:"danger"});
      return;
    }
    const currentRoute = routeRef.current;
    if (currentRoute.page === nextPage && Object.keys(currentRoute.state || {}).length === 0) return;
    setFlash(null);
    navigate({page: nextPage, state: {}});
  };

  const goReceipt = (payment, options = {}) => {
    if (!canAccessPage("receipts")) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to access this section."),type:"danger"});
      return;
    }
    const receiptId = payment?.id || payment?.receipt || null;
    navigate({
      page: "receipts",
      state: {receiptId, receiptSnapshot: payment || null},
    }, options);
  };

  const openDevelopmentRecord = (record) => {
    if (!canAccessPage("development")) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to access this section."),type:"danger"});
      return;
    }
    const studentId = record?.student_id || null;
    if (record?.searchModule === "reading") {
      navigate({page:"development", state:{module:"reading", screen:"workspace", viewMode:"fill", readingRecordId:record.id, studentId}});
      return;
    }
    if (record?.is_legacy || record?.record_type === "legacy") {
      navigate({page:"development", state:{module:"borang", screen:"history", viewMode:"fill", studentId}});
      return;
    }
    navigate({page:"development", state:{module:"borang", screen:"workspace", viewMode:"print", recordId:record?.id || null, studentId}});
  };

  const openAddStudent = () => {
    if (!can('students.create')) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to add students."),type:"danger"});
      return;
    }
    setFlash(null);
    navigate({page: "students", state: {view: "add"}});
  };

  const openBackupSettings = () => {
    if (!canAccessPage("settings")) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to access this section."),type:"danger"});
      return;
    }
    setFlash(null);
    navigate({page: "settings", state: {tab: "backup"}});
  };

  const handleSearch = (query) => {
    if (!canAccessPage("search")) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to use search."),type:"danger"});
      return;
    }
    const value = query || "";
    if (value.trim()) {
      if (routeRef.current.page === "search") {
        replaceRouteState({query: value});
      } else {
        navigate({page: "search", state: {query: value}});
      }
      return;
    }
    if (routeRef.current.page === "search") {
      goBack({page: "dashboard", state: {}});
    }
  };

  const titles = {
    dashboard:"Dashboard", students:"Students", classes:"Manage Classes", payments:"Payments",
    receipts:"Receipts", development:"Student Development",
    search:"Search", settings:"Settings",
  };

  useEffect(() => {
    const pageTitle = window.kvT(titles[page] || "KinderVault");
    document.title = page === "dashboard" ? "KinderVault" : `${pageTitle} | KinderVault`;
  }, [page, lang]);

  if (loading) {
    return (
      <div className="kv-app-loading" role="status" aria-live="polite" aria-label={window.kvT("Loading KinderVault")}>
        <div className="kv-loading-frame" aria-hidden="true">
          <aside className="kv-loading-sidebar">
            <div className="kv-loading-brand">
              <div className="kv-loading-brand-name">Kinder<span>Vault</span></div>
              <div className="kv-loading-bone kv-loading-brand-subtitle"/>
            </div>
            <div className="kv-loading-nav-list">
              {[1,2,3,4,5,6].map(item => <div className={`kv-loading-nav-item${item === 1 ? " is-active" : ""}`} key={item}><span className="kv-loading-bone kv-loading-nav-icon"/><span className="kv-loading-bone kv-loading-nav-label"/></div>)}
            </div>
            <div className="kv-loading-sidebar-footer"><span className="kv-loading-bone kv-loading-avatar"/><span className="kv-loading-bone kv-loading-footer-label"/></div>
          </aside>
          <main className="kv-loading-main">
            <header className="kv-loading-topbar">
              <div className="kv-loading-mobile-brand">Kinder<span>Vault</span></div>
              <div className="kv-loading-bone kv-loading-search"/>
              <div className="kv-loading-topbar-actions"><span className="kv-loading-bone kv-loading-topbar-circle"/><span className="kv-loading-bone kv-loading-topbar-circle"/><span className="kv-loading-bone kv-loading-topbar-avatar"/></div>
            </header>
            <div className="kv-loading-content">
              <div className="kv-loading-page-heading"><span className="kv-loading-bone kv-loading-heading-line"/><span className="kv-loading-bone kv-loading-subheading-line"/></div>
              <div className="kv-loading-stat-grid">
                {[1,2,3,4].map(item => <div className="kv-loading-stat-card" key={item}><span className="kv-loading-bone kv-loading-stat-icon"/><span className="kv-loading-bone kv-loading-stat-label"/><span className="kv-loading-bone kv-loading-stat-value"/><span className="kv-loading-bone kv-loading-stat-meta"/></div>)}
              </div>
              <div className="kv-loading-panel-grid">
                <section className="kv-loading-panel kv-loading-panel--table"><div className="kv-loading-panel-head"><span className="kv-loading-bone kv-loading-panel-title"/><span className="kv-loading-bone kv-loading-panel-action"/></div><div className="kv-loading-table-head"><span/><span/><span/><span/></div><div className="kv-loading-table-body">{[1,2,3,4,5].map(item => <div className="kv-loading-table-row" key={item}><span className="kv-loading-bone"/><span className="kv-loading-bone"/><span className="kv-loading-bone"/><span className="kv-loading-bone"/></div>)}</div></section>
                <section className="kv-loading-panel kv-loading-panel--activity"><div className="kv-loading-panel-head"><span className="kv-loading-bone kv-loading-panel-title"/><span className="kv-loading-bone kv-loading-panel-action"/></div><div className="kv-loading-activity-list">{[1,2,3,4].map(item => <div className="kv-loading-activity-row" key={item}><span className="kv-loading-bone kv-loading-activity-icon"/><div><span className="kv-loading-bone kv-loading-activity-title"/><span className="kv-loading-bone kv-loading-activity-meta"/></div></div>)}</div></section>
              </div>
            </div>
          </main>
        </div>
        <span className="kv-loading-sr">{window.kvT("Loading KinderVault.")}</span>
      </div>
    );
  }

  return (
    <div className="kv-app-shell">
      <Sidebar page={page} setPage={navigateToPage} mobileOpen={sidebarOpen} onClose={()=>setSidebarOpen(false)} permissions={permissions} isAdministrator={isAdministrator}/>
       <button type="button" className={`kv-sidebar-scrim${sidebarOpen ? " is-visible" : ""}`} onClick={()=>setSidebarOpen(false)} aria-label={window.kvT("Close navigation")}/>
      <div className="kv-app-content">
        <Topbar title={window.kvT(titles[page]||"KinderVault")} onSearch={handleSearch} searchQuery={page === "search" ? routeState.query || "" : ""} userName={currentUser.full_name || SESSION_USER} lang={lang} onLanguageChange={changeLanguage} onMenuClick={()=>setSidebarOpen(true)} canSearch={can('search.use')}/>
        <div className="kv-main-scroll">
          {flash && (
            <div className="kv-flash-wrap">
              <Flash msg={flash.msg} type={flash.type} onClose={()=>setFlash(null)}/>
            </div>
          )}
          {!canAccessPage(page) ? <AccessDeniedPage/> : <>
            {page==="search"      && <SearchPage       query={routeState.query || ""} students={students} payments={payments} devRecords={devRecs} readingRecords={readingRecs} classesList={classesList} goReceipt={goReceipt} openDevelopmentRecord={openDevelopmentRecord}/>}
            {page==="dashboard"   && <DashboardPage   students={students} payments={payments} classesList={classesList} devRecords={devRecs} setPage={navigateToPage} openAddStudent={openAddStudent} openBackupSettings={openBackupSettings} permissions={permissions} isAdministrator={isAdministrator}/>}
            {page==="students"    && <StudentsPage     students={students} classesList={classesList} setStudents={setStudents} setPage={navigateToPage} setFlash={setFlash} payments={payments} setPayments={setPayments} goReceipt={goReceipt} navigationState={routeState} navigationKey={route.entryId} navigate={navigate} goBack={goBack} replaceRouteState={replaceRouteState} feeConfig={feeConfig} permissions={permissions} isAdministrator={isAdministrator} scannerEnabled={window.KV_SCANNER_ENABLED !== false}/>}
            {page==="classes"     && <ClassesPage      classesList={classesList} setClassesList={setClassesList} students={students} setFlash={setFlash}/>}
            {page==="payments"    && <PaymentsPage     students={students} payments={payments} setPayments={setPayments} setFlash={setFlash} goReceipt={goReceipt} navigationState={routeState} navigationKey={route.entryId} navigate={navigate} goBack={goBack} replaceRouteState={replaceRouteState} feeConfig={feeConfig} permissions={permissions} isAdministrator={isAdministrator}/>}
            {page==="receipts"    && <ReceiptsPage     students={students} payments={payments} feeConfig={feeConfig} selectedReceipt={selectedReceipt} openReceipt={goReceipt} goBack={goBack} navigationState={routeState} navigationKey={route.entryId} replaceRouteState={replaceRouteState} permissions={permissions} isAdministrator={isAdministrator}/>}
            {page==="development" && <PageErrorBoundary><DevPage students={students} devRecords={devRecs} setDevRecords={setDevRecs} readingRecords={readingRecs} setReadingRecords={setReadingRecs} currentUser={currentUser} setFlash={setFlash} navigationState={routeState} navigationKey={route.entryId} navigate={navigate} replaceRouteState={replaceRouteState} permissions={permissions} isAdministrator={isAdministrator}/></PageErrorBoundary>}
            {page==="settings"    && <SettingsPage     setFlash={setFlash} currentUser={currentUser} setCurrentUser={setCurrentUser} feeConfig={feeConfig} setFeeConfig={setFeeConfig} isAdministrator={isAdministrator} students={students} setStudents={setStudents} payments={payments} devRecords={devRecs} classesList={classesList} setClassesList={setClassesList} navigationState={routeState} navigationKey={route.entryId}/>}
          </>}
        </div>
      </div>
      {sessionWarningOpen && (
        <div className="kv-modal-backdrop kv-session-timeout-backdrop">
          <section className="kv-modal kv-session-timeout-modal" role="alertdialog" aria-modal="true" aria-labelledby="kv-session-timeout-title" aria-describedby="kv-session-timeout-description">
            <div className="kv-session-timeout-icon" aria-hidden="true"><i className="ti ti-clock-exclamation"/></div>
            <div className="kv-session-timeout-copy">
              <div className="kv-session-timeout-eyebrow">{window.kvT('Session security warning')}</div>
              <h2 id="kv-session-timeout-title">{window.kvT('Session expiring soon')}</h2>
              <p id="kv-session-timeout-description">{window.kvT('Your session will expire in {time} due to inactivity.', {time:`${Math.floor(sessionSecondsRemaining / 60)}:${String(sessionSecondsRemaining % 60).padStart(2, '0')}`})}</p>
              <p className="kv-session-timeout-help">{window.kvT('Select Stay signed in to continue working, or log out now.')}</p>
            </div>
            <div className="kv-session-timeout-actions">
              <a className="kv-btn kv-btn--outline" href="logout.php">{window.kvT('Logout')}</a>
              <button type="button" className="kv-btn kv-btn--primary" onClick={staySignedIn} disabled={sessionRenewing} autoFocus>{window.kvT(sessionRenewing ? 'Staying signed in...' : 'Stay signed in')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App/>);
</script>

</body>
</html>
