const ReceiptsPage = ({
  students,
  payments,
  feeConfig = {},
  selectedReceipt,
  openReceipt,
  goBack,
  navigationState = {},
  navigationKey,
  replaceRouteState,
  permissions = [],
  isAdministrator = false
}) => {
  const locale = window.kvLang || 'en';
  const schoolNameLines = ['Tadika Permata Intelek Ceria', 'Taska Rahiza'];
  const canPrintReceipts = canUsePermission(permissions, "receipts.print", isAdministrator);
  const [searchQuery, setSearchQuery] = React.useState(navigationState.search || "");
  const [filterType, setFilterType] = React.useState(navigationState.filterType || "");
  React.useEffect(() => {
    setSearchQuery(navigationState.search || "");
    setFilterType(navigationState.filterType || "");
  }, [navigationKey]);
  const formatPaymentPeriod = value => {
    const values = String(value || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!values.length) return {
      label: '',
      count: 0
    };
    const parsed = values.map(v => {
      const key = /^\d{4}$/.test(v) ? `${v}-01` : v;
      const date = new Date(`${key}-01`);
      return {
        key: v,
        date,
        time: date.getTime()
      };
    }).filter(v => !Number.isNaN(v.time)).sort((a, b) => a.time - b.time);
    const labels = parsed.map(v => window.kvDate(v.date, {
      month: 'short',
      year: 'numeric'
    }, v.key));
    if (!labels.length) return {
      label: values.join(', '),
      count: values.length
    };
    let label = labels.join(', ');
    if (parsed.length > 1) {
      const contiguous = parsed.every((item, index) => index === 0 || item.date.getFullYear() * 12 + item.date.getMonth() - (parsed[index - 1].date.getFullYear() * 12 + parsed[index - 1].date.getMonth()) === 1);
      label = contiguous ? `${labels[0]} - ${labels[labels.length - 1]}` : labels.join(', ');
    }
    return {
      label,
      count: parsed.length
    };
  };
  const parseAllocationJson = value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return [];
  };
  const expandAdvanceMonths = (item, student) => {
    const storedAllocations = parseAllocationJson(item?.allocation_json);
    if (storedAllocations.length) {
      const settled = storedAllocations.filter(allocation => parseFloat(allocation.balance_after || 0) <= 0.005 && parseFloat(allocation.amount || 0) > 0).map(allocation => allocation.month);
      return settled.length ? settled : [storedAllocations[0].month];
    }
    const explicit = String(item?.month || '').split(',').map(value => value.trim()).filter(Boolean);
    if (explicit.length !== 1 || item?.type !== 'Monthly Fee' || item?.status !== 'Advance') return explicit;
    const start = explicit[0];
    const monthlyFee = parseFloat(student?.fee || 0);
    const amount = parseFloat(item?.amount || 0);
    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(start) || !Number.isFinite(monthlyFee) || monthlyFee <= 0 || !Number.isFinite(amount) || amount <= monthlyFee) return explicit;
    const count = Math.round(amount / monthlyFee);
    if (count < 2 || count > 60 || Math.abs(amount - count * monthlyFee) > 0.01) return explicit;
    const [year, month] = start.split('-').map(Number);
    return Array.from({
      length: count
    }, (_, index) => {
      const date = new Date(year, month - 1 + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
  };
  const collectReceiptMonths = (items, student) => [...new Set(items.filter(item => item?.type === 'Monthly Fee').flatMap(item => expandAdvanceMonths(item, student)))];
  const calculateReceiptBalance = (items, student) => {
    const months = collectReceiptMonths(items, student);
    const fee = parseFloat(student?.fee || 0);
    if (!months.length || !Number.isFinite(fee) || fee <= 0) return null;
    const target = new Set(months);
    const paid = {};
    const obligationDue = {};
    payments.filter(p => parseInt(p.student_id) === parseInt(student?.id) && p.type === "Monthly Fee" && ["Unpaid", "Overdue"].includes(p.status)).forEach(p => {
      const covered = String(p.month || "").split(",").map(m => m.trim()).filter(Boolean);
      const perMonth = parseFloat(p.amount || 0) / Math.max(covered.length, 1);
      covered.forEach(month => {
        if (target.has(month)) obligationDue[month] = Math.max(obligationDue[month] || 0, perMonth);
      });
    });
    const receiptMaxId = Math.max(...items.map(item => parseInt(item.id || 0)).filter(Number.isFinite), 0);
    const receiptHistory = [...payments, ...items.map(item => ({
      ...item,
      student_id: student?.id
    }))].reduce((list, payment) => {
      const key = String(payment.id || [payment.type, payment.month, payment.amount].join("-"));
      if (!list.some(existing => String(existing.id || [existing.type, existing.month, existing.amount].join("-")) === key)) list.push(payment);
      return list;
    }, []);
    receiptHistory.filter(p => parseInt(p.student_id) === parseInt(student?.id) && p.type === "Monthly Fee" && ["paid", "advance", "partial"].includes(String(p.status || "").toLowerCase())).sort((a, b) => parseInt(a.id || 0) - parseInt(b.id || 0)).forEach(p => {
      const covered = expandAdvanceMonths(p, student);
      let remaining = parseFloat(p.amount || 0);
      covered.forEach(month => {
        if (!target.has(month) || remaining <= 0) return;
        const available = Math.max(0, (obligationDue[month] || fee) - (paid[month] || 0));
        const applied = Math.min(available, remaining);
        paid[month] = (paid[month] || 0) + applied;
        remaining -= applied;
      });
    });
    const due = months.reduce((sum, month) => sum + (obligationDue[month] || fee), 0);
    const received = months.reduce((sum, month) => sum + Math.min(obligationDue[month] || fee, paid[month] || 0), 0);
    return Math.max(0, due - received);
  };
  const allReceiptPayments = payments.filter(p => p.receipt);
  const allReceipts = Object.values(allReceiptPayments.reduce((groups, payment) => {
    if (!groups[payment.receipt]) groups[payment.receipt] = [];
    groups[payment.receipt].push(payment);
    return groups;
  }, {})).map(group => {
    const first = group[0];
    const items = group.map(payment => ({
      id: payment.id,
      type: payment.type,
      month: payment.month,
      status: payment.status,
      desc: window.kvPaymentItemLabel(payment.type, payment.month),
      amount: parseFloat(payment.amount || 0),
      balance_after: payment.balance_after,
      allocation_json: payment.allocation_json
    }));
    return {
      ...first,
      status: group.some(payment => String(payment.status || "").toLowerCase() === "voided") ? "Voided" : group.some(payment => String(payment.status || "").toLowerCase() === "partial") ? "Partial" : group.some(payment => String(payment.status || "").toLowerCase() === "advance") ? "Advance" : "Paid",
      type: group.length > 1 ? "Multiple Payments" : first.type,
      amount: items.reduce((total, item) => total + item.amount, 0),
      items,
      payment_ids: group.map(payment => payment.id)
    };
  });
  const receiptTypes = [...new Set(allReceiptPayments.map(p => p.type))].sort();
  const receipts = allReceipts.filter(p => {
    const s = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id));
    const studentName = (p.student_name || s?.name || "").toLowerCase();
    const matchesSearch = studentName.includes(searchQuery.toLowerCase());
    const matchesType = filterType === "" || (p.items || []).some(item => item.type === filterType);
    return matchesSearch && matchesType;
  });
  const open = p => openReceipt(p);
  const backToList = () => goBack({
    page: "receipts",
    state: {
      search: searchQuery,
      filterType
    }
  });
  const handlePrint = (p = selectedReceipt, delay = 50) => {
    if (!p || !canPrintReceipts) return;
    const s = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id));
    const issueDate = (p.date || new Date().toISOString().split('T')[0]).replace(/[^\d-]/g, '');
    const studentName = (p.student_name || s?.name || "Student").replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
    const parentName = (p.student_parent || s?.parent || "Parent").replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
    const paymentName = (p.type || "Payment").replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
    const originalTitle = document.title;
    document.title = `${issueDate}_${studentName}_${parentName}_${paymentName}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, delay);
  };
  const printReceiptList = () => {
    if (!canPrintReceipts) return;
    const previousTitle = document.title;
    const printedAt = window.kvDate(new Date(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }, "");
    document.title = `${window.kvT("All Receipts")} - ${printedAt}`;
    document.documentElement.classList.add("kv-printing-receipts");
    document.body.classList.add("kv-printing-receipts");
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        document.documentElement.classList.remove("kv-printing-receipts");
        document.body.classList.remove("kv-printing-receipts");
        document.title = previousTitle;
      }
    }, 100);
  };
  const formatPhoneForWA = phone => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '60' + cleaned.substring(1);
    }
    return cleaned;
  };
  const sendWhatsApp = p => {
    const s = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id));
    const phone = s?.phone || "";
    if (!phone) {
      window.alert(window.kvT("Parent's phone number is missing for this student."));
      return;
    }
    const waPhone = formatPhoneForWA(phone);
    if (!waPhone) {
      window.alert(window.kvT("Parent's phone number is not valid for WhatsApp."));
      return;
    }
    const amount = parseFloat(p.amount || 0).toFixed(2);
    const receiptItems = p.items?.length ? p.items : [p];
    const months = collectReceiptMonths(receiptItems, s);
    const periodInfo = formatPaymentPeriod(months.join(","));
    const monthStr = periodInfo.label ? `${periodInfo.label}${periodInfo.count > 1 ? ` (${periodInfo.count} ${window.kvT("months")})` : ""}` : "";
    const issuedDate = p.date ? window.kvDate(p.date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }, p.date) : window.kvDate(new Date(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const text = window.kvT("Hello from *{school}*. We have received your payment of RM {amount} for {type}{period}. Thank you. Your receipt number is {receipt}, issued on {date}. Please keep this number for your records.", {
      school: SCHOOL,
      amount,
      type: window.kvT(p.type),
      period: monthStr ? ` (${monthStr})` : '',
      receipt: p.receipt,
      date: issuedDate
    });
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };
  const requestedReceiptId = navigationState?.receiptId || null;
  const resolvedReceipt = selectedReceipt ? selectedReceipt.items?.length ? selectedReceipt : allReceipts.find(r => r.receipt === selectedReceipt.receipt || String(r.id) === String(selectedReceipt.id) || (r.payment_ids || []).map(String).includes(String(selectedReceipt.id))) || selectedReceipt : requestedReceiptId ? allReceipts.find(r => r.receipt === requestedReceiptId || String(r.id) === String(requestedReceiptId) || (r.payment_ids || []).map(String).includes(String(requestedReceiptId))) || null : null;
  if (requestedReceiptId && !resolvedReceipt) {
    return React.createElement("div", {
      className: "kv-page kv-page--receipt-preview"
    }, React.createElement("div", {
      className: "kv-page-header kv-receipt-actions no-print",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 18
      }
    }, React.createElement(Btn, {
      variant: "outline",
      small: true,
      onClick: backToList,
      title: window.kvT("Back to receipts")
    }, React.createElement("i", {
      className: "ti ti-arrow-left",
      "aria-hidden": "true"
    })), React.createElement("h2", {
      className: "kv-page-title"
    }, window.kvT('Receipt Preview'))), React.createElement(Card, {
      style: {
        padding: 40,
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 600,
        color: "var(--color-text-primary)",
        marginBottom: 8
      }
    }, window.kvT("Receipt not found.")), React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-secondary)",
        marginBottom: 20
      }
    }, window.kvT("The requested receipt does not exist or may have been removed.")), React.createElement(Btn, {
      variant: "primary",
      onClick: backToList
    }, window.kvT("Back to Receipts"))));
  }
  if (resolvedReceipt) {
    const sel = resolvedReceipt;
    const s = students.find(x => x.id === sel.student_id || x.id === parseInt(sel.student_id));
    const date = sel.date ? window.kvDate(sel.date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }, sel.date) : window.kvDate(new Date(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const receiptItems = sel.items?.length ? sel.items : [{
      id: sel.id,
      type: sel.type,
      month: sel.month,
      status: sel.status,
      desc: sel.desc || window.kvPaymentItemLabel(sel.type, sel.month),
      amount: parseFloat(sel.amount || 0),
      balance_after: sel.balance_after,
      allocation_json: sel.allocation_json
    }];
    const getItemFullySettledMonths = item => window.kvGetFullySettledReceiptMonths(item);
    const getItemPeriodDetails = item => {
      if (!item) return {
        label: '—',
        count: 0
      };
      if (item.type !== 'Monthly Fee') {
        return {
          label: item.month || '—',
          count: 1
        };
      }
      const settledMonths = getItemFullySettledMonths(item);
      const settledPeriod = formatPaymentPeriod(settledMonths.join(','));
      return settledPeriod.label ? settledPeriod : {
        label: window.kvT('No month fully settled'),
        count: 0
      };
    };
    const monthlyItems = receiptItems.filter(item => item.type === 'Monthly Fee');
    const fullySettledMonths = [...new Set(monthlyItems.flatMap(getItemFullySettledMonths))];
    const formattedOverallPeriod = formatPaymentPeriod(fullySettledMonths.join(','));
    const overallPeriod = monthlyItems.length > 0 ? formattedOverallPeriod.label ? formattedOverallPeriod : {
      label: window.kvT('No month fully settled'),
      count: 0
    } : {
      label: receiptItems[0]?.month || '—',
      count: 1
    };
    const receiptTotal = receiptItems.reduce((total, item) => total + parseFloat(item.amount || 0), 0);
    const annualDueByType = {
      'Annual Registration': parseFloat(feeConfig?.annual?.registration || 0),
      'Books / Materials': parseFloat((feeConfig?.annual?.books || {})[s?.program_age || '5'] || 0),
      'Uniform': parseFloat(feeConfig?.annual?.uniform || 0),
      'Sports Uniform': parseFloat(feeConfig?.annual?.sports_uniform || 0),
      'Tudung': parseFloat(feeConfig?.annual?.tudung || 0),
      'Lawatan': parseFloat(feeConfig?.annual?.lawatan || 0),
      'Sukan': parseFloat(feeConfig?.annual?.sukan || 0),
      'Penyampaian Hadiah': parseFloat(feeConfig?.annual?.hadiah || 0),
      'Pakej Gambar': parseFloat(feeConfig?.annual?.gambar || 0),
      'IQRA Class': parseFloat(feeConfig?.annual?.iqra || 0)
    };
    const hasStoredBalances = receiptItems.length > 0 && receiptItems.every(item => item.balance_after !== null && item.balance_after !== undefined && item.balance_after !== '');
    const storedBalance = hasStoredBalances ? receiptItems.reduce((sum, item) => sum + parseFloat(item.balance_after || 0), 0) : null;
    let receiptBalance = storedBalance;
    if (receiptBalance === null) {
      const studentPayments = (payments || []).filter(p => parseInt(p.student_id) === parseInt(s?.id));
      const nonMonthlyBalance = receiptItems.filter(item => item.type !== 'Monthly Fee' && annualDueByType[item.type] > 0).reduce((balance, item) => {
        const due = annualDueByType[item.type];
        const received = studentPayments.filter(p => p.type === item.type && String(p.month || '') === String(item.month || '') && ['paid', 'advance', 'partial'].includes(String(p.status || '').toLowerCase())).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        return balance + Math.max(0, due - Math.min(due, received));
      }, 0);
      const monthlyBalance = calculateReceiptBalance(receiptItems, s);
      receiptBalance = monthlyBalance === null && nonMonthlyBalance === 0 ? null : (monthlyBalance || 0) + nonMonthlyBalance;
    }
    const receiptStatus = receiptItems.some(item => String(item.status || '').toLowerCase() === 'voided') ? 'Voided' : receiptItems.some(item => String(item.status || '').toLowerCase() === 'partial') || receiptBalance !== null && receiptBalance > 0.005 ? 'Partial' : receiptItems.some(item => String(item.status || '').toLowerCase() === 'advance') ? 'Advance' : 'Paid';
    const isCompactReceipt = receiptItems.length > 1 || receiptItems.some(item => parseAllocationJson(item?.allocation_json).length > 2);
    return React.createElement("div", {
      className: "kv-page kv-page--receipt-preview"
    }, React.createElement("div", {
      className: "kv-page-header kv-receipt-actions no-print",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 18
      }
    }, React.createElement(Btn, {
      variant: "outline",
      small: true,
      onClick: backToList,
      title: window.kvT("Back to receipts")
    }, React.createElement("i", {
      className: "ti ti-arrow-left",
      "aria-hidden": "true"
    })), React.createElement("h2", {
      className: "kv-page-title"
    }, window.kvT('Receipt Preview')), receiptStatus !== 'Voided' && React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => sendWhatsApp(sel),
      style: {
        marginLeft: "auto",
        background: "#25D366",
        color: "#fff",
        border: "none"
      }
    }, React.createElement("i", {
      className: "ti ti-brand-whatsapp",
      "aria-hidden": "true"
    }), " ", window.kvT('Send WhatsApp')), canPrintReceipts && React.createElement(Btn, {
      small: true,
      onClick: () => handlePrint(),
      style: {
        background: C.blue,
        color: "#fff",
        border: "none"
      }
    }, React.createElement("i", {
      className: "ti ti-printer",
      "aria-hidden": "true"
    }), " ", window.kvT('Print / PDF'))), React.createElement("div", {
      className: `print-area kv-receipt-print-area ${isCompactReceipt ? "receipt--compact-print kv-receipt-print-area--compact" : ""}`
    }, React.createElement(Card, {
      className: `kv-receipt-sheet ${isCompactReceipt ? "receipt--compact-print kv-receipt-sheet--compact" : ""}`
    }, React.createElement("div", {
      className: "kv-receipt-top-accent",
      "aria-hidden": "true"
    }), React.createElement("div", {
      className: "kv-receipt-layout"
    }, React.createElement("header", {
      className: "kv-receipt-header"
    }, React.createElement("div", {
      className: "kv-receipt-brand"
    }, React.createElement("div", {
      className: "kv-receipt-document-label"
    }, React.createElement("i", {
      className: "ti ti-receipt",
      "aria-hidden": "true"
    }), " ", window.kvT(receiptStatus === 'Voided' ? 'Voided Receipt' : 'Official Receipt')), React.createElement("div", {
      className: "kv-receipt-school-name",
      "aria-label": SCHOOL
    }, React.createElement("span", {
      className: "kv-receipt-school-name-line"
    }, schoolNameLines[0]), React.createElement("span", {
      className: "kv-receipt-school-name-line"
    }, schoolNameLines[1])), React.createElement("div", {
      className: "kv-receipt-school-address"
    }, "No. 10-G & 12-G, Jalan SP3/2", React.createElement("br", null), "Taman Saujana Puchong", React.createElement("br", null), "47110 Puchong")), React.createElement("div", {
      className: "kv-receipt-meta-card"
    }, React.createElement("div", {
      className: "kv-receipt-meta-title"
    }, window.kvT("RECEIPT DETAILS")), React.createElement("div", {
      className: "kv-receipt-meta-grid"
    }, React.createElement("span", null, window.kvT('Receipt No.:')), React.createElement("strong", {
      className: "kv-receipt-number"
    }, sel.receipt), React.createElement("span", null, window.kvT('Date Issued:')), React.createElement("strong", null, date), React.createElement("span", null, window.kvT('Payment Type:')), React.createElement("strong", null, window.kvT(sel.type))))), React.createElement("section", {
      className: "kv-receipt-student-card"
    }, React.createElement("div", {
      className: "kv-receipt-student-grid"
    }, React.createElement("div", null, React.createElement("div", {
      className: "kv-receipt-field-label"
    }, window.kvT('Student')), React.createElement("div", {
      className: "kv-receipt-field-value"
    }, sel.student_name || s?.name)), React.createElement("div", null, React.createElement("div", {
      className: "kv-receipt-field-label"
    }, window.kvT('Class')), React.createElement("div", {
      className: "kv-receipt-field-value"
    }, sel.student_class || s?.class)), React.createElement("div", null, React.createElement("div", {
      className: "kv-receipt-field-label"
    }, window.kvT('Parent / Guardian')), React.createElement("div", {
      className: "kv-receipt-field-value"
    }, sel.student_parent || s?.parent)), React.createElement("div", null, React.createElement("div", {
      className: "kv-receipt-field-label"
    }, window.kvT('Fee Period')), React.createElement("div", {
      className: "kv-receipt-field-value"
    }, overallPeriod.label || "—", overallPeriod.count > 1 ? ` (${overallPeriod.count} ${window.kvT('months')})` : "")))), overallPeriod.label && React.createElement("div", {
      className: "kv-receipt-period-banner",
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        margin: '16px 0',
        padding: '14px 18px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, #f3edff 0%, #faf8ff 100%)',
        border: '1px solid #dfd2f5'
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: '#7750a8'
      }
    }, window.kvT(monthlyItems.length ? 'Paid Fee Months' : 'Fee months covered')), React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginTop: 3
      }
    }, overallPeriod.label)), overallPeriod.count > 1 && React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: '#7750a8',
        whiteSpace: 'nowrap'
      }
    }, overallPeriod.count, " ", window.kvT('months'))), React.createElement("section", {
      className: "kv-receipt-payment-section"
    }, React.createElement("div", {
      className: "kv-receipt-section-heading"
    }, React.createElement("div", null, React.createElement("span", null, window.kvT('Payment Summary')), React.createElement("small", null, window.kvT('Official payment document'))), React.createElement("span", {
      className: "kv-receipt-paid-badge",
      style: receiptStatus === 'Voided' ? {
        background: '#eeeeee',
        color: '#555555'
      } : receiptStatus === 'Partial' ? {
        background: '#fff3cd',
        color: '#8a5a00'
      } : undefined
    }, React.createElement("i", {
      className: "ti ti-circle-check-filled",
      "aria-hidden": "true"
    }), " ", window.kvT(receiptStatus === 'Voided' ? 'Voided' : receiptStatus === 'Partial' ? 'Partial Payment' : receiptStatus === 'Advance' ? 'Advance Payment' : 'Paid'))), React.createElement("table", {
      className: "kv-receipt-items-table"
    }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, window.kvT('Description')), React.createElement("th", null, window.kvT('Fee Period')), React.createElement("th", null, window.kvT('Amount (RM)')))), React.createElement("tbody", null, receiptItems.map((item, index) => {
      const itemPeriod = getItemPeriodDetails(item);
      return React.createElement("tr", {
        key: item.id || `${item.type}-${index}`
      }, React.createElement("td", null, item.type === 'Monthly Fee' ? window.kvT('Monthly Fee') : item.desc || window.kvPaymentItemLabel(item.type, item.month)), React.createElement("td", null, itemPeriod.label ? `${itemPeriod.label}${itemPeriod.count > 1 ? ` (${itemPeriod.count} ${window.kvT('months')})` : ""}` : "—"), React.createElement("td", null, parseFloat(item.amount || 0).toFixed(2)));
    })), React.createElement("tfoot", null, React.createElement("tr", null, React.createElement("td", {
      colSpan: "2"
    }, window.kvT(receiptStatus === 'Voided' ? 'Voided Amount' : 'Total Received')), React.createElement("td", null, "RM ", receiptTotal.toFixed(2))), receiptStatus !== 'Voided' && receiptBalance !== null && React.createElement("tr", null, React.createElement("td", {
      colSpan: "2",
      style: {
        color: receiptBalance > 0 ? '#8a5a00' : C.green
      }
    }, window.kvT('Total Outstanding Balance')), React.createElement("td", {
      style: {
        color: receiptBalance > 0 ? '#8a5a00' : C.green
      }
    }, "RM ", receiptBalance.toFixed(2)))))), React.createElement("section", {
      className: "kv-receipt-lower-grid"
    }, React.createElement("div", {
      className: "kv-receipt-info-card"
    }, React.createElement("div", {
      className: "kv-receipt-info-icon"
    }, React.createElement("i", {
      className: "ti ti-credit-card",
      "aria-hidden": "true"
    })), React.createElement("div", null, React.createElement("h4", null, window.kvT('Payment Details')), React.createElement("dl", null, React.createElement("div", null, React.createElement("dt", null, window.kvT('Method')), React.createElement("dd", null, window.kvT(sel.method || 'Cash'))), sel.ref ? React.createElement("div", null, React.createElement("dt", null, window.kvT('Ref')), React.createElement("dd", null, sel.ref)) : null, sel.notes ? React.createElement("div", null, React.createElement("dt", null, window.kvT('Notes')), React.createElement("dd", null, sel.notes)) : null))), React.createElement(window.kvReceiptAllocationCard, {
      items: receiptItems,
      receiptStatus,
      student: s
    })), React.createElement("section", {
      className: "kv-receipt-confirmation"
    }, React.createElement("div", {
      className: "kv-receipt-confirmation-mark"
    }, React.createElement("i", {
      className: receiptStatus === "Voided" ? "ti ti-x" : "ti ti-check",
      "aria-hidden": "true"
    })), React.createElement("div", null, React.createElement("span", null, window.kvT(receiptStatus === 'Voided' ? 'Payment Voided' : receiptStatus === 'Partial' ? 'Partial Payment Received' : 'Payment Confirmed')), React.createElement("p", null, window.kvT(receiptStatus === 'Voided' ? 'This payment has been cancelled and is not included in the student paid balance.' : receiptStatus === 'Partial' ? 'This receipt confirms a partial payment. The remaining balance is still outstanding.' : 'This receipt confirms that the payment above has been received and recorded in KinderVault.'))), React.createElement("strong", null, "RM ", receiptTotal.toFixed(2))), React.createElement("footer", {
      className: "kv-receipt-footer"
    }, React.createElement("div", null, React.createElement("strong", null, window.kvT('Generated by KinderVault')), React.createElement("span", null, sel.receipt)), React.createElement("div", {
      className: "kv-receipt-footer-thanks"
    }, window.kvT(receiptStatus === 'Voided' ? 'This receipt is retained for audit purposes only.' : 'Thank you for your payment.')))))));
  }
  return React.createElement("div", {
    className: "kv-page kv-page--receipts"
  }, React.createElement("div", {
    className: "kv-page-header no-print",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }
  }, React.createElement("h2", {
    className: "kv-page-title",
    style: {
      margin: 0
    }
  }, React.createElement("i", {
    className: "ti ti-receipt",
    style: {
      marginRight: 8
    },
    "aria-hidden": "true"
  }), window.kvT('Receipts')), canPrintReceipts && React.createElement(Btn, {
    variant: "outline",
    onClick: printReceiptList,
    style: {
      marginLeft: "auto"
    }
  }, React.createElement("i", {
    className: "ti ti-printer",
    "aria-hidden": "true"
  }), " ", window.kvT("Print"))), React.createElement(Card, {
    className: "kv-table-card"
  }, React.createElement(CardHead, null, React.createElement("div", {
    className: "kv-table-toolbar",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      flexWrap: "wrap",
      gap: 10
    }
  }, React.createElement("div", null, React.createElement("i", {
    className: "ti ti-table",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT('All Receipts'), "\xA0", React.createElement("span", {
    style: {
      background: "var(--color-background-secondary)",
      color: "var(--color-text-secondary)",
      fontSize: 11,
      padding: "1px 7px",
      borderRadius: 10,
      marginLeft: 4
    }
  }, receipts.length)), React.createElement("div", {
    className: "kv-table-filters",
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("i", {
    className: "ti ti-search",
    style: {
      position: "absolute",
      left: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--color-text-tertiary)",
      fontSize: 14
    },
    "aria-hidden": "true"
  }), React.createElement("input", {
    type: "text",
    placeholder: window.kvT('Search student...'),
    value: searchQuery,
    onChange: e => {
      const value = e.target.value;
      setSearchQuery(value);
      replaceRouteState && replaceRouteState({
        search: value
      });
    },
    className: "kv-input",
    style: {
      padding: "6px 10px 6px 30px",
      fontSize: 13,
      borderRadius: 6,
      border: "1px solid var(--color-border-secondary)",
      background: "var(--color-background-primary)",
      color: "var(--color-text-primary)",
      width: 200
    }
  })), React.createElement("select", {
    value: filterType,
    onChange: e => {
      const value = e.target.value;
      setFilterType(value);
      replaceRouteState && replaceRouteState({
        filterType: value
      });
    },
    className: "kv-input",
    style: {
      padding: "6px 10px",
      fontSize: 13,
      borderRadius: 6,
      border: "1px solid var(--color-border-secondary)",
      background: "var(--color-background-primary)",
      color: "var(--color-text-primary)"
    }
  }, React.createElement("option", {
    value: ""
  }, window.kvT('All Types')), receiptTypes.map(t => React.createElement("option", {
    key: t,
    value: t
  }, window.kvT(t))))))), receipts.length ? React.createElement("div", {
    className: "kv-table-scroll",
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    className: "kv-data-table",
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--color-background-secondary)"
    }
  }, [window.kvT('Receipt No.'), window.kvT('Student'), window.kvT('Type'), window.kvT('Amount'), window.kvT('Date'), window.kvT('Status'), window.kvT('Actions')].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: "8px 12px",
      textAlign: "left",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, h)))), React.createElement("tbody", null, receipts.map(p => {
    const s = students.find(x => x.id === p.student_id || x.id === parseInt(p.student_id));
    return React.createElement("tr", {
      key: p.id,
      style: {
        borderBottom: "0.5px solid var(--color-border-tertiary)"
      }
    }, React.createElement("td", {
      style: {
        padding: "9px 12px",
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-text-primary)"
      }
    }, p.receipt), React.createElement("td", {
      style: {
        padding: "9px 12px"
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 500,
        color: "var(--color-text-primary)"
      }
    }, p.student_name || s?.name), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-tertiary)"
      }
    }, p.student_class || s?.class)), React.createElement("td", {
      style: {
        padding: "9px 12px",
        color: "var(--color-text-secondary)"
      }
    }, window.kvT(p.type)), React.createElement("td", {
      style: {
        padding: "9px 12px",
        fontWeight: 500,
        color: C.green
      }
    }, "RM ", parseFloat(p.amount).toFixed(2)), React.createElement("td", {
      style: {
        padding: "9px 12px",
        color: "var(--color-text-secondary)"
      }
    }, p.date ? window.kvDate(p.date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }, p.date) : "–"), React.createElement("td", {
      style: {
        padding: "9px 12px"
      }
    }, statusBadge(p.status)), React.createElement("td", {
      style: {
        padding: "9px 12px"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => open(p)
    }, React.createElement("i", {
      className: "ti ti-eye",
      "aria-hidden": "true"
    }), " ", window.kvT('View')), String(p.status || '').toLowerCase() !== "voided" && React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => sendWhatsApp(p),
      style: {
        background: "#25D366",
        color: "#fff",
        borderColor: "#25D366"
      }
    }, React.createElement("i", {
      className: "ti ti-brand-whatsapp",
      "aria-hidden": "true"
    })), canPrintReceipts && React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => {
        open(p);
        handlePrint(p, 300);
      }
    }, React.createElement("i", {
      className: "ti ti-printer",
      "aria-hidden": "true"
    })))));
  })))) : React.createElement(EmptyState, {
    icon: "receipt",
    text: window.kvT('No receipts yet. Record a payment to generate one.')
  }), "      "), React.createElement("div", {
    className: "print-area kv-receipts-list-print-area",
    "aria-label": window.kvT("All Receipts")
  }, React.createElement("div", {
    className: "kv-receipts-list-print-sheet"
  }, React.createElement("header", {
    className: "kv-list-print-header"
  }, React.createElement("div", null, React.createElement("h1", null, window.kvT("All Receipts")), React.createElement("p", null, window.kvT("Receipts"), " \xB7 ", receipts.length)), React.createElement("span", null, window.kvDate(new Date(), {
    day: "numeric",
    month: "short",
    year: "numeric"
  }))), receipts.length ? React.createElement("table", {
    className: "kv-list-print-table kv-receipts-list-print-table"
  }, React.createElement("thead", null, React.createElement("tr", null, ["Receipt No.", "Student", "Type", "Fee Period", "Amount (RM)", "Date"].map(label => React.createElement("th", {
    key: label
  }, window.kvT(label))))), React.createElement("tbody", null, receipts.map(receipt => {
    const student = students.find(item => item.id === receipt.student_id || item.id === parseInt(receipt.student_id));
    const monthlyMonths = collectReceiptMonths(receipt.items || [receipt], student);
    const period = formatPaymentPeriod(monthlyMonths.join(","));
    return React.createElement("tr", {
      key: receipt.receipt || receipt.id
    }, React.createElement("td", null, React.createElement("strong", null, receipt.receipt || "-")), React.createElement("td", null, React.createElement("strong", null, receipt.student_name || student?.name || "-"), React.createElement("small", null, receipt.student_class || student?.class || "-")), React.createElement("td", null, window.kvT(receipt.type || "-")), React.createElement("td", null, period.label || "-"), React.createElement("td", null, "RM ", parseFloat(receipt.amount || 0).toFixed(2)), React.createElement("td", null, receipt.date ? window.kvDate(receipt.date, {
      day: "numeric",
      month: "short",
      year: "numeric"
    }, receipt.date) : "-"));
  }))) : React.createElement("p", {
    className: "kv-list-print-empty"
  }, window.kvT("No receipts yet. Record a payment to generate one.")))));
};
