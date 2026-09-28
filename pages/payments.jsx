// ============================================================
// pages/payments.jsx  –  PaymentsPage component
// ============================================================

const PaymentsPage = ({students, payments, setPayments, setFlash, goReceipt, navigationState = {}, navigationKey, navigate, goBack, replaceRouteState, feeConfig, permissions = [], isAdministrator = false}) => {
  const [view, setView]       = React.useState(navigationState.view || "list");
  const [selected, setSelected] = React.useState(null);
  const [statusF, setStatusF] = React.useState(navigationState.statusF || "");
  const [typeF, setTypeF]     = React.useState(navigationState.typeF || "");
  const [monthFilter, setMonthFilter] = React.useState(navigationState.monthFilter || navigationState.outstandingMonth || "");
  const [monthFilterOpen, setMonthFilterOpen] = React.useState(false);
  const monthFilterRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);
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

    setStatusF(state.statusF || "");
    setTypeF(state.typeF || "");
    setMonthFilter(state.monthFilter || state.outstandingMonth || "");
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
    if (!mStr) return "–";
    const months = mStr.split(",").map(m=>m.trim()).filter(Boolean);
    if (months.length === 0) return "–";
    const fmt = m => window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m);
    return months.length === 1 ? fmt(months[0]) : `${fmt(months[0])} – ${fmt(months[months.length-1])}`;
  };

  const types   = ["Monthly Fee","Annual Registration","Books / Materials","Uniform","Sports Uniform","Tudung","Lawatan","Sukan","Penyampaian Hadiah","Pakej Gambar","IQRA Class","Others"];
  const methods = ["Cash","Bank Transfer","QR DuitNow","Cheque"];

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
    const paidAmounts = {};
    studentPayments.filter(p => p.type === "Monthly Fee" && (p.status === "Paid" || p.status === "Advance" || p.status === "Partial")).forEach(p => {
      const months = (p.month || "").split(",").map(m => m.trim()).filter(Boolean);
      let remaining = parseFloat(p.amount || 0);
      months.forEach(m => {
        if (remaining <= 0) return;
        const already = parseFloat(paidAmounts[m] || 0);
        const payable = Math.min(Math.max(fee - already, 0), remaining);
        if (payable > 0) {
          paidAmounts[m] = already + payable;
          remaining -= payable;
        }
      });
    });
    return paidAmounts;
  };

  const getStudentOutstandingDefaults = (studentId) => {
    const st = students.find(x => x.id === +studentId);
    if (!st) return null;
    const fee = parseFloat(st.fee || 0);
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const startMonthStr = st.enrol ? st.enrol.substring(0, 7) : currentMonthStr;
    const allMonths = computeMonths(startMonthStr, currentMonthStr);
    const paidAmounts = allocateMonthlyPaidAmounts(payments.filter(p => parseInt(p.student_id) === parseInt(studentId) && p.type === "Monthly Fee"), fee);
    const outstandingMonths = allMonths.filter(m => Math.max(0, fee - (paidAmounts[m] || 0)) > 0);
    if (outstandingMonths.length > 0) {
      const amount = outstandingMonths.reduce((sum, m) => sum + Math.max(0, fee - (paidAmounts[m] || 0)), 0);
      return { amount: amount.toFixed(2), monthFrom: outstandingMonths[0], monthTo: outstandingMonths[outstandingMonths.length - 1] };
    }
    return { amount: fee.toFixed(2), monthFrom: currentMonthStr, monthTo: currentMonthStr };
  };

  const computeMonthlyAmount = (studentId, from, to) => {
    const st = students.find(x => x.id === +studentId);
    const months = computeMonths(from, to);
    const fee = st ? parseFloat(st.fee || 0) : 0;
    if (!st || months.length === 0) return "";
    const paidAmounts = allocateMonthlyPaidAmounts(payments.filter(p => parseInt(p.student_id) === parseInt(studentId) && p.type === "Monthly Fee"), fee);
    const due = months.reduce((sum, m) => sum + Math.max(0, fee - (paidAmounts[m] || 0)), 0);
    return (due > 0 ? due : months.length * fee).toFixed(2);
  };

  const computeVirtualPayments = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthStr = `${currentYear}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const studentById = Object.fromEntries(students.map(s => [s.id, s]));

    const paidAmountsByStudent = {};
    payments.forEach(p => {
      if (p.type === "Monthly Fee" && (p.status === "Paid" || p.status === "Advance" || p.status === "Partial")) {
        const stId = parseInt(p.student_id);
        const st = studentById[stId];
        if (!st) return;
        const fee = parseFloat(st.fee || 0);
        if (!paidAmountsByStudent[stId]) paidAmountsByStudent[stId] = {};
        const months = (p.month || "").split(",").map(m => m.trim()).filter(Boolean);
        let remaining = parseFloat(p.amount || 0);
        months.forEach(m => {
          if (remaining <= 0) return;
          const already = parseFloat(paidAmountsByStudent[stId][m] || 0);
          const payable = Math.min(Math.max(fee - already, 0), remaining);
          if (payable > 0) {
            paidAmountsByStudent[stId][m] = already + payable;
            remaining -= payable;
          }
        });
      }
    });

    let totalOverdueAmt = 0;
    const outstandingList = [];
    const virtualRecords = [];

    students.filter(s => s.status === "Active").forEach(s => {
      let startMonthStr = s.enrol ? s.enrol.substring(0, 7) : `${currentYear}-01`;
      let [sy, sm] = startMonthStr.split("-").map(Number);
      let [cy, cm] = currentMonthStr.split("-").map(Number);
      const fee = parseFloat(s.fee || 0);
      const paidAmounts = paidAmountsByStudent[s.id] || {};

      const missingEntries = [];
      while (sy < cy || (sy === cy && sm <= cm)) {
        const mStr = `${sy}-${String(sm).padStart(2,'0')}`;
        const due = Math.max(0, fee - (paidAmounts[mStr] || 0));
        if (due > 0) {
          missingEntries.push({ month: mStr, due });
        }
        sm++;
        if (sm > 12) { sm = 1; sy++; }
      }

      if (missingEntries.length > 0) {
        const overdueEntries = missingEntries.filter(m => m.month < currentMonthStr);
        if (overdueEntries.length > 0) {
          const amountOwning = overdueEntries.reduce((sum, item) => sum + item.due, 0);
          totalOverdueAmt += amountOwning;
          outstandingList.push({
            student: s,
            missingMonths: missingEntries.map(item => item.month),
            overdueMonths: overdueEntries.map(item => item.month),
            overdueEntries,
            amountOwning
          });
        }

        missingEntries.forEach(item => {
          const isOverdue = item.month < currentMonthStr;
          virtualRecords.push({
            id: "virt_" + s.id + "_" + item.month,
            student_id: s.id,
            student_name: s.name,
            student_class: s.class,
            type: "Monthly Fee",
            month: item.month,
            amount: item.due,
            date: "",
            method: "",
            status: isOverdue ? "Overdue" : "Unpaid",
            receipt: "",
            isVirtual: true
          });
        });
      }
    });
    return { outstandingList, totalOverdueAmt, virtualRecords };
  };

  const { outstandingList, totalOverdueAmt, virtualRecords } = computeVirtualPayments();
  // Stored Unpaid/Overdue rows are legacy obligation snapshots. The virtual
  // rows are the authoritative remaining balances, so avoid showing both.
  const recordedPayments = payments.filter(p => !(p.type === "Monthly Fee" && (p.status === "Unpaid" || p.status === "Overdue")));
  const allPayments = [...recordedPayments, ...virtualRecords];
  const displayedOutstandingList = monthFilter
    ? outstandingList.map(out => {
        const selectedEntry = out.overdueEntries.find(entry => entry.month === monthFilter);
        return selectedEntry ? {
          ...out,
          overdueMonths: [selectedEntry.month],
          overdueEntries: [selectedEntry],
          amountOwning: selectedEntry.due
        } : null;
      }).filter(Boolean)
    : outstandingList;

  const paymentMatchesMonth = payment => {
    if (!monthFilter) return true;
    const coveredMonths = String(payment.month || "").split(",").map(month => month.trim()).filter(Boolean);
    if (coveredMonths.includes(monthFilter)) return true;
    return coveredMonths.length === 0 && String(payment.date || "").substring(0, 7) === monthFilter;
  };
  const filtered = allPayments.filter(p => (!statusF || p.status === statusF) && (!typeF || p.type === typeF) && paymentMatchesMonth(p));
  const totalPaid  = payments.filter(p=>p.status==="Paid" || p.status==="Advance" || p.status==="Partial").reduce((a,p)=>a+parseFloat(p.amount),0);

  const listState = () => ({statusF, typeF, monthFilter, activeTab});
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
    if (loading) return;
    if ((view === "add" && !canCreatePayments) || (view === "edit" && !canUpdatePayments)) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to save this payment."),type:"danger"});
      return;
    }
    if (!form.student_id || !form.amount) {
      setFlash({msg:window.kvT("Please select a student and enter an amount."),type:"danger"}); return;
    }
    const months = form.type === "Monthly Fee" ? computeMonths(form.monthFrom, form.monthTo) : [];
    if (form.type === "Monthly Fee" && months.length === 0) {
      setFlash({msg:window.kvT("Invalid month range. Make sure 'From' is before or equal to 'To'."),type:"danger"}); return;
    }
    setLoading(true);
    let finalStatus = form.status;
    const selectedDue = form.type === "Monthly Fee" ? parseFloat(computeMonthlyAmount(form.student_id, form.monthFrom, form.monthTo) || 0) : 0;
    if (form.type === "Monthly Fee" && selectedDue > 0 && parseFloat(form.amount || 0) < selectedDue - 0.005) {
      finalStatus = "Partial";
    } else if (form.type === "Monthly Fee" && months.length > 1) {
      finalStatus = "Advance";
    } else if (form.type === "Monthly Fee" && months.length === 1 && (finalStatus === "Advance" || finalStatus === "Partial")) {
      finalStatus = "Paid";
    }
    const payload = {...form, month: months.join(","), status: finalStatus};
    try {
      if (view === "add") {
        const res = await api.post('api/payments.php', payload);
        if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
        setPayments(prev=>[res, ...prev]);
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
        setFlash({msg:window.kvT("Payment updated successfully."),type:"success"});
        backToList();
      }
    } catch(e) {
      setFlash({msg:window.kvT("Network error. Please try again."),type:"danger"});
    } finally {
      setLoading(false);
    }
  };

  const del = async (p) => {
    if (!canDeletePayments) { setFlash({msg:window.kvT("Access Denied. You do not have permission to delete payments."),type:"danger"}); return; }
    if (!window.confirm(window.kvT("Void this payment? The record and receipt will be retained for audit, but excluded from balances."))) return;
    try {
      const res = await api.delete(`api/payments.php?id=${p.id}`);
      if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
      setPayments(prev=>prev.map(x=>x.id===p.id?{...x,status:"Voided"}:x));
      setFlash({msg:window.kvT("Payment voided and retained for audit."),type:"success"});
    } catch(e) {
      setFlash({msg:window.kvT("Failed to delete payment."),type:"danger"});
    }
  };

  const stSelect = (val) => {
    const st = students.find(x=>x.id===+val);
    let nextForm = { ...form, student_id: val };
    if (st && form.type === "Monthly Fee") {
      const owed = getStudentOutstandingDefaults(val);
      if (owed) {
        nextForm = { ...nextForm, amount: owed.amount, monthFrom: owed.monthFrom, monthTo: owed.monthTo };
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

  // ── Add / Edit form ───────────────────────────────────────
  const selectedFormDue = form.type === "Monthly Fee" && form.student_id
    ? parseFloat(computeMonthlyAmount(form.student_id, form.monthFrom, form.monthTo) || 0)
    : 0;
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
              const nextForm = { ...form, type: nextType };
              if (nextType === "Monthly Fee" && form.student_id) {
                nextForm.amount = computeMonthlyAmount(form.student_id, form.monthFrom, form.monthTo);
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
                  <div style={{color:"var(--color-text-tertiary)",paddingTop:18,fontSize:18}}>→</div>
                  <div>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:3}}>{window.kvT('To')}</div>
                    <input type="month" value={form.monthTo} onChange={e=>handleMonthChange('monthTo', e.target.value)}
                      style={{width:"100%",padding:"7px 10px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}}/>
                  </div>
                </div>
                {months.length > 0 ? (
                  <div style={{marginTop:8,padding:"8px 12px",background:"var(--color-background-secondary)",borderRadius:8,fontSize:12,color:C.blue}}>
                    <i className="ti ti-calendar-check" style={{marginRight:5}} aria-hidden="true"/>
                    <strong>{window.kvT("{count} month(s) selected: {months}", {count: months.length, months: months.map(m=>window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m)).join(" · ")})}</strong>
                  </div>
                ) : (
                  <div style={{marginTop:8,fontSize:12,color:"var(--color-text-tertiary)"}}><i className="ti ti-alert-circle" style={{marginRight:4}} aria-hidden="true"/>{window.kvT("Invalid range - 'From' must be before or equal to 'To'.")}</div>
                )}
              </div>
            );
          })()}
          <div className="kv-form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:4}}>{window.kvT('Amount (RM) *')}</div>
              <div className="kv-money-input" style={{display:"flex"}}>
                <span style={{padding:"7px 10px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-secondary)",borderRight:"none",borderRadius:"7px 0 0 7px",fontSize:13,color:"var(--color-text-secondary)"}}>RM</span>
                <input className="kv-form-control" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{flex:1,padding:"7px 10px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:"0 7px 7px 0",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
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

  // ── List view ─────────────────────────────────────────────
  return (
    <div className="kv-page kv-page--payments">
      <div className="kv-page-header" style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 className="kv-page-title"><i className="ti ti-credit-card" style={{marginRight:8}} aria-hidden="true"/>{window.kvT("Payments")}</h2>
        {canCreatePayments && <Btn onClick={openAdd} variant="amber" style={{marginLeft:"auto"}}><i className="ti ti-plus" aria-hidden="true"/> {window.kvT("Record Payment")}</Btn>}
      </div>

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

      {activeTab === "records" ? (
        <>
          {/* Filters */}
      <Card className="kv-filter-card" style={{marginBottom:16}}>
        <div className="kv-table-toolbar" style={{padding:"10px 14px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <select value={statusF} onChange={e=>{const value=e.target.value;setStatusF(value);replaceRouteState && replaceRouteState({statusF:value});}} style={{padding:"6px 10px",fontSize:12,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-secondary)"}}>
            <option value="">{window.kvT("All Status")}</option>
            {["Paid","Partial","Unpaid","Overdue","Advance","Voided"].map(s=><option key={s} value={s}>{window.kvT(s)}</option>)}
          </select>
          <select value={typeF} onChange={e=>{const value=e.target.value;setTypeF(value);replaceRouteState && replaceRouteState({typeF:value});}} style={{padding:"6px 10px",fontSize:12,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-secondary)"}}>
            <option value="">{window.kvT("All Types")}</option>
            {types.map(t=><option key={t} value={t}>{window.kvT(t)}</option>)}
          </select>
          {(statusF||typeF)&&<Btn variant="outline" small onClick={()=>{setStatusF("");setTypeF("");replaceRouteState && replaceRouteState({statusF:"",typeF:""});}}>{window.kvT("Clear")}</Btn>}
        </div>
      </Card>

      <Card className="kv-table-card print-area kv-payments-print-area">
        <div className="kv-payments-print-header">
          <strong>KinderVault</strong>
          <span>{window.kvT("Payment Records")}{monthFilter ? " - " + fmtMonthRange(monthFilter) : ""}</span>
        </div>
        <CardHead><i className="ti ti-table" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Payment Records")} <span style={{background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{filtered.length}</span></CardHead>
        {filtered.length ? (
          <div className="kv-table-scroll" style={{overflowX:"auto"}}>
            <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--color-background-secondary)"}}>
                  {["Student","Type","Month","Amount","Date","Method","Status","Receipt",""].map(h=>(
                    <th key={h} className={!h?"no-print":""} style={{padding:"8px 12px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{window.kvT(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p=>{
                  const s = students.find(x=>x.id===p.student_id||x.id===parseInt(p.student_id));
                  return (
                    <tr key={p.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{fontWeight:500,color:"var(--color-text-primary)"}}>{p.student_name||s?.name||"–"}</div>
                        <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{p.student_class||s?.class}</div>
                      </td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{window.kvT(p.type)}</td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)",fontSize:11,maxWidth:180}}>{fmtMonthRange(p.month, p.date)}</td>
                      <td style={{padding:"9px 12px",fontWeight:500,color:C.green}}>RM {parseFloat(p.amount).toFixed(2)}</td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)",fontSize:11}}>{p.date ? window.kvDate(p.date, {day:'numeric', month:'short', year:'numeric'}, p.date) : "–"}</td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{window.kvT(p.method||"–")}</td>
                      <td style={{padding:"9px 12px"}}>{statusBadge(p.status)}</td>
                      <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"var(--color-text-tertiary)"}}>{p.receipt||"–"}</td>
                      <td className="no-print" style={{padding:"9px 12px"}}>
                        {(p.isVirtual || p.status === "Unpaid" || p.status === "Overdue") ? (
                          <div style={{display:"flex",gap:4}}>
                            {canCreatePayments && <Btn small style={{background:"#25D366",color:"white",borderColor:"#25D366"}} onClick={()=>sendWhatsApp(p)}><i className="ti ti-brand-whatsapp" aria-hidden="true"/> {window.kvT("Send")}</Btn>}
                            {canCreatePayments && <Btn small variant="amber" onClick={()=>openAdd({...blankForm, student_id: p.student_id, amount: p.amount.toString(), monthFrom: p.month, monthTo: p.month})}><i className="ti ti-cash" aria-hidden="true"/> {window.kvT("Pay")}</Btn>}
                          </div>
                        ) : (
                          <div style={{display:"flex",gap:4}}>
                            {p.receipt&&<Btn small variant="outline" onClick={()=>goReceipt(p)}><i className="ti ti-receipt" aria-hidden="true"/> {window.kvT("View")}</Btn>}
                            {canUpdatePayments && !["Paid", "Advance", "Partial", "Voided"].includes(p.status) && <Btn small variant="outline" onClick={()=>openEdit(p)} title={window.kvT("Edit payment")}><i className="ti ti-edit" aria-hidden="true"/></Btn>}
                            {canDeletePayments && p.status !== "Voided" && <Btn small variant="danger" onClick={()=>del(p)} title={window.kvT("Void payment")}><i className="ti ti-ban" aria-hidden="true"/></Btn>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="credit-card" text={window.kvT("No payment records found.")} action={canCreatePayments ? <Btn onClick={openAdd} variant="amber" style={{marginTop:12}}><i className="ti ti-plus" aria-hidden="true"/> {window.kvT("Record First Payment")}</Btn> : null}/>} 
      </Card>
    </>
      ) : (
        <Card className="kv-table-card print-area kv-payments-print-area">
          <div className="kv-payments-print-header">
            <strong>KinderVault</strong>
            <span>{window.kvT("Outstanding Dues")}{monthFilter ? " - " + fmtMonthRange(monthFilter) : ""}</span>
          </div>
          <CardHead><i className="ti ti-alert-circle" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Students with Outstanding Dues")}</CardHead>
          {displayedOutstandingList.length ? (
            <div className="kv-table-scroll" style={{overflowX:"auto"}}>
              <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"var(--color-background-secondary)"}}>
                    {["Student","Overdue Months","Total Owed",""].map(h=>(
                      <th key={h} className={!h?"no-print":""} style={{padding:"8px 12px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{window.kvT(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedOutstandingList.map(out => {
                    const fmtM = m => window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m);
                    return (
                      <tr key={out.student.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"9px 12px"}}>
                          <div style={{fontWeight:500,color:"var(--color-text-primary)"}}>{out.student.name}</div>
                          <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{out.student.class}</div>
                        </td>
                        <td style={{padding:"9px 12px",color:C.red}}>
                          <div style={{display:"flex",flexDirection:"column",gap:2}}>
                            <span style={{fontWeight:500}}>{window.kvT("{count} month(s)", {count: out.overdueMonths.length})}</span>
                            <span style={{fontSize:11,opacity:.8}}>{out.overdueMonths.map(fmtM).join(", ")}</span>
                          </div>
                        </td>
                        <td style={{padding:"9px 12px",fontWeight:500,color:C.red}}>RM {out.amountOwning.toFixed(2)}</td>
                        <td className="no-print" style={{padding:"9px 12px",textAlign:"right"}}>
                          <Btn small variant="outline" onClick={()=>{
                            const overdueFrom = out.overdueMonths[0];
                            const overdueTo = out.overdueMonths[out.overdueMonths.length - 1];
                            openAdd({...blankForm, student_id: out.student.id, amount: out.amountOwning.toFixed(2), monthFrom: overdueFrom, monthTo: overdueTo});
                          }}><i className="ti ti-cash" aria-hidden="true"/> {window.kvT("Pay")}</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{padding:40,textAlign:"center",color:"var(--color-text-tertiary)"}}>
              <i className="ti ti-check" style={{fontSize:32,color:C.green,marginBottom:8}} aria-hidden="true"/><br/>
              {window.kvT("No outstanding dues! All active students have paid up to date.")}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
