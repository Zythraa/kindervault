// ============================================================
// pages/payments.jsx - PaymentsPage component
// ============================================================

const PaymentsPage = ({students, payments, setPayments, setFlash, goReceipt, navigationState = {}, navigationKey, navigate, goBack, replaceRouteState, feeConfig, permissions = [], isAdministrator = false}) => {
  const [view, setView]       = React.useState(navigationState.view || "list");
  const [selected, setSelected] = React.useState(null);
  // Payment Records and Outstanding Dues have separate status and type filters.
  const [recordsStatusF, setRecordsStatusF] = React.useState(navigationState.recordsStatusF || "");
  const [duesStatusF, setDuesStatusF]       = React.useState(navigationState.duesStatusF || "");
  const [recordsTypeF, setRecordsTypeF] = React.useState(navigationState.recordsTypeF || (navigationState.activeTab === "outstanding" ? "" : navigationState.typeF) || "");
  const [duesTypeF, setDuesTypeF] = React.useState(navigationState.duesTypeF || (navigationState.activeTab === "outstanding" ? navigationState.typeF : "") || "");
  const [monthFilter, setMonthFilter] = React.useState(navigationState.monthFilter || navigationState.outstandingMonth || "");
  const [paymentSearch, setPaymentSearch] = React.useState(navigationState.paymentSearch || "");
  const [monthFilterOpen, setMonthFilterOpen] = React.useState(false);
  const monthFilterRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);
  const paymentMutationInFlight = React.useRef(false);
  const paymentRefreshInFlight = React.useRef(false);
  const [paymentRefreshError, setPaymentRefreshError] = React.useState(false);
  const [refreshingPayments, setRefreshingPayments] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(navigationState.activeTab || "records");

  const blankForm = {
    student_id:"", type:"Monthly Fee", amount:"",
    monthFrom: new Date().toISOString().slice(0,7),
    monthTo:   new Date().toISOString().slice(0,7),
    date:  new Date().toISOString().split("T")[0],
    method:"Cash", ref:"", notes:"", status:"Paid"
  };
  const [form, setForm] = React.useState(navigationState.form || blankForm);
  const canCreatePayments = canUsePermission(permissions, "payments.create", isAdministrator);
  const canUpdatePayments = canUsePermission(permissions, "payments.update", isAdministrator);
  const canDeletePayments = canUsePermission(permissions, "payments.delete", isAdministrator);

  const refreshPaymentData = async () => {
    const latestPayments = await api.get("api/payments.php");
    if (latestPayments?.error) throw new Error(latestPayments.error);
    if (!Array.isArray(latestPayments)) throw new Error("Invalid payment data response.");
    setPayments(latestPayments);
    setPaymentRefreshError(false);
    return latestPayments;
  };

  const retryPaymentRefresh = async () => {
    if (paymentRefreshInFlight.current) return;
    paymentRefreshInFlight.current = true;
    setRefreshingPayments(true);
    try {
      await refreshPaymentData();
      setFlash({msg:window.kvT("Payment data refreshed successfully."),type:"success"});
    } catch (error) {
      setFlash({msg:window.kvT("Unable to refresh payment data. Please try again."),type:"danger"});
    } finally {
      paymentRefreshInFlight.current = false;
      setRefreshingPayments(false);
    }
  };

  const paymentFormFromRecord = (payment) => {
    const months = payment.month ? payment.month.split(",").map(month => month.trim()).filter(Boolean) : [];
    return {
      student_id: payment.student_id, type: payment.type, amount: payment.amount,
      monthFrom: months[0] || new Date().toISOString().slice(0,7),
      monthTo: months[months.length-1] || new Date().toISOString().slice(0,7),
      date: payment.date || "", method: payment.method || "Cash",
      ref: payment.ref || "", notes: payment.notes || "", status: payment.status || "Paid"
    };
  };

  React.useEffect(() => {
    const state = navigationState || {};
    const nextView = state.view || "list";
    const selectedPayment = state.paymentId
      ? payments.find(payment => String(payment.id) === String(state.paymentId))
      : null;

    setRecordsStatusF(state.recordsStatusF || "");
    setDuesStatusF(state.duesStatusF || "");
    setRecordsTypeF(state.recordsTypeF || (state.activeTab === "outstanding" ? "" : state.typeF) || "");
    setDuesTypeF(state.duesTypeF || (state.activeTab === "outstanding" ? state.typeF : "") || "");
    setMonthFilter(state.monthFilter || state.outstandingMonth || "");
    setPaymentSearch(state.paymentSearch || "");
    setActiveTab(state.activeTab || "records");
    setSelected(selectedPayment || null);
    if (nextView === "edit" && selectedPayment) setForm(paymentFormFromRecord(selectedPayment));
    if (nextView === "add") setForm(state.form || blankForm);
    setView(nextView === "edit" && !selectedPayment ? "list" : nextView);
  }, [navigationKey]);

  React.useEffect(() => {
    if (!monthFilterOpen) return;
    const closeMonthFilter = event => {
      if (monthFilterRef.current && !monthFilterRef.current.contains(event.target)) setMonthFilterOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === "Escape") setMonthFilterOpen(false);
    };
    document.addEventListener("pointerdown", closeMonthFilter);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMonthFilter);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [monthFilterOpen]);

  // Compute list of YYYY-MM months between form.monthFrom and form.monthTo
  const computeMonths = (from, to) => {
    if (!from || !to) return [];
    const result = [];
    let [fy, fm] = from.split("-").map(Number);
    let [ty, tm] = to.split("-").map(Number);
    if (fy > ty || (fy === ty && fm > tm)) return []; // invalid range
    while (fy < ty || (fy === ty && fm <= tm)) {
      result.push(`${fy}-${String(fm).padStart(2,"0")}`);
      fm++;
      if (fm > 12) { fm = 1; fy++; }
    }
    return result;
  };

  const fmtMonthRange = (monthStr, fallbackDate) => {
    const mStr = monthStr || (fallbackDate ? fallbackDate.substring(0, 7) : "");
    if (!mStr) return "\u2013";
    if (/^\d{4}$/.test(mStr)) return mStr;
    const months = mStr.split(",").map(m=>m.trim()).filter(Boolean);
    if (months.length === 0) return "\u2013";
    const fmt = m => window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m);
    return months.length === 1 ? fmt(months[0]) : `${fmt(months[0])} \u2013 ${fmt(months[months.length-1])}`;
  };

  const types   = ["Monthly Fee","Annual Registration","Books / Materials","Uniform","Sports Uniform","Tudung","Lawatan","Sukan","Penyampaian Hadiah","Pakej Gambar","IQRA Class","Others"];
  const filterTypes = ["Monthly Fee","Annual Registration","Books / Materials","Uniform","Sports Uniform","Tudung","Educational Visit","Sports Day","Awards Ceremony","Photo Package","IQRA Class","Others"];
  const canonicalPaymentType = value => {
    const type = String(value || "").trim().toLowerCase();
    const aliases = {
      "monthly fee":"Monthly Fee",
      "annual registration":"Annual Registration",
      "books / materials":"Books / Materials",
      "books / activity materials":"Books / Materials",
      "books":"Books / Materials",
      "uniform":"Uniform",
      "sports uniform":"Sports Uniform",
      "tudung":"Tudung",
      "educational visit":"Educational Visit",
      "lawatan":"Educational Visit",
      "sports day":"Sports Day",
      "sukan":"Sports Day",
      "awards ceremony":"Awards Ceremony",
      "penyampaian hadiah":"Awards Ceremony",
      "photo package":"Photo Package",
      "pakej gambar":"Photo Package",
      "iqra class":"IQRA Class",
      "kelas iqra":"IQRA Class",
      "iqra":"IQRA Class",
      "others":"Others"
    };
    return aliases[type] || String(value || "").trim();
  };
  const displayPaymentValue = value => {
    const text = String(value ?? "").trim();
    const codes = [...text].map(character => character.codePointAt(0)).join(",");
    return !text || ["226,8364,8220", "226,8364,8221", "226,8364,710,8217"].includes(codes) ? "\u2013" : text;
  };
  const methods = ["Cash","Bank Transfer","QR DuitNow","Cheque"];

  // Status options per tab are intentionally semantically separated.
  const recordsStatusOptions = ["Paid","Partial","Advance","Voided"];
  const duesStatusOptions     = ["Unpaid","Overdue","Partial"];

  const formatPhoneForWA = (phone) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '60' + cleaned.substring(1);
    }
    return cleaned;
  };

  const sendWhatsApp = (p) => {
    const s = students.find(x=>x.id===p.student_id||x.id===parseInt(p.student_id));
    if (!s || !s.phone) {
      setFlash({msg:window.kvT("Parent's phone number is missing for this student."), type:"danger"});
      return;
    }
    const waPhone = formatPhoneForWA(s.phone);
    const amount = parseFloat(p.amount).toFixed(2);
    const isOverdue = p.status === "Overdue";
    const statusText = window.kvT(isOverdue ? "an overdue" : "an unpaid");
    const text = window.kvT("Salam/Hi, this is a gentle reminder from {school} that there is {status} payment of RM {amount} for {student}'s {type} ({period}). Please make the payment at your earliest convenience. Thank you!", {
      school: SCHOOL,
      status: statusText,
      amount,
      student: s.name,
      type: window.kvT(p.type),
      period: fmtMonthRange(p.month, p.date),
    });
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const allocateMonthlyPaidAmounts = (studentPayments, fee) => {
    return window.kvAllocateMonthlyPaidAmounts(studentPayments, fee);
  };

  const getStudentOutstandingDefaults = (studentId) => {
    const st = students.find(x => x.id === +studentId);
    if (!st) return null;
    const fee = window.kvStudentMonthlyFee(st, feeConfig);
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const startMonthStr = st.enrol ? st.enrol.substring(0, 7) : currentMonthStr;
    const allMonths = computeMonths(startMonthStr, currentMonthStr);
    const paidAmounts = window.kvAllocateMonthlyPaidAmounts(payments.filter(p => parseInt(p.student_id) === parseInt(studentId) && p.type === "Monthly Fee"), fee);
    const outstandingMonths = allMonths.filter(m => Math.max(0, fee - (paidAmounts[m] || 0)) > 0.005);
    if (outstandingMonths.length > 0) {
      const amount = outstandingMonths.reduce((sum, m) => sum + Math.max(0, fee - (paidAmounts[m] || 0)), 0);
      return { amount: amount.toFixed(2), monthFrom: outstandingMonths[0], monthTo: outstandingMonths[outstandingMonths.length - 1] };
    }
    return null;
  };

  const computeMonthlyAmount = (studentId, from, to) => {
    const st = students.find(x => x.id === +studentId);
    const months = computeMonths(from, to);
    const fee = st ? window.kvStudentMonthlyFee(st, feeConfig) : 0;
    if (!st || months.length === 0) return "";
    const paidAmounts = window.kvAllocateMonthlyPaidAmounts(payments.filter(p => parseInt(p.student_id) === parseInt(studentId) && p.type === "Monthly Fee"), fee);
    const due = months.reduce((sum, m) => sum + Math.max(0, fee - (paidAmounts[m] || 0)), 0);
    return due.toFixed(2);
  };

  const computeVirtualPayments = () => {
    let totalOverdueAmt = 0;
    const outstandingList = [];

    students.filter(s => s.status === "Active").forEach(s => {
      const studentItems = window.kvComputeStudentOutstanding(s, payments, feeConfig, { groupMonthly: false });
      studentItems.forEach(item => {
        if (item.isOverdue) totalOverdueAmt += item.amount;
        outstandingList.push(item);
      });
    });

    return { outstandingList, totalOverdueAmt };
  };

  const { outstandingList, totalOverdueAmt } = computeVirtualPayments();

  // Payment Records: actual payment transactions only - Paid, Partial, Advance, Voided
  const recordedPayments = payments.filter(p => ["paid", "advance", "partial", "voided"].includes(String(p.status || "").toLowerCase()));

  const paymentMatchesMonth = payment => {
    if (!monthFilter) return true;
    const coveredMonths = String(payment.month || "").split(",").map(month => month.trim()).filter(Boolean);
    if (coveredMonths.includes(monthFilter)) return true;
    return coveredMonths.length === 0 && String(payment.date || "").substring(0, 7) === monthFilter;
  };

  const matchesStudentSearch = (studentId, studentName, receipt = "") => {
    const query = paymentSearch.trim().toLocaleLowerCase();
    if (!query) return true;
    const student = students.find(item => String(item.id) === String(studentId)) || {};
    const searchableValues = [
      studentName,
      student.name,
      student.code,
      student.id,
      receipt,
    ];
    return searchableValues.some(value => String(value ?? "").toLocaleLowerCase().includes(query));
  };

  // Payment Records filtered by per-tab status (only valid transaction statuses)
  const filtered = recordedPayments.filter(p =>
    (!recordsStatusF || String(p.status || "").toLowerCase() === recordsStatusF.toLowerCase()) &&
    (!recordsTypeF || canonicalPaymentType(p.type) === canonicalPaymentType(recordsTypeF)) &&
    paymentMatchesMonth(p) &&
    matchesStudentSearch(p.student_id, p.student_name, p.receipt)
  );
  const totalPaid  = payments.filter(p=>["paid","advance","partial"].includes(String(p.status || "").toLowerCase())).reduce((a,p)=>a+parseFloat(p.amount),0);

  // Outstanding Dues: filter by duesStatusF (only Unpaid / Overdue / Partial)
  const filteredDuesList = outstandingList.filter(item => {
    if (monthFilter) {
      const matchMonth = item.month === monthFilter
        || item.month.split(',').includes(monthFilter)
        || (/^\d{4}$/.test(item.month) && monthFilter.startsWith(item.month));
      if (!matchMonth) return false;
    }
    if (duesStatusF && item.status.toLowerCase() !== duesStatusF.toLowerCase()) return false;
    if (duesTypeF && canonicalPaymentType(item.type) !== canonicalPaymentType(duesTypeF)) return false;
    if (!matchesStudentSearch(item.student_id, item.student_name)) return false;
    return true;
  });

  const displayedOutstandingList = filteredDuesList;

  const listState = () => ({
    recordsStatusF, duesStatusF, recordsTypeF, duesTypeF, monthFilter, activeTab, paymentSearch,
    typeF: activeTab === "outstanding" ? duesTypeF : recordsTypeF
  });
  const updateMonthFilter = value => {
    setMonthFilter(value);
    replaceRouteState && replaceRouteState({monthFilter:value, outstandingMonth:""});
  };
  const printCurrentTab = () => {
    const originalTitle = document.title;
    const printTitle = activeTab === "outstanding" ? window.kvT("Outstanding Dues") : window.kvT("Payment Records");
    document.title = `${printTitle} - KinderVault`;
    document.documentElement.classList.add("kv-printing-payments");
    document.body.classList.add("kv-printing-payments");
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        document.documentElement.classList.remove("kv-printing-payments");
        document.body.classList.remove("kv-printing-payments");
        document.title = originalTitle;
      }
    }, 100);
  };
  const backToList = () => goBack({page:"payments", state:{...listState(), view:"list"}});
  const openAdd = (formOverride) => {
    if (!canCreatePayments) { setFlash({msg:window.kvT("Access Denied. You do not have permission to record payments."),type:"danger"}); return; }
    const nextForm = formOverride && Object.prototype.hasOwnProperty.call(formOverride, "student_id")
      ? formOverride
      : blankForm;
    navigate({page:"payments", state:{...listState(), view:"add", form:nextForm}});
  };
  const openEdit = (p) => {
    if (!canUpdatePayments) { setFlash({msg:window.kvT("Access Denied. You do not have permission to edit payments."),type:"danger"}); return; }
    navigate({page:"payments", state:{...listState(), view:"edit", paymentId:p.id}});
  };

  const save = async () => {
    if (loading || paymentMutationInFlight.current) return;
    if ((view === "add" && !canCreatePayments) || (view === "edit" && !canUpdatePayments)) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to save this payment."),type:"danger"});
      return;
    }
    if (!form.student_id || !form.amount) {
      setFlash({msg:window.kvT("Please select a student and enter an amount."),type:"danger"}); return;
    }
    const paymentAmount = parseFloat(form.amount || 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setFlash({msg:window.kvT("Payment amount must be greater than zero and cannot exceed the selected outstanding balance."),type:"danger"}); return;
    }
    const months = form.type === "Monthly Fee" ? computeMonths(form.monthFrom, form.monthTo) : [];
    if (form.type === "Monthly Fee" && months.length === 0) {
      setFlash({msg:window.kvT("Invalid month range. Make sure 'From' is before or equal to 'To'."),type:"danger"}); return;
    }
    let finalStatus = form.status;
    const selectedDue = form.type === "Monthly Fee"
      ? parseFloat(computeMonthlyAmount(form.student_id, form.monthFrom, form.monthTo) || 0)
      : (() => {
          const st = students.find(x => x.id === +form.student_id);
          if (!st) return 0;
          const items = window.kvComputeStudentOutstanding(st, payments, feeConfig, { groupMonthly: false });
          const match = items.find(it => it.type === form.type);
          return match ? match.amount : 0;
        })();
    if (selectedDue > 0 && paymentAmount > selectedDue + 0.005) {
      setFlash({msg:window.kvT("Payment amount must be greater than zero and cannot exceed the selected outstanding balance."),type:"danger"}); return;
    }
    paymentMutationInFlight.current = true;
    setLoading(true);
    let paymentMonth = form.month;
    if (form.type === "Monthly Fee") {
      paymentMonth = months.join(",");
      if (selectedDue > 0 && parseFloat(form.amount || 0) < selectedDue - 0.005) {
        finalStatus = "Partial";
      } else if (months.length > 1) {
        finalStatus = "Advance";
      } else if (months.length === 1 && (finalStatus === "Advance" || finalStatus === "Partial")) {
        finalStatus = "Paid";
      }
    } else {
      if (!paymentMonth) {
        paymentMonth = (/^\d{4}/.test(form.monthFrom) ? form.monthFrom.slice(0, 4) : String(new Date().getFullYear()));
      }
      if (selectedDue > 0 && parseFloat(form.amount || 0) < selectedDue - 0.005) {
        finalStatus = "Partial";
      } else {
        finalStatus = "Paid";
      }
    }
    const payload = {...form, month: paymentMonth, status: finalStatus};
    try {
      if (view === "add") {
        const res = await api.post('api/payments.php', payload);
        if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
        setPayments(prev=>[res, ...prev]);
        try {
          await refreshPaymentData();
        } catch (error) {
          setPaymentRefreshError(true);
          setFlash({msg:window.kvT("Payment action succeeded, but the latest payment data could not be refreshed. Retry the refresh."),type:"danger"});
          backToList();
          return;
        }
        if (res.receipt) {
          setFlash({msg:window.kvT("Payment recorded. Receipt {receipt} generated.", {receipt: res.receipt}),type:"success"});
          goReceipt(res, {replace:true});
        } else {
          setFlash({msg:window.kvT("Payment recorded successfully."),type:"success"});
          backToList();
        }
      } else {
        const res = await api.put(`api/payments.php?id=${selected.id}`, payload);
        if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
        setPayments(prev=>prev.map(p=>p.id===selected.id?res:p));
        try {
          await refreshPaymentData();
        } catch (error) {
          setPaymentRefreshError(true);
          setFlash({msg:window.kvT("Payment action succeeded, but the latest payment data could not be refreshed. Retry the refresh."),type:"danger"});
          backToList();
          return;
        }
        setFlash({msg:window.kvT("Payment updated successfully."),type:"success"});
        backToList();
      }
    } catch(e) {
      setFlash({msg:window.kvT("Network error. Please try again."),type:"danger"});
    } finally {
      paymentMutationInFlight.current = false;
      setLoading(false);
    }
  };

  const del = async (p) => {
    if (loading || paymentMutationInFlight.current) return;
    if (!canDeletePayments) { setFlash({msg:window.kvT("Access Denied. You do not have permission to delete payments."),type:"danger"}); return; }
    if (!window.confirm(window.kvT("Void this payment? The record and receipt will be retained for audit, but excluded from balances."))) return;
    paymentMutationInFlight.current = true;
    setLoading(true);
    try {
      const res = await api.delete(`api/payments.php?id=${p.id}`);
      if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
      setPayments(prev=>prev.map(x=>x.id===p.id?{...x,status:"Voided"}:x));
      try {
        await refreshPaymentData();
      } catch (error) {
        setPaymentRefreshError(true);
        setFlash({msg:window.kvT("Payment action succeeded, but the latest payment data could not be refreshed. Retry the refresh."),type:"danger"});
        return;
      }
      setFlash({msg:window.kvT("Payment voided and retained for audit."),type:"success"});
    } catch(e) {
      setFlash({msg:window.kvT("Failed to delete payment."),type:"danger"});
    } finally {
      paymentMutationInFlight.current = false;
      setLoading(false);
    }
  };

  const stSelect = (val) => {
    const st = students.find(x=>x.id===+val);
    let nextForm = { ...form, student_id: val };
    if (st && form.type === "Monthly Fee") {
      const owed = getStudentOutstandingDefaults(val);
      if (owed) {
        nextForm = { ...nextForm, amount: owed.amount, monthFrom: owed.monthFrom, monthTo: owed.monthTo };
      } else {
        nextForm = { ...nextForm, amount: "" };
      }
    } else if (st && form.type) {
      const items = window.kvComputeStudentOutstanding(st, payments, feeConfig, { groupMonthly: false });
      const match = items.find(it => it.type === form.type);
      if (match) {
        nextForm = { ...nextForm, amount: match.amount.toFixed(2), month: match.month, monthFrom: match.month, monthTo: match.month };
      }
    }
    setForm(nextForm);
  };

  const handleMonthChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    const months = computeMonths(newForm.monthFrom, newForm.monthTo);
    if (months.length === 0) {
      setFlash({msg:window.kvT("Invalid month range! The 'To' month must be equal to or after the 'From' month."), type:"danger"});
    } else if (months.length > 1) {
      newForm.status = "Advance";
    } else if (months.length === 1 && newForm.status === "Advance") {
      newForm.status = "Paid";
    }
    if (newForm.type === "Monthly Fee" && newForm.student_id && months.length > 0) {
      newForm.amount = computeMonthlyAmount(newForm.student_id, newForm.monthFrom, newForm.monthTo);
    }
    setForm(newForm);
  };

  // Add / Edit form
  const selectedFormDue = (() => {
    if (!form.student_id) return 0;
    if (form.type === "Monthly Fee") {
      return parseFloat(computeMonthlyAmount(form.student_id, form.monthFrom, form.monthTo) || 0);
    }
    const st = students.find(x => x.id === +form.student_id);
    if (!st) return 0;
    const items = window.kvComputeStudentOutstanding(st, payments, feeConfig, { groupMonthly: false });
    const match = items.find(it => it.type === form.type);
    return match ? match.amount : 0;
  })();
  const isPartialFormPayment = selectedFormDue > 0 && parseFloat(form.amount || 0) < selectedFormDue - 0.005;
  if (view === "add" || view === "edit") return (
    <div className="kv-page kv-page--payment-form">
      <div className="kv-page-header" style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <Btn variant="outline" small onClick={backToList} title={window.kvT("Back to payments")}><i className="ti ti-arrow-left" aria-hidden="true"/></Btn>
        <h2 className="kv-page-title">{window.kvT(view==="add" ? "Record New Payment" : "Edit Payment")}</h2>
      </div>
      <Card style={{width:"100%",maxWidth:"none"}}>
        <div className="kv-form-card-body" style={{padding:20}}>
          <div style={{fontSize:11,fontWeight:500,color:C.blue,textTransform:"uppercase",letterSpacing:.8,borderBottom:`2px solid ${C.blue}`,paddingBottom:4,marginBottom:14}}>{window.kvT("Student")}</div>
          <Select label={window.kvT("Select Student *")} value={form.student_id} onChange={e=>stSelect(e.target.value)}
            options={[{value:"",label:window.kvT("- Select student -")},...students.filter(s=>s.status==="Active").sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),undefined,{sensitivity:"base"})).map(s=>({value:s.id,label:`${s.name} (${s.class})`}))]}/>
          <div style={{fontSize:11,fontWeight:500,color:C.blue,textTransform:"uppercase",letterSpacing:.8,borderBottom:`2px solid ${C.blue}`,paddingBottom:4,marginBottom:14}}>{window.kvT("Payment Details")}</div>
          <div className="kv-form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Select label={window.kvT("Payment Type *")} value={form.type} onChange={e=>{
              const nextType = e.target.value;
              let nextForm = { ...form, type: nextType };
              if (nextType === "Monthly Fee" && form.student_id) {
                nextForm.amount = computeMonthlyAmount(form.student_id, form.monthFrom, form.monthTo);
              } else if (form.student_id) {
                const st = students.find(x=>x.id===+form.student_id);
                if (st) {
                  const items = window.kvComputeStudentOutstanding(st, payments, feeConfig, { groupMonthly: false });
                  const match = items.find(it => it.type === nextType);
                  if (match) {
                    nextForm.amount = match.amount.toFixed(2);
                    nextForm.month = match.month;
                    nextForm.monthFrom = match.month;
                    nextForm.monthTo = match.month;
                  }
                }
              }
              setForm(nextForm);
            }} options={types.map(t=>({value:t,label:window.kvT(t)}))}/>
          </div>
          {form.type==="Monthly Fee" && (() => {
            const months = computeMonths(form.monthFrom, form.monthTo);
            return (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>{window.kvT('Fee Period')} <span style={{fontWeight:400,color:"var(--color-text-tertiary)"}}>{window.kvT('(select from -> to month; all months in range are included)')}</span></div>
                <div className="kv-month-range" style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:3}}>{window.kvT('From')}</div>
                    <input type="month" value={form.monthFrom} onChange={e=>handleMonthChange('monthFrom', e.target.value)}
                       style={{width:"100%",padding:"7px 10px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{color:"var(--color-text-tertiary)",paddingTop:18,fontSize:18}}>{"\u2192"}</div>
                  <div>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:3}}>{window.kvT('To')}</div>
                    <input type="month" value={form.monthTo} onChange={e=>handleMonthChange('monthTo', e.target.value)}
                       style={{width:"100%",padding:"7px 10px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}}/>
                  </div>
                </div>
                {months.length > 0 ? (
                  <div style={{marginTop:8,padding:"8px 12px",background:"var(--color-background-secondary)",borderRadius:8,fontSize:12,color:C.blue}}>
                    <i className="ti ti-calendar-check" style={{marginRight:5}} aria-hidden="true"/>
                    <strong>{window.kvT("{count} month(s) selected: {months}", {count: months.length, months: months.map(m=>window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m)).join(" \u00b7 ")})}</strong>
                  </div>
                ) : (
                  <div style={{marginTop:8,fontSize:12,color:"var(--color-text-tertiary)"}}><i className="ti ti-alert-circle" style={{marginRight:4}} aria-hidden="true"/>{window.kvT("Invalid range - 'From' must be before or equal to 'To'.")}</div>
                )}
              </div>
            );
          })()}
          {selectedFormDue > 0 && <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",marginBottom:12,borderRadius:8,background:"var(--color-background-secondary)",fontSize:13}}><span>{window.kvT("Outstanding Balance")}</span><strong style={{color:C.amber}}>RM {selectedFormDue.toFixed(2)}</strong></div>}
          <div className="kv-form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:4}}>{window.kvT('Amount (RM) *')}</div>
              <div className="kv-money-input" style={{display:"flex"}}>
                <span style={{padding:"7px 10px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-secondary)",borderRight:"none",borderRadius:"7px 0 0 7px",fontSize:13,color:"var(--color-text-secondary)"}}>RM</span>
                <input className="kv-form-control" type="number" min="0.01" max={selectedFormDue > 0 ? selectedFormDue.toFixed(2) : undefined} step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{flex:1,padding:"7px 10px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:"0 7px 7px 0",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
              </div>
            </div>
            <Input label={window.kvT('Payment Date')} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          </div>
          <div className="kv-form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Select label={window.kvT('Payment Method')} value={form.method} onChange={e=>setForm({...form,method:e.target.value})} options={methods.map(m=>({value:m,label:window.kvT(m)}))}/>
            <Input label={window.kvT('Reference No.')} value={form.ref} onChange={e=>setForm({...form,ref:e.target.value})} placeholder={window.kvT('Bank ref / slip no.')}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
            <Input label={window.kvT('Notes')} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={window.kvT('Any additional notes...')}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <Btn variant="amber" onClick={save} disabled={loading} style={{opacity:loading?0.6:1}}>
              {loading ? <><i className="ti ti-loader" aria-hidden="true"/> {window.kvT('Saving...')}</> : (view==="add" ? <><i className="ti ti-receipt" aria-hidden="true"/> {(form.status === "Paid" || form.status === "Advance" || form.status === "Partial") ? window.kvT('Save & Generate Receipt') : window.kvT('Save Payment')}</> : <><i className="ti ti-device-floppy" aria-hidden="true"/> {window.kvT('Update Payment')}</>)}
            </Btn>
            <Btn variant="outline" onClick={backToList}>{window.kvT('Cancel')}</Btn>
          </div>
        </div>
      </Card>
    </div>
  );

  // List view
  const selectStyle = {padding:"6px 10px",fontSize:12,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-secondary)"};

  return (
    <div className="kv-page kv-page--payments">
      <div className="kv-page-header" style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 className="kv-page-title"><i className="ti ti-credit-card" style={{marginRight:8}} aria-hidden="true"/>{window.kvT("Payments")}</h2>
        {canCreatePayments && <Btn onClick={openAdd} variant="amber" style={{marginLeft:"auto"}}><i className="ti ti-plus" aria-hidden="true"/> {window.kvT("Record Payment")}</Btn>}
      </div>
      {paymentRefreshError && <div role="alert" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 14px",marginBottom:16,borderRadius:8,border:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:13}}>
        <span>{window.kvT("Payment action succeeded, but the latest payment data could not be refreshed. Retry the refresh.")}</span>
        <Btn small variant="outline" onClick={retryPaymentRefresh} disabled={refreshingPayments || loading}>
          {refreshingPayments ? <><i className="ti ti-loader" aria-hidden="true"/> {window.kvT("Refreshing...")}</> : window.kvT("Retry refresh")}
        </Btn>
      </div>}

      {/* Summary cards */}
      <div className="kv-payment-summary-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
        {[
          {label:"Total Collected",val:`RM ${totalPaid.toFixed(2)}`,icon:"cash",        bg:`linear-gradient(135deg,${C.green},#1a7a2e)`},
          {label:"Total Overdue", val:`RM ${totalOverdueAmt.toFixed(2)}`,icon:"alert-circle", bg:`linear-gradient(135deg,${C.red},#a01020)`},
          {label:"Total Records", val:payments.length,               icon:"list",          bg:`linear-gradient(135deg,${C.blue},${C.blueD})`},
        ].map(k=>(
          <div key={k.label} className="kv-payment-summary-card" style={{borderRadius:12,padding:"14px 18px",color:"#fff",position:"relative",overflow:"hidden",background:k.bg}}>
            <div style={{fontSize:20,fontWeight:700}}>{k.val}</div>
            <div style={{fontSize:11,opacity:.85,marginTop:2}}>{window.kvT(k.label)}</div>
            <i className={`ti ti-${k.icon}`} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:34,opacity:.18}} aria-hidden="true"/>
          </div>
        ))}
      </div>

      <div className="kv-tab-row no-print" style={{display:"flex",gap:12,marginBottom:16}}>
        <Btn variant={activeTab==="records"?"amber":"outline"} onClick={()=>{setActiveTab("records");replaceRouteState && replaceRouteState({activeTab:"records"});}}><i className="ti ti-list" aria-hidden="true"/> {window.kvT("Payment Records")}</Btn>
        <Btn variant={activeTab==="outstanding"?"amber":"outline"} onClick={()=>{setActiveTab("outstanding");replaceRouteState && replaceRouteState({activeTab:"outstanding"});}}><i className="ti ti-alert-circle" aria-hidden="true"/> {window.kvT("Outstanding Dues")} <span style={{background:activeTab==="outstanding"?"rgba(255,255,255,0.2)":"var(--color-background-secondary)",color:activeTab==="outstanding"?"#fff":"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{displayedOutstandingList.length}</span></Btn>
        <div className="kv-payment-list-actions">
          <div className="kv-payment-month-picker" ref={monthFilterRef}>
            <Btn variant={monthFilter?"amber":"outline"} onClick={()=>setMonthFilterOpen(open=>!open)} aria-expanded={monthFilterOpen} aria-haspopup="dialog">
              <i className="ti ti-calendar-month" aria-hidden="true"/> {monthFilter ? fmtMonthRange(monthFilter) : window.kvT("Month / Year")}
              <i className={"ti ti-chevron-" + (monthFilterOpen?"up":"down")} aria-hidden="true"/>
            </Btn>
            {monthFilterOpen && (
              <div className="kv-payment-month-popover" role="dialog" aria-label={window.kvT("Month / Year")}>
                <label htmlFor="payment-month-filter">{window.kvT("Month / Year")}</label>
                <input id="payment-month-filter" type="month" value={monthFilter} onChange={e=>{updateMonthFilter(e.target.value);setMonthFilterOpen(false);}} autoFocus/>
                {monthFilter && <button type="button" className="kv-payment-month-clear" onClick={()=>{updateMonthFilter("");setMonthFilterOpen(false);}}><i className="ti ti-x" aria-hidden="true"/> {window.kvT("Show all months")}</button>}
              </div>
            )}
          </div>
          <Btn variant="outline" onClick={printCurrentTab}><i className="ti ti-printer" aria-hidden="true"/> {window.kvT("Print")}</Btn>
        </div>
      </div>

      <div className="kv-payments-filter-toolbar no-print">
          <div className="kv-payments-filter-search">
            <i className="ti ti-search" aria-hidden="true" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-tertiary)",pointerEvents:"none"}}/>
            <input
              type="search"
              value={paymentSearch}
              onChange={event=>setPaymentSearch(event.target.value)}
              placeholder={window.kvT("Search student name or ID...")}
              aria-label={window.kvT("Search student name or ID...")}
              style={{width:"100%",boxSizing:"border-box",padding:"8px 36px 8px 34px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}
            />
            {paymentSearch && <button
              type="button"
              onClick={()=>setPaymentSearch("")}
              aria-label={window.kvT("Clear")}
              title={window.kvT("Clear")}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",border:0,background:"transparent",color:"var(--color-text-tertiary)",cursor:"pointer",padding:4,lineHeight:1}}
            ><i className="ti ti-x" aria-hidden="true"/></button>}
          </div>
          <select
            id={activeTab === "records" ? "records-status-filter" : "dues-status-filter"}
            className="kv-payments-filter-select"
            value={activeTab === "records" ? recordsStatusF : duesStatusF}
            onChange={event=>{
              const value=event.target.value;
              if (activeTab === "records") {
                setRecordsStatusF(value);
                replaceRouteState && replaceRouteState({recordsStatusF:value});
              } else {
                setDuesStatusF(value);
                replaceRouteState && replaceRouteState({duesStatusF:value});
              }
            }}
            style={selectStyle}
            aria-label={window.kvT("Filter by status")}
          >
            <option value="">{window.kvT("All Status")}</option>
            {(activeTab === "records" ? recordsStatusOptions : duesStatusOptions).map(status=><option key={status} value={status}>{window.kvT(status)}</option>)}
          </select>
          <select
            id={activeTab === "records" ? "records-type-filter" : "dues-type-filter"}
            className="kv-payments-filter-select"
            value={activeTab === "records" ? recordsTypeF : duesTypeF}
            onChange={event=>{
              const value=event.target.value;
              if (activeTab === "records") {
                setRecordsTypeF(value);
                replaceRouteState && replaceRouteState({recordsTypeF:value,typeF:value});
              } else {
                setDuesTypeF(value);
                replaceRouteState && replaceRouteState({duesTypeF:value,typeF:value});
              }
            }}
            style={selectStyle}
            aria-label={window.kvT("Filter by type")}
          >
            <option value="">{window.kvT("All Types")}</option>
            {filterTypes.map(type=><option key={type} value={type}>{window.kvT(type)}</option>)}
          </select>
          {((activeTab === "records" && (recordsStatusF || recordsTypeF)) || (activeTab === "outstanding" && (duesStatusF || duesTypeF))) &&
            <Btn variant="outline" small onClick={()=>{
              if (activeTab === "records") {
                setRecordsStatusF("");
                setRecordsTypeF("");
                replaceRouteState && replaceRouteState({recordsStatusF:"",recordsTypeF:"",typeF:""});
              } else {
                setDuesStatusF("");
                setDuesTypeF("");
                replaceRouteState && replaceRouteState({duesStatusF:"",duesTypeF:"",typeF:""});
              }
            }}>{window.kvT("Clear")}</Btn>}
      </div>

      {activeTab === "records" ? (
        <>
          <Card className="kv-table-card print-area kv-payments-print-area">
            <div className="kv-payments-print-header">
              <strong>KinderVault</strong>
              <span>{window.kvT("Payment Records")}{monthFilter ? " - " + fmtMonthRange(monthFilter) : ""}</span>
            </div>
            {/* Context hint for Payment Records */}
            <div style={{padding:"8px 16px 4px",fontSize:11,color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",gap:5,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <i className="ti ti-info-circle" aria-hidden="true"/>
              {window.kvT("Transaction history — actual payments received. A Partial status means the payment only partially settled the obligation.")}
            </div>
            <CardHead><i className="ti ti-table" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Payment Records")} <span style={{background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{filtered.length}</span></CardHead>
            {filtered.length ? (
              <div className="kv-table-scroll" style={{overflowX:"auto"}}>
                <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--color-background-secondary)"}}>
                      {["Student","Payment Type","Period","Amount Paid","Date","Method","Status","Receipt",""].map(h=>(
                        <th key={h} className={!h?"no-print":""} style={{padding:"8px 12px",textAlign:h==="Amount Paid"?"right":"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{window.kvT(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p=>{
                      const s = students.find(x=>x.id===p.student_id||x.id===parseInt(p.student_id));
                      return (
                        <tr key={p.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                          <td style={{padding:"9px 12px"}}>
                            <div style={{fontWeight:500,color:"var(--color-text-primary)"}}>{displayPaymentValue(p.student_name || s?.name)}</div>
                            <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{p.student_class||s?.class}</div>
                          </td>
                          <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{window.kvT(p.type)}</td>
                          <td style={{padding:"9px 12px",color:"var(--color-text-secondary)",fontSize:11,maxWidth:180}}>{fmtMonthRange(p.month, p.date)}</td>
                          <td style={{padding:"9px 12px",textAlign:"right",fontWeight:500,color:p.status==="Voided"?"var(--color-text-tertiary)":C.green}}>
                            <span style={{textDecoration:p.status==="Voided"?"line-through":undefined}}>RM {parseFloat(p.amount).toFixed(2)}</span>
                          </td>
                          <td style={{padding:"9px 12px",color:"var(--color-text-secondary)",fontSize:11}}>{p.date ? window.kvDate(p.date, {day:'numeric', month:'short', year:'numeric'}, p.date) : "\u2013"}</td>
                          <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{window.kvT(displayPaymentValue(p.method))}</td>
                          <td style={{padding:"9px 12px"}}>{statusBadge(p.status)}</td>
                          <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11}}>
                            {displayPaymentValue(p.receipt) !== "\u2013" ? (
                              <button type="button" onClick={()=>goReceipt(p)} style={{background:"none",border:"none",padding:0,color:"var(--color-primary, #6b3fa0)",fontFamily:"inherit",fontSize:"inherit",fontWeight:500,cursor:"pointer",textDecoration:"underline"}} title={window.kvT("View Receipt")}>
                                {displayPaymentValue(p.receipt)}
                              </button>
                            ) : (
                              <span style={{color:"var(--color-text-tertiary)"}}>{"\u2013"}</span>
                            )}
                          </td>
                          <td className="no-print" style={{padding:"9px 12px"}}>
                            <div style={{display:"flex",gap:4}}>
                              {p.receipt&&<Btn small variant="outline" onClick={()=>goReceipt(p)}><i className="ti ti-receipt" aria-hidden="true"/> {window.kvT("View")}</Btn>}
                              {canUpdatePayments && !["Paid","Advance","Partial","Voided"].includes(p.status) && <Btn small variant="outline" onClick={()=>openEdit(p)} title={window.kvT("Edit payment")}><i className="ti ti-edit" aria-hidden="true"/></Btn>}
                              {canDeletePayments && p.status !== "Voided" && <Btn small variant="danger" onClick={()=>del(p)} title={window.kvT("Void payment")}><i className="ti ti-ban" aria-hidden="true"/></Btn>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : paymentSearch.trim()
              ? <EmptyState icon="search" text={window.kvT("No matching payment records found.")}/>
              : <EmptyState icon="credit-card" text={window.kvT("No payment records found.")} action={canCreatePayments ? <Btn onClick={openAdd} variant="amber" style={{marginTop:12}}><i className="ti ti-plus" aria-hidden="true"/> {window.kvT("Record First Payment")}</Btn> : null}/>}
          </Card>
        </>
      ) : (
        <Card className="kv-table-card print-area kv-payments-print-area">
          <div className="kv-payments-print-header">
            <strong>KinderVault</strong>
            <span>{window.kvT("Outstanding Dues")}{monthFilter ? " - " + fmtMonthRange(monthFilter) : ""}</span>
          </div>

          {/* Context hint for Outstanding Dues */}
          <div style={{padding:"8px 16px 4px",fontSize:11,color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",gap:5,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <i className="ti ti-info-circle" aria-hidden="true"/>
            {window.kvT("Remaining obligations — fees still owed. A Partial status means the obligation has been partially paid and the remaining balance is still outstanding.")}
          </div>

          <CardHead><i className="ti ti-alert-circle" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Outstanding Dues")} <span style={{background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{displayedOutstandingList.length}</span></CardHead>
          {displayedOutstandingList.length ? (
            <div className="kv-table-scroll" style={{overflowX:"auto"}}>
              <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"var(--color-background-secondary)"}}>
                    {["Student","Payment Type","Period","Original Due","Paid","Outstanding Balance","Status",""].map(h=>(
                      <th key={h} className={!h?"no-print":""} style={{padding:"8px 12px",textAlign:h==="Outstanding Balance"||h==="Paid"||h==="Original Due"?"right":"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{window.kvT(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedOutstandingList.map(out => (
                    <tr key={`${out.student_id}-${out.id}`} style={{borderBottom:"0.5px solid var(--color-border-tertiary)",background:out.status==="Overdue"?"rgba(220,50,50,0.03)":out.status==="Partial"?"rgba(245,160,0,0.03)":undefined}}>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{fontWeight:500,color:"var(--color-text-primary)"}}>{out.student_name}</div>
                        <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{out.student_class}</div>
                      </td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{window.kvT(out.type)}</td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)",fontSize:11}}>{fmtMonthRange(out.month)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",color:"var(--color-text-secondary)"}}>RM {out.originalDue.toFixed(2)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontWeight:500,color:C.green}}>RM {out.paidAmount.toFixed(2)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,color:out.status==="Partial"?C.amber:out.status==="Overdue"?C.red:"var(--color-text-primary)"}}>RM {out.amount.toFixed(2)}</td>
                      <td style={{padding:"9px 12px"}}>{statusBadge(out.status)}</td>
                      <td className="no-print" style={{padding:"9px 12px",textAlign:"right"}}>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                          {canCreatePayments && <Btn small style={{background:"#25D366",color:"white",borderColor:"#25D366"}} onClick={()=>sendWhatsApp(out)}><i className="ti ti-brand-whatsapp" aria-hidden="true"/> {window.kvT("Send")}</Btn>}
                          {canCreatePayments && <Btn small variant="amber" onClick={()=>openAdd({...blankForm, student_id: out.student_id, type: out.type, amount: out.amount.toFixed(2), month: out.month, monthFrom: out.month, monthTo: out.month, target_payment_id: out.target_payment_id || undefined})}><i className="ti ti-cash" aria-hidden="true"/> {window.kvT("Pay")}</Btn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : paymentSearch.trim() ? (
            <div style={{padding:40,textAlign:"center",color:"var(--color-text-tertiary)"}}>
              <i className="ti ti-search" style={{fontSize:32,marginBottom:8}} aria-hidden="true"/><br/>
              {window.kvT("No matching outstanding dues found.")}
            </div>
          ) : (
            <div style={{padding:40,textAlign:"center",color:"var(--color-text-tertiary)"}}>
              <i className="ti ti-check" style={{fontSize:32,color:C.green,marginBottom:8}} aria-hidden="true"/><br/>
              {duesTypeF
                ? window.kvT("No outstanding dues found for the selected payment type.")
                : (duesStatusF ? window.kvT("No outstanding dues found.") : window.kvT("No outstanding dues! All active students have paid up to date."))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
