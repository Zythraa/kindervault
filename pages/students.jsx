// ============================================================
// pages/students.jsx  –  StudentsPage component
// ============================================================

const StudentsPage = ({students, classesList, setStudents, setPage, setFlash, payments, setPayments, goReceipt, navigationState = {}, navigationKey, navigate, goBack, replaceRouteState, feeConfig, permissions = [], isAdministrator = false, scannerEnabled = true}) => {
  const [view, setView]         = React.useState(navigationState.view || "list");
  const [selected, setSelected] = React.useState(null);
  const [search, setSearch]     = React.useState(navigationState.search || "");
  const [classF, setClassF]     = React.useState(navigationState.classF || "");
  const [loading, setLoading]   = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const packageAmount = (pkg) => parseFloat(feeConfig?.monthly_packages?.[pkg]?.amount || 0);
  const annual = feeConfig?.annual || {};
  const blankForm = {
    name:"", ic:"", birth_cert:"", gender:"M", dob:"", child_position:"", program_age:"5",
    monthly_package:"A", wants_uniform:0, wants_sports_uniform:0, wants_tudung:0, wants_iqra:0,
    class:"Intelek", parent:"", phone:"", address:"",
    father_name:"", father_ic:"", father_address:"", father_job:"", father_employer:"", father_phone:"",
    mother_name:"", mother_ic:"", mother_address:"", mother_job:"", mother_employer:"", mother_phone:"",
    fee:packageAmount("A"), status:"Active", enrol:new Date().toISOString().split("T")[0]
  };
  const [form, setForm]         = React.useState(navigationState.form || blankForm);
  const [payMonthF, setPayMonthF] = React.useState(navigationState.payMonthF || "");
  const paymentMethods = ["Cash","Bank Transfer","QR DuitNow","Cheque"];
  // Profile view state (hoisted to top level — Rules of Hooks)
  const [profileTab, setProfileTab]       = React.useState(navigationState.profileTab || "outstanding");
  const [selectedItems, setSelectedItems] = React.useState({});
  const [payModal, setPayModal]           = React.useState(false);
  const [payForm, setPayForm]             = React.useState({ date: new Date().toISOString().split("T")[0], method:"Cash", ref:"", notes:"" });
  const [profileReceipt, setProfileReceipt] = React.useState(navigationState.profileReceipt || null);
  const [saving, setSaving]               = React.useState(false);
  const canCreateStudents = canUsePermission(permissions, "students.create", isAdministrator);
  const canUpdateStudents = canUsePermission(permissions, "students.update", isAdministrator);
  const canDeleteStudents = canUsePermission(permissions, "students.delete", isAdministrator);
  const canCreatePayments = canUsePermission(permissions, "payments.create", isAdministrator);
  const canPrintReceipts = canUsePermission(permissions, "receipts.print", isAdministrator);
  const canViewDevelopment = canUsePermission(permissions, "development.view", isAdministrator);
  const classByProgrammeAge = Object.fromEntries(
    (classesList || []).filter(item => item && item.age_group).map(item => [String(item.age_group), item.name])
  );
  if (!classByProgrammeAge["4"]) classByProgrammeAge["4"] = "Permata";
  if (!classByProgrammeAge["5"]) classByProgrammeAge["5"] = "Intelek";
  if (!classByProgrammeAge["6"]) classByProgrammeAge["6"] = "Ceria";

  const classes = classesList ? classesList.map(c => c.name) : [];
  const filtered = [...students]
    .filter(s=>{
      const q = search.toLowerCase();
      return (!q || s.name.toLowerCase().includes(q) || (s.ic||"").includes(q) || (s.parent||"").toLowerCase().includes(q))
          && (!classF || s.class === classF);
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {sensitivity:"base"}));
  const formatGender = (student) => student?.gender === "M" ? window.kvT("Male") : student?.gender === "F" ? window.kvT("Female") : "–";

  const derivePrimaryParent = (f) => [f.father_name, f.mother_name].filter(Boolean).join(" / ");
  const derivePrimaryPhone = (f) => f.father_phone || f.mother_phone || f.phone || "";
  const derivePrimaryAddress = (f) => f.father_address || f.mother_address || f.address || "";
  const normalizeStudentPayload = (f) => ({
    ...f,
    parent: derivePrimaryParent(f),
    phone: derivePrimaryPhone(f),
    address: derivePrimaryAddress(f),
    fee: packageAmount(f.monthly_package || "A"),
    wants_uniform: f.wants_uniform ? 1 : 0,
    wants_sports_uniform: f.wants_sports_uniform ? 1 : 0,
    wants_tudung: f.wants_tudung ? 1 : 0,
    wants_iqra: f.wants_iqra ? 1 : 0,
  });
  const applyScannedRegistration = (review) => {
    const student = review?.student || {};
    const father = review?.father || {};
    const mother = review?.mother || {};

    const selectedAge = student.program_age || student.entry_age || "";
    const mappedClass = classByProgrammeAge[String(selectedAge)] || "";
    setForm(previous => ({
      ...previous,
      name: student.name || "",
      ic: student.mykid || "",
      birth_cert: student.birth_cert || student.birth_certificate || "",
      dob: student.dob || student.date_of_birth || "",
      gender: student.gender || previous.gender || "M",
      child_position: student.child_position || student.sibling_order || "",
      program_age: selectedAge ? String(selectedAge) : (previous.program_age || "5"),
      class: (mappedClass && classes.includes(mappedClass)) ? mappedClass : (previous.class || (classes[0] || "")),
      wants_tudung: student.gender === "F" ? 1 : (student.gender === "M" ? 0 : (previous.wants_tudung ?? 0)),
      father_name: father.name || "",
      father_ic: father.ic || father.identity_no || "",
      father_address: father.address || father.home_address || "",
      father_job: father.occupation || "",
      father_employer: father.employer || "",
      father_phone: father.phone || "",
      mother_name: mother.name || "",
      mother_ic: mother.ic || mother.identity_no || "",
      mother_address: mother.address || mother.home_address || "",
      mother_job: mother.occupation || "",
      mother_employer: mother.employer || "",
      mother_phone: mother.phone || "",
    }));
    setScannerOpen(false);
    setFlash({msg:window.kvT("Reviewed scan values filled the student form. Check every field before saving."),type:"success"});
  };
  const studentFormFromRecord = (student) => ({
    ...blankForm,
    ...student,
    fee: parseFloat(student.fee),
    program_age: student.program_age || "5",
    father_name: student.father_name || "",
    father_ic: student.father_ic || "",
    father_address: student.father_address || "",
    father_job: student.father_job || "",
    father_employer: student.father_employer || "",
    father_phone: student.father_phone || "",
    mother_name: student.mother_name || "",
    mother_ic: student.mother_ic || "",
    mother_address: student.mother_address || "",
    mother_job: student.mother_job || "",
    mother_employer: student.mother_employer || "",
    mother_phone: student.mother_phone || "",
    birth_cert: student.birth_cert || "",
    child_position: student.child_position || "",
    monthly_package: student.monthly_package || "A",
    wants_uniform: parseInt(student.wants_uniform ?? 1),
    wants_sports_uniform: parseInt(student.wants_sports_uniform ?? 1),
    wants_tudung: parseInt(student.wants_tudung ?? (student.gender === "F" ? 1 : 0)),
    wants_iqra: parseInt(student.wants_iqra ?? 0),
    fee: parseFloat(student.fee || packageAmount(student.monthly_package || "A"))
  });

  React.useEffect(() => {
    const state = navigationState || {};
    const requestedView = state.view || "list";
    const selectedStudent = state.studentId
      ? students.find(student => String(student.id) === String(state.studentId))
      : null;

    setSearch(state.search || "");
    setClassF(state.classF || "");
    setPayMonthF(state.payMonthF || "");
    setProfileTab(state.profileTab || "outstanding");
    setSelectedItems({});
    setPayModal(false);
    setPayForm({ date: new Date().toISOString().split("T")[0], method:"Cash", ref:"", notes:"" });
    setProfileReceipt(state.profileReceipt || null);
    setScannerOpen(false);
    setSelected(selectedStudent || null);
    if (requestedView === "edit" && selectedStudent) setForm(studentFormFromRecord(selectedStudent));
    if (requestedView === "add") setForm(state.form || blankForm);
    setView((requestedView === "profile" || requestedView === "edit") && !selectedStudent ? "list" : requestedView);
  }, [navigationKey]);

  const listState = () => ({search, classF});
  const backToList = () => goBack({page:"students", state:{...listState(), view:"list"}});
  const profileState = (extra = {}) => ({
    ...listState(),
    view:"profile",
    studentId:selected?.id || null,
    payMonthF,
    profileTab,
    ...extra,
  });

  const openAdd  = () => {
    if (!canCreateStudents) { setFlash({msg:window.kvT("Access Denied. You do not have permission to add students."),type:"danger"}); return; }
    navigate({page:"students", state:{...listState(), view:"add"}});
  };
  const openEdit = (s) => {
    if (!canUpdateStudents) { setFlash({msg:window.kvT("Access Denied. You do not have permission to edit students."),type:"danger"}); return; }
    navigate({page:"students", state:{...listState(), view:"edit", studentId:s.id}});
  };
  const openProfile = (s) => {
    navigate({page:"students", state:{...listState(), view:"profile", studentId:s.id, payMonthF:"", profileTab:"outstanding"}});
  };
  const openStudentDevelopment = () => {
    if (!selected || !canViewDevelopment) return;
    navigate({page:"development", state:{module:"borang", screen:"history", viewMode:"fill", studentId:selected.id}});
  };

  const save = async () => {
    if (loading) return;
    if ((view === "add" && !canCreateStudents) || (view === "edit" && !canUpdateStudents)) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to save this student."),type:"danger"});
      return;
    }
    const payload = normalizeStudentPayload(form);
    if (!payload.name || !payload.dob || !payload.class || !payload.parent) {
      setFlash({msg:window.kvT("Please fill in all required fields."),type:"danger"}); return;
    }
    setLoading(true);
    try {
      if (view === "add") {
        const res = await api.post('api/students.php', payload);
        if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
        setStudents(prev=>[...prev, res]);
        setFlash({msg:window.kvT("Student {name} added successfully.", {name: payload.name}),type:"success"});
      } else {
        const res = await api.put(`api/students.php?id=${selected.id}`, payload);
        if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
        setStudents(prev=>prev.map(s=>s.id===selected.id?res:s));
        setFlash({msg:window.kvT("Student updated successfully."),type:"success"});
      }
      backToList();
    } catch(e) {
      setFlash({msg:window.kvT("Network error. Please try again."),type:"danger"});
    } finally {
      setLoading(false);
    }
  };

  const del = async (s) => {
    if (!canDeleteStudents) { setFlash({msg:window.kvT("Access Denied. You do not have permission to delete students."),type:"danger"}); return; }
    if (!window.confirm(window.kvT("Delete {name}? This will also remove their payment records.", {name: s.name}))) return;
    try {
      const res = await api.delete(`api/students.php?id=${s.id}`);
      if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
      setStudents(prev=>prev.filter(x=>x.id!==s.id));
      setFlash({msg:window.kvT("Student deleted."),type:"success"});
    } catch(e) {
      setFlash({msg:window.kvT("Failed to delete student."),type:"danger"});
    }
  };


  // ── Helpers ──────────────────────────────────────────────
  const allocateMonthlyPaidAmounts = (stuPays, fee) => {
    const paidAmounts = {};
    stuPays.filter(p => p.type === "Monthly Fee" && (p.status === "Paid" || p.status === "Advance" || p.status === "Partial")).forEach(p => {
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

  const computeOutstandingItems = (stu) => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const currentYear = String(today.getFullYear());
    const stuPays = (payments || []).filter(p => parseInt(p.student_id) === parseInt(stu.id));
    const fee = parseFloat(stu.fee || 0);
    const paidAmounts = allocateMonthlyPaidAmounts(stuPays, fee);
    let startStr = stu.enrol ? stu.enrol.substring(0,7) : currentMonthStr;
    // A future enrolment is not yet billable. It should not show as unpaid,
    // overdue, or carry current-year annual fees before the start month.
    if (startStr > currentMonthStr) return [];
    let [sy,sm] = startStr.split("-").map(Number);
    let [cy,cm] = currentMonthStr.split("-").map(Number);
    const missingMonths = [];
    while (sy < cy || (sy === cy && sm <= cm)) {
      const mStr = `${sy}-${String(sm).padStart(2,'0')}`;
      const due = Math.max(0, fee - (paidAmounts[mStr] || 0));
      if (due > 0) missingMonths.push({ month: mStr, due });
      sm++; if (sm > 12) { sm = 1; sy++; }
    }
    const fmt = m => window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m);
    const items = [];
    const hasAnnualPayment = (type) => stuPays.some(p => p.type === type && String(p.month || "") === currentYear && (p.status === "Paid" || p.status === "Advance"));
    const annualItems = [
      {id:"annual_reg", type:"Annual Registration", desc:window.kvT("Registration Fee {year}", {year: currentYear}), amount: parseFloat(annual.registration || 0), include:true},
      {id:"annual_books", type:"Books / Materials", desc:window.kvT("Books / Activity Materials {year}", {year: currentYear}), amount: parseFloat((annual.books || {})[stu.program_age || "5"] || 0), include:true},
      {id:"annual_uniform", type:"Uniform", desc:window.kvT("Uniform {year}", {year: currentYear}), amount: parseFloat(annual.uniform || 0), include:!!parseInt(stu.wants_uniform ?? 1)},
      {id:"annual_sports_uniform", type:"Sports Uniform", desc:window.kvT("Sports Uniform {year}", {year: currentYear}), amount: parseFloat(annual.sports_uniform || 0), include:!!parseInt(stu.wants_sports_uniform ?? 1)},
      {id:"annual_tudung", type:"Tudung", desc:window.kvT("Tudung {year}", {year: currentYear}), amount: parseFloat(annual.tudung || 0), include:stu.gender === "F" && !!parseInt(stu.wants_tudung ?? 1)},
      {id:"annual_lawatan", type:"Lawatan", desc:window.kvT("Educational Visit {year}", {year: currentYear}), amount: parseFloat(annual.lawatan || 0), include:true},
      {id:"annual_sukan", type:"Sukan", desc:window.kvT("Sports Day {year}", {year: currentYear}), amount: parseFloat(annual.sukan || 0), include:true},
      {id:"annual_hadiah", type:"Penyampaian Hadiah", desc:window.kvT("Awards Ceremony {year}", {year: currentYear}), amount: parseFloat(annual.hadiah || 0), include:true},
      {id:"annual_gambar", type:"Pakej Gambar", desc:window.kvT("Photo Package {year}", {year: currentYear}), amount: parseFloat(annual.gambar || 0), include:true},
      {id:"annual_iqra", type:"IQRA Class", desc:window.kvT("IQRA Class {year}", {year: currentYear}), amount: parseFloat(annual.iqra || 0), include:!!parseInt(stu.wants_iqra ?? 0)},
    ];
    annualItems.forEach(item => {
      if (item.include && item.amount > 0 && !hasAnnualPayment(item.type)) {
        items.push({ id:item.id, type:item.type, desc:item.desc, month:currentYear, amount:item.amount });
      }
    });
    if (missingMonths.length > 0) {
      // Group overdue (past) separately from current
      const overdueMs = missingMonths.filter(m => m.month < currentMonthStr);
      const currentM  = missingMonths.filter(m => m.month === currentMonthStr);
      if (overdueMs.length > 0) {
        items.push({
          id: "overdue",
          type: "Monthly Fee",
          desc: window.kvT("Overdue Monthly Fee ({count} month(s): {months})", {count: overdueMs.length, months: overdueMs.map(item => fmt(item.month)).join(", ")}),
          month: overdueMs.map(item => item.month).join(","),
          amount: overdueMs.reduce((sum,item) => sum + item.due, 0),
          months: overdueMs.map(item => item.month),
          isOverdue: true
        });
      }
      if (currentM.length > 0) {
        items.push({
          id: "current",
          type: "Monthly Fee",
          desc: window.kvT("Monthly Fee - {month}", {month: fmt(currentM[0].month)}),
          month: currentM[0].month,
          amount: currentM[0].due,
          months: currentM.map(item => item.month)
        });
      }
    }
    return items;
  };

  // ── Profile view ─────────────────────────────────────────
  if (view === "profile" && selected) {

    const outstandingItems = computeOutstandingItems(selected);
    const stuPaidPayments  = (payments || []).filter(p => parseInt(p.student_id) === parseInt(selected.id) && ["Paid", "Advance", "Partial", "Voided"].includes(p.status));
    const checkedIds       = Object.keys(selectedItems).filter(k => selectedItems[k]);
    const checkedItems     = outstandingItems.filter(it => checkedIds.includes(it.id));
    const checkedTotal     = checkedItems.reduce((s,it) => s + it.amount, 0);

    const toggleItem = (id) => setSelectedItems(prev => ({...prev, [id]: !prev[id]}));
    const selectAll  = () => { const all = {}; outstandingItems.forEach(it => all[it.id] = true); setSelectedItems(all); };
    const clearAll   = () => setSelectedItems({});

    const fmtMonthRange = (monthStr) => {
      const ms = (monthStr||"").split(",").map(m=>m.trim()).filter(Boolean);
      if (!ms.length) return "–";
      const fmt = m => window.kvDate(new Date(m+"-01"), {month:"short",year:"numeric"}, m);
      return ms.length === 1 ? fmt(ms[0]) : `${fmt(ms[0])} – ${fmt(ms[ms.length-1])}`;
    };

    const paySelected = async () => {
      if (!canCreatePayments) {
        setFlash({msg:window.kvT("Access Denied. You do not have permission to record payments."),type:"danger"});
        return;
      }
      if (!checkedItems.length) return;
      setSaving(true);
      try {
        const payload = {
          student_id: selected.id,
          date: payForm.date,
          method: payForm.method,
          ref: payForm.ref,
          notes: payForm.notes,
          items: checkedItems.map(it => ({ type: it.type, amount: it.amount, month: it.month }))
        };
        const res = await api.post("api/payments.php", payload);
        if (res.error) { setFlash({msg:res.error,type:"danger"}); return; }
        const newPays = res.payments || [];
        if (typeof setPayments === "function") {
          setPayments(prev => [...prev, ...newPays]);
        }
        const receiptItems = (newPays.length ? newPays : checkedItems).map((item, index) => ({
          id: item.id || `receipt-item-${index}`,
          type: item.type,
          month: item.month || "",
          status: item.status || "Paid",
          desc: item.desc || window.kvPaymentItemLabel(item.type, item.month),
          amount: parseFloat(item.amount || 0),
        }));
        const receiptData = {
          receipt: res.receipt,
          date: payForm.date,
          method: payForm.method,
          ref: payForm.ref,
          notes: payForm.notes,
          student: selected,
          items: receiptItems,
          total: receiptItems.reduce((total, item) => total + item.amount, 0),
          payments: newPays
        };
        setPayModal(false);
        setSelectedItems({});
        navigate({page:"students", state:profileState({profileReceipt:receiptData})});
        const fresh = await api.get("api/payments.php");
        if (Array.isArray(fresh) && typeof setPayments === "function") setPayments(fresh);
      } catch(e) {
        setFlash({msg:window.kvT("Network error. Please try again."),type:"danger"});
      } finally {
        setSaving(false);
      }
    };

    const openPaymentReceipt = async (payment) => {
      if (!payment || !payment.receipt) return;
      try {
        const res = await api.get(`api/payments.php?id=${payment.id}`);
        if (res.error) {
          setFlash({msg:res.error,type:"danger"});
          return;
        }
        const receiptPreview = {
          receipt: res.receipt,
          date: res.date || "",
          method: res.method || "",
          ref: res.ref || "",
          notes: res.notes || "",
          student: selected,
          items: [{ id: res.id, type: res.type, month: res.month || "", status: res.status || "Paid", desc: res.type === "Monthly Fee" ? window.kvT("Monthly Fee ({period})", {period: fmtMonthRange(res.month)}) : window.kvT(res.type), amount: parseFloat(res.amount || 0) }],
          total: parseFloat(res.amount || 0)
        };
        navigate({page:"students", state:profileState({profileReceipt:receiptPreview})});
      } catch (e) {
        setFlash({msg:window.kvT("Unable to load receipt details."),type:"danger"});
      }
    };

    const formatPhoneForWA = (phone) => {
      if (!phone) return "";
      let cleaned = String(phone).replace(/\D/g, "");
      if (cleaned.startsWith("0")) cleaned = "60" + cleaned.substring(1);
      return cleaned;
    };

    const sendReceiptWhatsApp = () => {
      const phone = selected?.phone || profileReceipt?.student?.phone || "";
      if (!phone) {
        window.alert(window.kvT("Parent's phone number is missing for this student."));
        return;
      }
      const waPhone = formatPhoneForWA(phone);
      if (!waPhone) {
        window.alert(window.kvT("Parent's phone number is not valid for WhatsApp."));
        return;
      }
      const amount = parseFloat(profileReceipt?.total || 0).toFixed(2);
      const receiptNo = profileReceipt?.receipt || "";
      const issuedDate = profileReceipt?.date
        ? window.kvDate(profileReceipt.date, {day:'numeric', month:'short', year:'numeric'}, profileReceipt.date)
        : window.kvDate(new Date(), {day:'numeric', month:'short', year:'numeric'});
      const itemText = (profileReceipt?.items || []).map(it => window.kvPaymentItemLabel(it.type, it.month, it.desc)).filter(Boolean).join(", ");
      const locale = window.kvLang || "en";
      const text = locale === "ms"
        ? `Salam, kami telah menerima pembayaran anda sebanyak RM ${amount}${itemText ? ` untuk ${itemText}` : ""}. Terima kasih. Nombor resit anda ialah ${receiptNo}, dikeluarkan pada ${issuedDate}.`
        : `Salam/Hi, we have received your payment of RM ${amount}${itemText ? ` for ${itemText}` : ""}. Thank you. Your receipt number is ${receiptNo}, issued on ${issuedDate}.`;
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank");
    };

    const printStudentProfile = () => {
      const previousTitle = document.title;
      const printedAt = window.kvDate(new Date(), {year:"numeric", month:"2-digit", day:"2-digit"}, "");
      document.title = `${window.kvT("Student Profile")} - ${selected.name || "Student"} - ${printedAt}`;
      document.documentElement.classList.add("kv-printing-student-profile");
      document.body.classList.add("kv-printing-student-profile");
      window.setTimeout(() => {
        try {
          window.print();
        } finally {
          document.documentElement.classList.remove("kv-printing-student-profile");
          document.body.classList.remove("kv-printing-student-profile");
          document.title = previousTitle;
        }
      }, 100);
    };

    const formatReceiptPeriod = (value) => {
      const values = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
      if (!values.length) return {label:"", count:0};
      const parsed = values.map(value => {
        const key = /^\d{4}$/.test(value) ? `${value}-01` : value;
        const date = new Date(`${key}-01`);
        return {key:value, date, time:date.getTime()};
      }).filter(item => !Number.isNaN(item.time)).sort((a, b) => a.time - b.time);
      const labels = parsed.map(item => window.kvDate(item.date, {month:"short", year:"numeric"}, item.key));
      if (!labels.length) return {label:values.join(", "), count:values.length};
      let label = labels.join(", ");
      if (parsed.length > 1) {
        const contiguous = parsed.every((item, index) => index === 0 ||
          (item.date.getFullYear() * 12 + item.date.getMonth()) -
          (parsed[index - 1].date.getFullYear() * 12 + parsed[index - 1].date.getMonth()) === 1);
        label = contiguous ? `${labels[0]} - ${labels[labels.length - 1]}` : labels.join(", ");
      }
      return {label, count:parsed.length};
    };

    const expandAdvanceReceiptMonths = (item, student) => {
      const explicit = String(item?.month || "").split(",").map(value => value.trim()).filter(Boolean);
      if (explicit.length !== 1 || item?.type !== "Monthly Fee" || item?.status !== "Advance") return explicit;
      const start = explicit[0];
      const monthlyFee = parseFloat(student?.fee || 0);
      const amount = parseFloat(item?.amount || 0);
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(start) || !Number.isFinite(monthlyFee) || monthlyFee <= 0 || !Number.isFinite(amount) || amount <= monthlyFee) return explicit;
      const count = Math.round(amount / monthlyFee);
      if (count < 2 || count > 60 || Math.abs(amount - (count * monthlyFee)) > 0.01) return explicit;
      const [year, month] = start.split("-").map(Number);
      return Array.from({length:count}, (_, index) => {
        const date = new Date(year, month - 1 + index, 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      });
    };

    // ── Receipt preview ──────────────────────────────────────
    if (profileReceipt) {
      const s = profileReceipt.student;
      const receiptItems = (profileReceipt.items || []).map((item, index) => ({
        ...item,
        id: item.id || `receipt-item-${index}`,
        amount: parseFloat(item.amount || 0),
      }));
      const receiptMonths = [...new Set(receiptItems.filter(item => item.type === "Monthly Fee").flatMap(item => expandAdvanceReceiptMonths(item, s)))];
      const overallPeriod = formatReceiptPeriod(receiptMonths.join(","));
      const receiptTotal = receiptItems.reduce((total, item) => total + item.amount, 0);
      const receiptStatus = receiptItems.some(item => item.status === "Voided") ? "Voided" : (receiptItems.some(item => item.status === "Partial") ? "Partial" : (receiptItems.some(item => item.status === "Advance") ? "Advance" : "Paid"));
      const receiptMaxId = Math.max(...receiptItems.map(item => parseInt(item.id || 0)).filter(Number.isFinite), 0);
      const receiptHistory = [...(payments || []), ...receiptItems.map(item => ({...item, student_id: s?.id}))].reduce((list, payment) => { const key = String(payment.id || [payment.type, payment.month, payment.amount].join("-")); if (!list.some(existing => String(existing.id || [existing.type, existing.month, existing.amount].join("-")) === key)) list.push(payment); return list; }, []);
      const annualDueByType = {"Annual Registration": parseFloat(annual.registration || 0), "Books / Materials": parseFloat((annual.books || {})[s?.program_age || "5"] || 0), "Uniform": parseFloat(annual.uniform || 0), "Sports Uniform": parseFloat(annual.sports_uniform || 0), "Tudung": parseFloat(annual.tudung || 0), "Lawatan": parseFloat(annual.lawatan || 0), "Sukan": parseFloat(annual.sukan || 0), "Penyampaian Hadiah": parseFloat(annual.hadiah || 0), "Pakej Gambar": parseFloat(annual.gambar || 0), "IQRA Class": parseFloat(annual.iqra || 0)};
      const obligationDue = {}; receiptHistory.filter(p => p.type === "Monthly Fee" && ["Unpaid", "Overdue"].includes(p.status)).forEach(p => { const covered = String(p.month || "").split(",").map(m => m.trim()).filter(Boolean); const perMonth = parseFloat(p.amount || 0) / Math.max(covered.length, 1); covered.forEach(month => { if (receiptMonths.includes(month)) obligationDue[month] = Math.max(obligationDue[month] || 0, perMonth); }); });
      const monthlyPaid = allocateMonthlyPaidAmounts(receiptHistory.filter(p => parseInt(p.student_id) === parseInt(s?.id)), parseFloat(s?.fee || 0));
      const monthlyBalance = receiptMonths.length ? receiptMonths.reduce((sum, month) => { const due = obligationDue[month] || parseFloat(s?.fee || 0); return sum + Math.max(0, due - Math.min(due, monthlyPaid[month] || 0)); }, 0) : 0;
      const nonMonthlyBalance = receiptItems.filter(item => item.type !== "Monthly Fee" && annualDueByType[item.type] > 0).reduce((balance, item) => { const due = annualDueByType[item.type]; const received = receiptHistory.filter(p => parseInt(p.student_id) === parseInt(s?.id) && p.type === item.type && String(p.month || "") === String(item.month || "") && ["Paid", "Advance", "Partial"].includes(p.status)).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0); return balance + Math.max(0, due - Math.min(due, received)); }, 0);
      const receiptBalance = receiptStatus === "Partial" && (receiptMonths.length || nonMonthlyBalance > 0) ? monthlyBalance + nonMonthlyBalance : null;
      const receiptDate = profileReceipt.date
        ? window.kvDate(profileReceipt.date, {day:"numeric", month:"short", year:"numeric"}, profileReceipt.date)
        : window.kvDate(new Date(), {day:"numeric", month:"short", year:"numeric"});
      const receiptType = receiptItems.length > 1 ? window.kvT("Multiple Payments") : window.kvT(receiptItems[0]?.type || "Payment");
      return (
        <div className="kv-page kv-page--receipt-preview kv-page--student-receipt">
          <div className="kv-page-header kv-receipt-actions no-print" style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <Btn variant="outline" small onClick={()=>goBack({page:"students", state:profileState()})} title={window.kvT("Back to student profile")}><i className="ti ti-arrow-left" aria-hidden="true"/></Btn>
            <h2 className="kv-page-title">{window.kvT("Receipt Preview")}</h2>
            {receiptStatus !== "Voided" && <Btn small variant="outline" onClick={sendReceiptWhatsApp} style={{marginLeft:"auto",background:"#25D366",color:"#fff",border:"none"}}>
              <i className="ti ti-brand-whatsapp" aria-hidden="true"/> {window.kvT('Send WhatsApp')}
            </Btn>}
            {canPrintReceipts && <Btn small onClick={()=>{
              const orig = document.title;
              const issueDate = (profileReceipt.date || new Date().toISOString().split('T')[0]).replace(/[^\d-]/g, '');
              document.title = `${issueDate}_${s.name}_${s.parent}_${profileReceipt.receipt}`;
              setTimeout(()=>{ window.print(); document.title = orig; }, 100);
            }} style={{background:C.blue,color:"#fff",border:"none"}}>
              <i className="ti ti-printer" aria-hidden="true"/> {window.kvT("Print / PDF")}
            </Btn>}
            <Btn small variant="outline" onClick={()=>goBack({page:"students", state:profileState()})}><i className="ti ti-check" aria-hidden="true"/> {window.kvT("Done")}</Btn>
          </div>
          <div className="print-area kv-receipt-print-area">
            <Card className="kv-receipt-sheet">
              <div className="kv-receipt-top-accent" aria-hidden="true"/>
              <div className="kv-receipt-layout">
                <header className="kv-receipt-header">
                  <div className="kv-receipt-brand">
                    <div className="kv-receipt-document-label"><i className="ti ti-receipt" aria-hidden="true"/> {window.kvT(receiptStatus === "Voided" ? "Voided Receipt" : "Official Receipt")}</div>
                    <div className="kv-receipt-school-name">{SCHOOL}</div>
                    <div className="kv-receipt-school-address">
                      No. 10-G & 12-G, Jalan SP3/2<br/>
                      Taman Saujana Puchong<br/>
                      47110 Puchong
                    </div>
                  </div>
                  <div className="kv-receipt-meta-card">
                    <div className="kv-receipt-meta-title">{window.kvT("RECEIPT DETAILS")}</div>
                    <div className="kv-receipt-meta-grid">
                      <span>{window.kvT("Receipt No.")}:</span><strong className="kv-receipt-number">{profileReceipt.receipt}</strong>
                      <span>{window.kvT("Date Issued:")}</span><strong>{receiptDate}</strong>
                      <span>{window.kvT("Payment Type:")}</span><strong>{receiptType}</strong>
                    </div>
                  </div>
                </header>

                <section className="kv-receipt-student-card">
                  <div className="kv-receipt-student-grid">
                    <div><div className="kv-receipt-field-label">{window.kvT("Student")}</div><div className="kv-receipt-field-value">{s.name}</div></div>
                    <div><div className="kv-receipt-field-label">{window.kvT("Class")}</div><div className="kv-receipt-field-value">{s.class}</div></div>
                    <div><div className="kv-receipt-field-label">{window.kvT("Parent / Guardian")}</div><div className="kv-receipt-field-value">{s.parent}</div></div>
                    <div><div className="kv-receipt-field-label">{window.kvT("Fee Period")}</div><div className="kv-receipt-field-value">{overallPeriod.label || "—"}{overallPeriod.count > 1 ? ` (${overallPeriod.count} ${window.kvT("months")})` : ""}</div></div>
                  </div>
                </section>

                {overallPeriod.label && <div className="kv-receipt-period-banner" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,margin:"16px 0",padding:"14px 18px",borderRadius:12,background:"linear-gradient(135deg, #f3edff 0%, #faf8ff 100%)",border:"1px solid #dfd2f5"}}>
                  <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#7750a8"}}>{window.kvT("Fee months covered")}</div><div style={{fontSize:17,fontWeight:700,color:"var(--color-text-primary)",marginTop:3}}>{overallPeriod.label}</div></div>
                  {overallPeriod.count > 1 && <div style={{fontSize:13,fontWeight:600,color:"#7750a8",whiteSpace:"nowrap"}}>{overallPeriod.count} {window.kvT("months")}</div>}
                </div>}

                <section className="kv-receipt-payment-section">
                  <div className="kv-receipt-section-heading">
                    <div><span>{window.kvT("Payment Summary")}</span><small>{window.kvT("Official payment document")}</small></div>
                    <span className="kv-receipt-paid-badge" style={receiptStatus === "Voided" ? {background:"#eeeeee",color:"#555555"} : (receiptStatus === "Partial" ? {background:"#fff3cd",color:"#8a5a00"} : undefined)}><i className="ti ti-circle-check-filled" aria-hidden="true"/> {window.kvT(receiptStatus === "Voided" ? "Voided" : (receiptStatus === "Partial" ? "Partial Payment" : (receiptStatus === "Advance" ? "Advance Payment" : "Paid")))}</span>
                  </div>
                  <table className="kv-receipt-items-table">
                    <thead><tr><th>{window.kvT("Description")}</th><th>{window.kvT("Fee Period")}</th><th>{window.kvT("Amount (RM)")}</th></tr></thead>
                  <tbody>
                      {receiptItems.map((item, index) => { const itemPeriod = item.type === "Monthly Fee" ? formatReceiptPeriod(item.month) : {label:"", count:0}; return <tr key={item.id || index}>
                        <td>{item.desc || window.kvPaymentItemLabel(item.type, item.month)}</td>
                        <td>{itemPeriod.label ? `${itemPeriod.label}${itemPeriod.count > 1 ? ` (${itemPeriod.count} ${window.kvT("months")})` : ""}` : "—"}</td>
                        <td>{item.amount.toFixed(2)}</td>
                      </tr>})}
                  </tbody>
                    <tfoot><tr><td colSpan="2">{window.kvT(receiptStatus === "Voided" ? "Voided Amount" : "Total Received")}</td><td>RM {receiptTotal.toFixed(2)}</td></tr>{receiptStatus === "Partial" && receiptBalance !== null && <tr><td colSpan="2" style={{color:"#8a5a00"}}>{window.kvT("Outstanding Balance")}</td><td style={{color:"#8a5a00"}}>RM {receiptBalance.toFixed(2)}</td></tr>}</tfoot>
                  </table>
                </section>

                <section className="kv-receipt-lower-grid">
                  <div className="kv-receipt-info-card">
                    <div className="kv-receipt-info-icon"><i className="ti ti-credit-card" aria-hidden="true"/></div>
                    <div>
                      <h4>{window.kvT("Payment Details")}</h4>
                      <dl>
                        <div><dt>{window.kvT("Method")}</dt><dd>{window.kvT(profileReceipt.method || "Cash")}</dd></div>
                        {profileReceipt.ref ? <div><dt>{window.kvT("Ref")}</dt><dd>{profileReceipt.ref}</dd></div> : null}
                        {profileReceipt.notes ? <div><dt>{window.kvT("Notes")}</dt><dd>{profileReceipt.notes}</dd></div> : null}
                      </dl>
                    </div>
                  </div>
                  <div className="kv-receipt-info-card">
                    <div className="kv-receipt-info-icon"><i className="ti ti-file-certificate" aria-hidden="true"/></div>
                    <div><h4>{window.kvT("Receipt Notes")}</h4><p>{window.kvT("No signature required. This is a digital receipt.")}</p></div>
                  </div>
                </section>

                <section className="kv-receipt-confirmation">
                  <div className="kv-receipt-confirmation-mark"><i className={receiptStatus === "Voided" ? "ti ti-x" : "ti ti-check"} aria-hidden="true"/></div>
                  <div><span>{window.kvT(receiptStatus === "Voided" ? "Payment Voided" : (receiptStatus === "Partial" ? "Partial Payment Received" : "Payment Confirmed"))}</span><p>{window.kvT(receiptStatus === "Voided" ? "This payment has been cancelled and is not included in the student paid balance." : (receiptStatus === "Partial" ? "This receipt confirms a partial payment. The remaining balance is still outstanding." : "This receipt confirms that the payment above has been received and recorded in KinderVault."))}</p></div>
                  <strong>RM {receiptTotal.toFixed(2)}</strong>
                </section>

                <footer className="kv-receipt-footer">
                  <div><strong>{window.kvT("Generated by KinderVault")}</strong><span>{profileReceipt.receipt}</span></div>
                <div className="kv-receipt-footer-thanks">{window.kvT(receiptStatus === "Voided" ? "This receipt is retained for audit purposes only." : "Thank you for your payment.")}</div>
                </footer>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="kv-page kv-page--student-profile">
        {/* Pay modal */}
        {payModal && (
          <div className="kv-modal-backdrop" onClick={e=>e.target===e.currentTarget&&setPayModal(false)}>
            <div className="kv-modal" style={{padding:28}}>
              <div style={{fontWeight:600,fontSize:16,marginBottom:16,color:"var(--color-text-primary)"}}>
                <i className="ti ti-cash" style={{marginRight:8,color:C.green}} aria-hidden="true"/>{window.kvT("Confirm Payment")}
              </div>
              {/* Summary of items being paid */}
              <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:12,marginBottom:16,fontSize:13}}>
                {checkedItems.map((it,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<checkedItems.length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>
                  <span style={{color:"var(--color-text-primary)"}}>{window.kvPaymentItemLabel(it.type, it.month, it.desc)}</span>
                    <span style={{fontWeight:500}}>RM {it.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",fontWeight:700,borderTop:`2px solid ${C.blue}`,marginTop:6}}>
                  <span style={{color:"var(--color-text-primary)"}}>{window.kvT("TOTAL")}</span>
                  <span style={{color:C.green}}>RM {checkedTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="kv-form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:4}}>{window.kvT('Payment Date *')}</div>
                  <input type="date" value={payForm.date} onChange={e=>setPayForm({...payForm,date:e.target.value})}
                    style={{width:"100%",padding:"7px 10px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}}/>
                </div>
                <Select label={window.kvT('Method *')} value={payForm.method} onChange={e=>setPayForm({...payForm,method:e.target.value})} options={paymentMethods.map(m=>({value:m,label:window.kvT(m)}))}/>
              </div>
              <div style={{marginBottom:10}}>
                <Input label={window.kvT('Reference No.')} value={payForm.ref} onChange={e=>setPayForm({...payForm,ref:e.target.value})} placeholder={window.kvT('Bank ref / slip no.')}/>
              </div>
              <div style={{marginBottom:16}}>
                <Input label={window.kvT('Notes (optional)')} value={payForm.notes} onChange={e=>setPayForm({...payForm,notes:e.target.value})} placeholder={window.kvT('Any remarks…')}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={paySelected} style={{flex:1,opacity:saving?0.6:1}}>
                  {saving ? <><i className="ti ti-loader" aria-hidden="true"/> {window.kvT('Saving…')}</> : <><i className="ti ti-receipt" aria-hidden="true"/> {window.kvT('Save & Generate Receipt')}</>}
                </Btn>
                <Btn variant="outline" onClick={()=>setPayModal(false)}>{window.kvT('Cancel')}</Btn>
              </div>
            </div>
          </div>
        )}

        <div className="kv-page-header no-print" style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <Btn variant="outline" small onClick={backToList} title={window.kvT("Back to students")}><i className="ti ti-arrow-left" aria-hidden="true"/></Btn>
          <h2 className="kv-page-title">{selected.name}</h2>
          {statusBadge(selected.status)}
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <Btn small variant="outline" onClick={printStudentProfile}><i className="ti ti-printer" aria-hidden="true"/> {window.kvT("Print")}</Btn>
            {canViewDevelopment && <Btn small variant="outline" onClick={openStudentDevelopment}><i className="ti ti-chart-line" aria-hidden="true"/> {window.kvT("Development")}</Btn>}
            {canUpdateStudents && <Btn small onClick={()=>openEdit(selected)}><i className="ti ti-edit" aria-hidden="true"/> {window.kvT("Edit")}</Btn>}
          </div>
        </div>

        {/* Student details row */}
        <div className="kv-profile-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <Card>
            <CardHead><i className="ti ti-id-badge" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Student Details")}</CardHead>
            <div style={{padding:"12px 16px"}}>
              {[["Student Code",<code style={{fontSize:12}}>{selected.code}</code>],["IC / Birth Cert",selected.ic||"–"],["Gender",formatGender(selected)],["Date of Birth",selected.dob ? window.kvDate(selected.dob, {day:'numeric', month:'short', year:'numeric'}, selected.dob) : "–"],["Class",<span style={{background:C.blueBg,color:C.blueTx,fontSize:11,padding:"2px 8px",borderRadius:10}}>{selected.class}</span>],["Enrolment",selected.enrol ? window.kvDate(selected.enrol, {day:'numeric', month:'short', year:'numeric'}, selected.enrol) : "–"],["Monthly Fee",<span style={{fontWeight:500,color:C.green}}>RM {parseFloat(selected.fee).toFixed(2)}</span>]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                  <span style={{color:"var(--color-text-tertiary)"}}>{window.kvT(l)}</span>
                  <span style={{color:"var(--color-text-primary)"}}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead><i className="ti ti-users" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Parent / Guardian")}</CardHead>
            <div style={{padding:"12px 16px"}}>
              {[
                ["Father",selected.father_name||"–"],
                ["Father Phone",selected.father_phone||"–"],
                ["Mother",selected.mother_name||"–"],
                ["Mother Phone",selected.mother_phone||"–"],
                ["Address",selected.father_address||selected.mother_address||selected.address||"–"]
              ].map(([l,v])=>(
                <div key={l} style={{padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                  <div style={{color:"var(--color-text-tertiary)",fontSize:11}}>{window.kvT(l)}</div>
                  <div style={{color:"var(--color-text-primary)"}}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <Btn variant={profileTab==="outstanding"?"amber":"outline"} onClick={()=>{setProfileTab("outstanding");replaceRouteState && replaceRouteState({profileTab:"outstanding"});}}>
            <i className="ti ti-alert-circle" aria-hidden="true"/> {window.kvT("Outstanding")}
            {outstandingItems.length > 0 && <span style={{background:profileTab==="outstanding"?"rgba(255,255,255,0.25)":"var(--color-background-secondary)",color:profileTab==="outstanding"?"#fff":"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:6}}>{outstandingItems.length}</span>}
          </Btn>
          <Btn variant={profileTab==="paid"?"amber":"outline"} onClick={()=>{setProfileTab("paid");replaceRouteState && replaceRouteState({profileTab:"paid"});}}>
            <i className="ti ti-history" aria-hidden="true"/> {window.kvT("Payment History")}
          </Btn>
        </div>

        {/* Outstanding tab */}
        {profileTab === "outstanding" && (
          <Card>
            <CardHead>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%"}}>
                <div><i className="ti ti-receipt-2" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Outstanding Fees")}</div>
                {canCreatePayments && outstandingItems.length > 0 && (
                  <div style={{display:"flex",gap:8}}>
                    {checkedIds.length < outstandingItems.length
                      ? <Btn small variant="outline" onClick={selectAll}>{window.kvT("Select All")}</Btn>
                      : <Btn small variant="outline" onClick={clearAll}>{window.kvT("Clear All")}</Btn>
                    }
                    {checkedIds.length > 0 && (
                      <Btn small variant="amber" onClick={()=>setPayModal(true)}>
                        <i className="ti ti-cash" aria-hidden="true"/> {window.kvT("Pay Selected ({count}) - RM {amount}", {count: checkedIds.length, amount: checkedTotal.toFixed(2)})}
                      </Btn>
                    )}
                  </div>
                )}
              </div>
            </CardHead>
            {outstandingItems.length === 0 ? (
              <div style={{padding:32,textAlign:"center",color:"var(--color-text-tertiary)",fontSize:13}}>
                <i className="ti ti-circle-check" style={{fontSize:32,color:C.green,display:"block",marginBottom:8}} aria-hidden="true"/>
                {window.kvT("All fees paid up to date!")}
              </div>
            ) : (
              <div>
                {outstandingItems.map(it => (
                  <div key={it.id} onClick={()=>canCreatePayments && toggleItem(it.id)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",cursor:canCreatePayments?"pointer":"default",background:selectedItems[it.id]?"var(--color-background-secondary)":"transparent",transition:"background .15s"}}>
                    <div style={{width:26,height:26,borderRadius:7,border:`3px solid ${selectedItems[it.id]?C.amber:C.border}`,background:selectedItems[it.id]?C.amber:"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:0,boxShadow:selectedItems[it.id]?"0 0 0 4px rgba(255,172,0,0.15)":"inset 0 0 0 1px rgba(0,0,0,0.05)",transition:"all .15s"}}>
                      {selectedItems[it.id] ? <i className="ti ti-check" style={{fontSize:12,color:"#fff"}} aria-hidden="true"/> : <span style={{width:10,height:10,borderRadius:3,background:"transparent"}}/>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,color:"var(--color-text-primary)",fontSize:13,marginBottom:2}}>{window.kvPaymentItemLabel(it.type, it.month, it.desc)}</div>
                      <div style={{fontSize:11,color:it.isOverdue?C.red:"var(--color-text-tertiary)"}}>
                        {it.isOverdue ? window.kvT("Overdue") : window.kvT("Due this month")}
                      </div>
                    </div>
                    <div style={{fontWeight:600,fontSize:14,color:it.isOverdue?C.red:"var(--color-text-primary)",flexShrink:0}}>
                      RM {it.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
                {checkedIds.length > 0 && (
                  <div style={{padding:"12px 16px",display:"flex",justifyContent:"flex-end",gap:8,background:"var(--color-background-secondary)"}}>
                    <Btn variant="amber" onClick={()=>setPayModal(true)}>
                      <i className="ti ti-cash" aria-hidden="true"/> {window.kvT("Pay {count} item(s) - RM {amount}", {count: checkedIds.length, amount: checkedTotal.toFixed(2)})}
                    </Btn>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Paid history tab */}
        {profileTab === "paid" && (
          <Card>
            <CardHead><i className="ti ti-history" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Payment History")}</CardHead>
            {stuPaidPayments.length === 0 ? (
              <div style={{padding:24,textAlign:"center",color:"var(--color-text-tertiary)",fontSize:13}}>{window.kvT("No payment records yet.")}</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--color-background-secondary)"}}>
                      {["Date","Type","Period","Amount","Method","Status","Receipt","Action"].map(h=>(
                        <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{window.kvT(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...stuPaidPayments].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p=>(
                      <tr key={p.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"9px 14px",color:"var(--color-text-secondary)"}}>{p.date ? window.kvDate(p.date, {day:'numeric', month:'short', year:'numeric'}, p.date) : "–"}</td>
                        <td style={{padding:"9px 14px",color:"var(--color-text-primary)"}}>{window.kvT(p.type)}</td>
                        <td style={{padding:"9px 14px",color:"var(--color-text-secondary)"}}>{fmtMonthRange(p.month)}</td>
                        <td style={{padding:"9px 14px",fontWeight:500,color:C.green}}>RM {parseFloat(p.amount).toFixed(2)}</td>
                        <td style={{padding:"9px 14px",color:"var(--color-text-secondary)"}}>{window.kvT(p.method||"–")}</td>
                        <td style={{padding:"9px 14px"}}>{statusBadge(p.status)}</td>
                        <td style={{padding:"9px 14px",fontFamily:"monospace",fontSize:11,color:"var(--color-text-primary)"}}>{p.receipt||"–"}</td>
                        <td style={{padding:"9px 14px"}}>
                          {p.receipt ? <Btn small variant="outline" onClick={()=>goReceipt(p)}>{window.kvT("View Receipt")}</Btn> : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
        <div className="print-area kv-student-profile-print-area" aria-label={window.kvT("Student Profile")}>
          <div className="kv-student-profile-print-sheet">
            <header className="kv-profile-print-header">
              <div>
                <div className="kv-profile-print-eyebrow">KINDERVAULT</div>
                <h1>{window.kvT("Student Profile")}</h1>
                <p>{selected.name || "-"}</p>
              </div>
              <div className="kv-profile-print-date">{window.kvDate(new Date(), {day:"numeric", month:"short", year:"numeric"})}</div>
            </header>

            <div className="kv-profile-print-grid">
              <section className="kv-profile-print-section">
                <h2>{window.kvT("Student Details")}</h2>
                <dl>
                  <div><dt>{window.kvT("Student Code")}</dt><dd>{selected.code || "-"}</dd></div>
                  <div><dt>{window.kvT("IC / Birth Cert")}</dt><dd>{selected.ic || "-"}</dd></div>
                  <div><dt>{window.kvT("Gender")}</dt><dd>{formatGender(selected)}</dd></div>
                  <div><dt>{window.kvT("Date of Birth")}</dt><dd>{selected.dob ? window.kvDate(selected.dob, {day:"numeric", month:"short", year:"numeric"}, selected.dob) : "-"}</dd></div>
                  <div><dt>{window.kvT("Class")}</dt><dd>{selected.class || "-"}</dd></div>
                  <div><dt>{window.kvT("Enrolment")}</dt><dd>{selected.enrol ? window.kvDate(selected.enrol, {day:"numeric", month:"short", year:"numeric"}, selected.enrol) : "-"}</dd></div>
                  <div><dt>{window.kvT("Monthly Fee")}</dt><dd>RM {parseFloat(selected.fee || 0).toFixed(2)}</dd></div>
                </dl>
              </section>
              <section className="kv-profile-print-section">
                <h2>{window.kvT("Parent / Guardian")}</h2>
                <dl>
                  <div><dt>{window.kvT("Father")}</dt><dd>{selected.father_name || "-"}</dd></div>
                  <div><dt>{window.kvT("Father Phone")}</dt><dd>{selected.father_phone || "-"}</dd></div>
                  <div><dt>{window.kvT("Mother")}</dt><dd>{selected.mother_name || "-"}</dd></div>
                  <div><dt>{window.kvT("Mother Phone")}</dt><dd>{selected.mother_phone || "-"}</dd></div>
                  <div><dt>{window.kvT("Address")}</dt><dd>{selected.father_address || selected.mother_address || selected.address || "-"}</dd></div>
                </dl>
              </section>
            </div>

            <section className="kv-profile-print-section kv-profile-print-summary">
              <h2>{window.kvT("Payment History")}</h2>
              <div className="kv-profile-print-summary-grid">
                <div><span>{window.kvT("Status")}</span><strong>{window.kvT(selected.status || "-")}</strong></div>
                <div><span>{window.kvT("Outstanding")}</span><strong>{outstandingItems.length}</strong></div>
                <div><span>{window.kvT("Payment Records")}</span><strong>{stuPaidPayments.length}</strong></div>
              </div>
              {stuPaidPayments.length ? (
                <table className="kv-profile-print-table">
                  <thead><tr>{["Date", "Type", "Period", "Amount", "Method", "Status", "Receipt"].map(label => <th key={label}>{window.kvT(label)}</th>)}</tr></thead>
                  <tbody>{[...stuPaidPayments].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(payment => (
                    <tr key={payment.id}>
                      <td>{payment.date ? window.kvDate(payment.date, {day:"numeric", month:"short", year:"numeric"}, payment.date) : "-"}</td>
                      <td>{window.kvT(payment.type || "-")}</td>
                      <td>{fmtMonthRange(payment.month)}</td>
                      <td>RM {parseFloat(payment.amount || 0).toFixed(2)}</td>
                      <td>{window.kvT(payment.method || "-")}</td>
                      <td>{window.kvT(payment.status || "-")}</td>
                      <td>{payment.receipt || "-"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <p className="kv-profile-print-empty">{window.kvT("No payment records yet.")}</p>}
            </section>

            <footer className="kv-profile-print-footer">{window.kvT("Generated by KinderVault")}</footer>
          </div>
        </div>      </div>
    );
  }


  // ── Add / Edit form ───────────────────────────────────────
  if (view === "add" || view === "edit") return (
    <div className="kv-page kv-page--student-form">
      <div className="kv-page-header kv-student-form-page-header">
        <Btn variant="outline" small onClick={backToList} title={window.kvT("Back to students")}><i className="ti ti-arrow-left" aria-hidden="true"/></Btn>
        <h2 className="kv-page-title">{view==="add"?window.kvT("Add New Student"):window.kvT("Edit Student")}</h2>
        {view === "add" && canCreateStudents && scannerEnabled && <Btn variant="outline" onClick={()=>setScannerOpen(true)} style={{marginLeft:"auto"}}><i className="ti ti-scan" aria-hidden="true"/> {window.kvT("Scan Physical Registration Form")}</Btn>}
      </div>

      {scannerOpen && scannerEnabled && <RegistrationScannerModal onClose={()=>setScannerOpen(false)} onApply={applyScannedRegistration} students={students} isAdministrator={isAdministrator}/>} 

      <div className="kv-student-form-layout">
        <Card className="kv-student-form-section">
          <div className="kv-student-form-card-body">
            <div className="kv-student-form-section-head">
              <h3>{window.kvT("Student Information")}</h3>
            </div>

            <div className="kv-student-form-grid kv-student-form-grid--primary">
              <Input label={window.kvT("Child's Name *")} value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/>
              <Input label={window.kvT("MyKid No.")} placeholder="220510-14-5021" value={form.ic||""} onChange={e=>setForm({...form,ic:e.target.value})}/>
            </div>

            <div className="kv-student-form-grid">
              <Input label={window.kvT("Birth Certificate No.")} value={form.birth_cert||""} onChange={e=>setForm({...form,birth_cert:e.target.value})}/>
              <Input label={window.kvT("Date of Birth *")} type="date" value={form.dob||""} onChange={e=>setForm({...form,dob:e.target.value})}/>
            </div>

            <div className="kv-student-form-grid kv-student-form-grid--short">
              <Select label={window.kvT("Gender *")} value={form.gender||""} onChange={e=>setForm({...form,gender:e.target.value})} options={[{value:"M",label:window.kvT("Male")},{value:"F",label:window.kvT("Female")}]} />
              <Input label={window.kvT("Birth Order")} value={form.child_position||""} onChange={e=>setForm({...form,child_position:e.target.value})}/>
              <Input label={window.kvT("Enrolment Date")} type="date" value={form.enrol||""} onChange={e=>setForm({...form,enrol:e.target.value})}/>
            </div>

            <div className="kv-student-form-grid kv-student-form-grid--academic">
              <Select label={window.kvT('Class *')} value={form.class||""} onChange={e=>setForm({...form,class:e.target.value})} options={classes}/>
              <div className="kv-field kv-student-age-field">
                <div className="kv-field-label">{window.kvT("Programme Age")}</div>
                <div className="kv-student-age-options">
                  {["4","5","6"].map(age => (
                    <button key={age} type="button" onClick={()=>setForm({...form,program_age:age,class:classByProgrammeAge[age] || form.class})} className={form.program_age===age ? "is-selected" : ""}>
                      {window.kvT("{age} years", {age})}
                    </button>
                  ))}
                </div>
              </div>

              <div className="kv-field kv-student-package-field">
                <div className="kv-field-label">{window.kvT("Monthly Package")}</div>
                <select className="kv-form-control" value={form.monthly_package||"A"} onChange={e=>setForm({...form,monthly_package:e.target.value,fee:packageAmount(e.target.value)})}>
                  {Object.entries(feeConfig?.monthly_packages || {}).map(([key, item]) => (
                    <option key={key} value={key}>{key} - {window.kvT(item.label)}</option>
                  ))}
                </select>
                <div className="kv-student-fee-field">
                  <div className="kv-field-label">{window.kvT('Monthly Fee (RM)')}</div>
                  <div className="kv-money-input">
                    <span>RM</span>
                    <input className="kv-form-control" type="number" value={form.fee} disabled/>
                  </div>
                </div>
              </div>
            </div>

            <div className="kv-field kv-student-annual-field">
              <div className="kv-field-label">{window.kvT("Annual Fee Options")}</div>
              <div className="kv-student-annual-options">
                {[
                  ["wants_uniform","Uniform"],
                  ["wants_sports_uniform","Baju Sukan"],
                  ["wants_tudung","Tudung"],
                  ["wants_iqra","Kelas IQRA"]
                ].map(([key,label])=>(
                  <label key={key}>
                    <input type="checkbox" checked={!!form[key]} onChange={e=>setForm({...form,[key]:e.target.checked ? 1 : 0})}/>
                    {window.kvT(label)}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </Card>

        <Card className="kv-student-form-section">
          <div className="kv-student-form-card-body">
            <div className="kv-student-form-section-head">
              <h3>{window.kvT("Parent / Guardian Information")}</h3>
            </div>

            <div className="kv-student-guardian-columns">
              <section className="kv-student-guardian-panel">
                <h4>{window.kvT("Father")}</h4>
                <div className="kv-student-guardian-grid">
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Name")} value={form.father_name||""} onChange={e=>setForm({...form,father_name:e.target.value})}/></div>
                  <Input label={window.kvT("IC No.")} value={form.father_ic||""} onChange={e=>setForm({...form,father_ic:e.target.value})}/>
                  <Input label={window.kvT("Phone No.")} placeholder="012-3456789" value={form.father_phone||""} onChange={e=>setForm({...form,father_phone:e.target.value})}/>
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Home Address")} value={form.father_address||""} onChange={e=>setForm({...form,father_address:e.target.value})}/></div>
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Occupation")} value={form.father_job||""} onChange={e=>setForm({...form,father_job:e.target.value})}/></div>
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Employer Name and Address")} value={form.father_employer||""} onChange={e=>setForm({...form,father_employer:e.target.value})}/></div>
                </div>
              </section>

              <section className="kv-student-guardian-panel">
                <h4>{window.kvT("Mother")}</h4>
                <div className="kv-student-guardian-grid">
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Name")} value={form.mother_name||""} onChange={e=>setForm({...form,mother_name:e.target.value})}/></div>
                  <Input label={window.kvT("IC No.")} value={form.mother_ic||""} onChange={e=>setForm({...form,mother_ic:e.target.value})}/>
                  <Input label={window.kvT("Phone No.")} placeholder="012-3456789" value={form.mother_phone||""} onChange={e=>setForm({...form,mother_phone:e.target.value})}/>
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Home Address")} value={form.mother_address||""} onChange={e=>setForm({...form,mother_address:e.target.value})}/></div>
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Occupation")} value={form.mother_job||""} onChange={e=>setForm({...form,mother_job:e.target.value})}/></div>
                  <div className="kv-student-guardian-span-full"><Input label={window.kvT("Employer Name and Address")} value={form.mother_employer||""} onChange={e=>setForm({...form,mother_employer:e.target.value})}/></div>
                </div>
              </section>
            </div>

            <div className="kv-student-form-grid kv-student-form-grid--system">
              <Input label={window.kvT("Parent / Guardian Summary")} value={derivePrimaryParent(form)} disabled/>
              <Select label={window.kvT('Status')} value={form.status||""} onChange={e=>setForm({...form,status:e.target.value})} options={["Active","Inactive","Graduated"].map(status => ({value:status,label:window.kvT(status)}))}/>
            </div>
          </div>
        </Card>
      </div>

      <div className="kv-student-form-actions">
        <Btn onClick={save} style={{opacity:loading?0.6:1}}>
          {loading?<><i className="ti ti-loader" aria-hidden="true"/> {window.kvT('Saving...')}</>:<><i className="ti ti-device-floppy" aria-hidden="true"/> {window.kvT('Save Student')}</>}
        </Btn>
        <Btn variant="outline" onClick={backToList}>{window.kvT('Cancel')}</Btn>
      </div>
    </div>
  );

  // ── List view ─────────────────────────────────────────────
  const printStudentList = () => {
    const previousTitle = document.title;
    const printedAt = window.kvDate(new Date(), {year:"numeric", month:"2-digit", day:"2-digit"}, "");
    document.title = `${window.kvT("Student List")} - ${printedAt}`;
    document.documentElement.classList.add("kv-printing-students");
    document.body.classList.add("kv-printing-students");
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        document.documentElement.classList.remove("kv-printing-students");
        document.body.classList.remove("kv-printing-students");
        document.title = previousTitle;
      }
    }, 100);
  };

  return (
    <div className="kv-page kv-page--students">
      <div className="kv-page-header no-print" style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 className="kv-page-title"><i className="ti ti-users" style={{marginRight:8}} aria-hidden="true"/>{window.kvT('Students')}</h2>
        <div style={{display:"flex",gap:8,marginLeft:"auto",flexWrap:"wrap"}}>
          <Btn variant="outline" onClick={printStudentList}><i className="ti ti-printer" aria-hidden="true"/> {window.kvT("Print")}</Btn>
          {canCreateStudents && <Btn onClick={openAdd}><i className="ti ti-user-plus" aria-hidden="true"/> {window.kvT('Add Student')}</Btn>}
        </div>
      </div>

      <Card className="kv-filter-card" style={{marginBottom:16}}>
        <div className="kv-table-toolbar" style={{padding:"10px 14px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div className="kv-search-field" style={{position:"relative",flex:1,minWidth:140}}>
            <i className="ti ti-search" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--color-text-tertiary)"}} aria-hidden="true"/>
            <input value={search} onChange={e=>{const value=e.target.value;setSearch(value);replaceRouteState && replaceRouteState({search:value});}} placeholder={window.kvT('Search name, IC, parent...')} style={{width:"100%",padding:"6px 10px 6px 28px",fontSize:12,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}}/>
          </div>
          <select value={classF} onChange={e=>{const value=e.target.value;setClassF(value);replaceRouteState && replaceRouteState({classF:value});}} style={{padding:"6px 10px",fontSize:12,border:"0.5px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-secondary)"}}>
            <option value="">{window.kvT('All Classes')}</option>
            {classes.map(c=><option key={c}>{c}</option>)}
          </select>
          {(search||classF)&&<Btn variant="outline" small onClick={()=>{setSearch("");setClassF("");replaceRouteState && replaceRouteState({search:"",classF:""});}}>{window.kvT("Clear")}</Btn>}
        </div>
      </Card>

      <Card className="kv-table-card">
        <CardHead><i className="ti ti-table" style={{marginRight:6}} aria-hidden="true"/>{window.kvT('Student List')} <span style={{background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{filtered.length}</span></CardHead>
        {filtered.length ? (
          <div className="kv-table-scroll" style={{overflowX:"auto"}}>
            <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--color-background-secondary)"}}>
                  {["#",window.kvT('Student'),window.kvT('IC Number'),window.kvT('Class'),window.kvT('Gender'),window.kvT('Parent'),window.kvT('Phone'),window.kvT('Fee'),window.kvT('Status'),window.kvT('Actions')].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s,i)=>(
                  <tr key={s.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    <td style={{padding:"9px 12px",color:"var(--color-text-tertiary)",fontSize:11}}>{i+1}</td>
                    <td style={{padding:"9px 12px"}}>
                      <div style={{fontWeight:500,color:"var(--color-text-primary)"}}>{s.name}</div>
                      <div style={{fontSize:10,color:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{s.code}</div>
                    </td>
                    <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:"var(--color-text-secondary)"}}>{s.ic||"–"}</td>
                    <td style={{padding:"9px 12px"}}><span style={{background:C.blueBg,color:C.blueTx,fontSize:11,padding:"2px 8px",borderRadius:10}}>{s.class}</span></td>
                    <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{formatGender(s)}</td>
                    <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{s.parent}</td>
                    <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{s.phone||"–"}</td>
                    <td style={{padding:"9px 12px",fontWeight:500,color:C.green}}>RM {parseFloat(s.fee).toFixed(2)}</td>
                    <td style={{padding:"9px 12px"}}>{statusBadge(s.status)}</td>
                    <td style={{padding:"9px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <Btn small variant="outline" onClick={()=>openProfile(s)}><i className="ti ti-eye" aria-hidden="true"/></Btn>
                        {canUpdateStudents && <Btn small variant="outline" onClick={()=>openEdit(s)} title={window.kvT("Edit student")}><i className="ti ti-edit" aria-hidden="true"/></Btn>}
                        {canDeleteStudents && <Btn small variant="danger" onClick={()=>del(s)} title={window.kvT("Delete student")}><i className="ti ti-trash" aria-hidden="true"/></Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="users" text={search?window.kvT('No students match your search.'):window.kvT('No students yet.')} action={<Btn onClick={openAdd} style={{marginTop:12}}>{window.kvT('Add First Student')}</Btn>}/>}
      </Card>

      <div className="print-area kv-student-list-print-area" aria-label={window.kvT("Student List")}>
        <div className="kv-student-list-print-sheet">
          <header className="kv-list-print-header">
            <div>
              <h1>{window.kvT("Student List")}</h1>
              <p>{window.kvT("Students")} · {filtered.length}</p>
            </div>
            <span>{window.kvDate(new Date(), {day:"numeric", month:"short", year:"numeric"})}</span>
          </header>
          {filtered.length ? (
            <table className="kv-list-print-table">
              <thead><tr>
                {["#", "Student", "Student Code", "IC Number", "Class", "Gender", "Parent", "Phone", "Fee", "Status"].map(label => <th key={label}>{window.kvT(label)}</th>)}
              </tr></thead>
              <tbody>{filtered.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td><strong>{student.name || "-"}</strong></td>
                  <td>{student.code || "-"}</td>
                  <td>{student.ic || "-"}</td>
                  <td>{student.class || "-"}</td>
                  <td>{formatGender(student)}</td>
                  <td>{student.parent || "-"}</td>
                  <td>{student.phone || "-"}</td>
                  <td>RM {parseFloat(student.fee || 0).toFixed(2)}</td>
                  <td>{window.kvT(student.status || "-")}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="kv-list-print-empty">{window.kvT("No students yet.")}</p>}
        </div>
      </div>
    </div>
  );
};
