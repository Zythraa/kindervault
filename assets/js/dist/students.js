const StudentsPage = ({
  students,
  classesList,
  setStudents,
  setPage,
  setFlash,
  payments,
  setPayments,
  goReceipt,
  navigationState = {},
  navigationKey,
  navigate,
  goBack,
  replaceRouteState,
  feeConfig,
  permissions = [],
  isAdministrator = false,
  scannerEnabled = true
}) => {
  const [view, setView] = React.useState(navigationState.view || "list");
  const [selected, setSelected] = React.useState(null);
  const [search, setSearch] = React.useState(navigationState.search || "");
  const [classF, setClassF] = React.useState(navigationState.classF || "");
  const [loading, setLoading] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const packageAmount = pkg => parseFloat(feeConfig?.monthly_packages?.[pkg]?.amount || 0);
  const annual = feeConfig?.annual || {};
  const blankForm = {
    name: "",
    ic: "",
    birth_cert: "",
    gender: "M",
    dob: "",
    child_position: "",
    program_age: "5",
    monthly_package: "A",
    wants_uniform: 0,
    wants_sports_uniform: 0,
    wants_tudung: 0,
    wants_iqra: 0,
    class: "Intelek",
    parent: "",
    phone: "",
    address: "",
    father_name: "",
    father_ic: "",
    father_address: "",
    father_job: "",
    father_employer: "",
    father_phone: "",
    mother_name: "",
    mother_ic: "",
    mother_address: "",
    mother_job: "",
    mother_employer: "",
    mother_phone: "",
    fee: packageAmount("A"),
    status: "Active",
    enrol: new Date().toISOString().split("T")[0]
  };
  const [form, setForm] = React.useState(navigationState.form || blankForm);
  const [payMonthF, setPayMonthF] = React.useState(navigationState.payMonthF || "");
  const paymentMethods = ["Cash", "Bank Transfer", "QR DuitNow", "Cheque"];
  const [profileTab, setProfileTab] = React.useState(navigationState.profileTab || "outstanding");
  const [selectedItems, setSelectedItems] = React.useState({});
  const [payModal, setPayModal] = React.useState(false);
  const [payForm, setPayForm] = React.useState({
    date: new Date().toISOString().split("T")[0],
    method: "Cash",
    ref: "",
    notes: "",
    amount: ""
  });
  const [profileReceipt, setProfileReceipt] = React.useState(navigationState.profileReceipt || null);
  const [saving, setSaving] = React.useState(false);
  const paymentMutationInFlight = React.useRef(false);
  const paymentRefreshInFlight = React.useRef(false);
  const [paymentRefreshError, setPaymentRefreshError] = React.useState(false);
  const [refreshingPayments, setRefreshingPayments] = React.useState(false);
  const canCreateStudents = canUsePermission(permissions, "students.create", isAdministrator);
  const canUpdateStudents = canUsePermission(permissions, "students.update", isAdministrator);
  const canDeleteStudents = canUsePermission(permissions, "students.delete", isAdministrator);
  const canCreatePayments = canUsePermission(permissions, "payments.create", isAdministrator);
  const canPrintReceipts = canUsePermission(permissions, "receipts.print", isAdministrator);
  const canViewDevelopment = canUsePermission(permissions, "development.view", isAdministrator);
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
      setFlash({
        msg: window.kvT("Payment data refreshed successfully."),
        type: "success"
      });
    } catch (error) {
      setFlash({
        msg: window.kvT("Unable to refresh payment data. Please try again."),
        type: "danger"
      });
    } finally {
      paymentRefreshInFlight.current = false;
      setRefreshingPayments(false);
    }
  };
  const paymentRefreshNotice = paymentRefreshError && React.createElement("div", {
    role: "alert",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 14px",
      marginBottom: 16,
      borderRadius: 8,
      border: "1px solid var(--color-border-secondary)",
      background: "var(--color-background-secondary)",
      color: "var(--color-text-primary)",
      fontSize: 13
    }
  }, React.createElement("span", null, window.kvT("Payment action succeeded, but the latest payment data could not be refreshed. Retry the refresh.")), React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: retryPaymentRefresh,
    disabled: refreshingPayments || saving
  }, refreshingPayments ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "ti ti-loader",
    "aria-hidden": "true"
  }), " ", window.kvT("Refreshing...")) : window.kvT("Retry refresh")));
  const classByProgrammeAge = Object.fromEntries((classesList || []).filter(item => item && item.age_group).map(item => [String(item.age_group), item.name]));
  if (!classByProgrammeAge["4"]) classByProgrammeAge["4"] = "Permata";
  if (!classByProgrammeAge["5"]) classByProgrammeAge["5"] = "Intelek";
  if (!classByProgrammeAge["6"]) classByProgrammeAge["6"] = "Ceria";
  const classes = classesList ? classesList.map(c => c.name) : [];
  const filtered = [...students].filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || (s.ic || "").includes(q) || (s.parent || "").toLowerCase().includes(q)) && (!classF || s.class === classF);
  }).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    sensitivity: "base"
  }));
  const formatGender = student => student?.gender === "M" ? window.kvT("Male") : student?.gender === "F" ? window.kvT("Female") : "–";
  const derivePrimaryParent = f => [f.father_name, f.mother_name].filter(Boolean).join(" / ");
  const derivePrimaryPhone = f => f.father_phone || f.mother_phone || f.phone || "";
  const derivePrimaryAddress = f => f.father_address || f.mother_address || f.address || "";
  const normalizeStudentPayload = f => ({
    ...f,
    parent: derivePrimaryParent(f),
    phone: derivePrimaryPhone(f),
    address: derivePrimaryAddress(f),
    fee: packageAmount(f.monthly_package || "A"),
    wants_uniform: f.wants_uniform ? 1 : 0,
    wants_sports_uniform: f.wants_sports_uniform ? 1 : 0,
    wants_tudung: f.wants_tudung ? 1 : 0,
    wants_iqra: f.wants_iqra ? 1 : 0
  });
  const applyScannedRegistration = review => {
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
      program_age: selectedAge ? String(selectedAge) : previous.program_age || "5",
      class: mappedClass && classes.includes(mappedClass) ? mappedClass : previous.class || classes[0] || "",
      wants_tudung: student.gender === "F" ? 1 : student.gender === "M" ? 0 : previous.wants_tudung ?? 0,
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
      mother_phone: mother.phone || ""
    }));
    setScannerOpen(false);
    setFlash({
      msg: window.kvT("Reviewed scan values filled the student form. Check every field before saving."),
      type: "success"
    });
  };
  const studentFormFromRecord = student => ({
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
    const selectedStudent = state.studentId ? students.find(student => String(student.id) === String(state.studentId)) : null;
    setSearch(state.search || "");
    setClassF(state.classF || "");
    setPayMonthF(state.payMonthF || "");
    setProfileTab(state.profileTab || "outstanding");
    setSelectedItems({});
    setPayModal(false);
    setPayForm({
      date: new Date().toISOString().split("T")[0],
      method: "Cash",
      ref: "",
      notes: "",
      amount: ""
    });
    setProfileReceipt(state.profileReceipt || null);
    setScannerOpen(false);
    setSelected(selectedStudent || null);
    if (requestedView === "edit" && selectedStudent) setForm(studentFormFromRecord(selectedStudent));
    if (requestedView === "add") setForm(state.form || blankForm);
    setView((requestedView === "profile" || requestedView === "edit") && !selectedStudent ? "list" : requestedView);
  }, [navigationKey]);
  const listState = () => ({
    search,
    classF
  });
  const backToList = () => goBack({
    page: "students",
    state: {
      ...listState(),
      view: "list"
    }
  });
  const profileState = (extra = {}) => ({
    ...listState(),
    view: "profile",
    studentId: selected?.id || null,
    payMonthF,
    profileTab,
    ...extra
  });
  const openAdd = () => {
    if (!canCreateStudents) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to add students."),
        type: "danger"
      });
      return;
    }
    navigate({
      page: "students",
      state: {
        ...listState(),
        view: "add"
      }
    });
  };
  const openEdit = s => {
    if (!canUpdateStudents) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to edit students."),
        type: "danger"
      });
      return;
    }
    navigate({
      page: "students",
      state: {
        ...listState(),
        view: "edit",
        studentId: s.id
      }
    });
  };
  const openProfile = s => {
    navigate({
      page: "students",
      state: {
        ...listState(),
        view: "profile",
        studentId: s.id,
        payMonthF: "",
        profileTab: "outstanding"
      }
    });
  };
  const openStudentDevelopment = () => {
    if (!selected || !canViewDevelopment) return;
    navigate({
      page: "development",
      state: {
        module: "borang",
        screen: "history",
        viewMode: "fill",
        studentId: selected.id
      }
    });
  };
  const save = async () => {
    if (loading) return;
    if (view === "add" && !canCreateStudents || view === "edit" && !canUpdateStudents) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to save this student."),
        type: "danger"
      });
      return;
    }
    const payload = normalizeStudentPayload(form);
    if (!payload.name || !payload.dob || !payload.class || !payload.parent) {
      setFlash({
        msg: window.kvT("Please fill in all required fields."),
        type: "danger"
      });
      return;
    }
    setLoading(true);
    try {
      if (view === "add") {
        const res = await api.post('api/students.php', payload);
        if (res.error) {
          setFlash({
            msg: res.error,
            type: "danger"
          });
          return;
        }
        setStudents(prev => [...prev, res]);
        setFlash({
          msg: window.kvT("Student {name} added successfully.", {
            name: payload.name
          }),
          type: "success"
        });
      } else {
        const res = await api.put(`api/students.php?id=${selected.id}`, payload);
        if (res.error) {
          setFlash({
            msg: res.error,
            type: "danger"
          });
          return;
        }
        setStudents(prev => prev.map(s => s.id === selected.id ? res : s));
        setFlash({
          msg: window.kvT("Student updated successfully."),
          type: "success"
        });
      }
      backToList();
    } catch (e) {
      setFlash({
        msg: window.kvT("Network error. Please try again."),
        type: "danger"
      });
    } finally {
      setLoading(false);
    }
  };
  const del = async s => {
    if (!canDeleteStudents) {
      setFlash({
        msg: window.kvT("Access Denied. You do not have permission to delete students."),
        type: "danger"
      });
      return;
    }
    if (!window.confirm(window.kvT("Delete {name}? This will also remove their payment records.", {
      name: s.name
    }))) return;
    try {
      const res = await api.delete(`api/students.php?id=${s.id}`);
      if (res.error) {
        setFlash({
          msg: res.error,
          type: "danger"
        });
        return;
      }
      setStudents(prev => prev.filter(x => x.id !== s.id));
      setFlash({
        msg: window.kvT("Student deleted."),
        type: "success"
      });
    } catch (e) {
      setFlash({
        msg: window.kvT("Failed to delete student."),
        type: "danger"
      });
    }
  };
  const allocateMonthlyPaidAmounts = (stuPays, fee) => {
    return window.kvAllocateMonthlyPaidAmounts(stuPays, fee);
  };
  const computeOutstandingItems = stu => {
    return window.kvComputeStudentOutstanding(stu, payments, feeConfig, {
      groupMonthly: true
    });
  };
  if (view === "profile" && selected) {
    const outstandingItems = computeOutstandingItems(selected);
    const stuPaidPayments = (payments || []).filter(p => parseInt(p.student_id) === parseInt(selected.id) && ["paid", "advance", "partial", "voided"].includes(String(p.status || "").toLowerCase()));
    const checkedIds = Object.keys(selectedItems).filter(k => selectedItems[k]);
    const checkedItems = outstandingItems.filter(it => checkedIds.includes(it.id));
    const checkedTotal = checkedItems.reduce((s, it) => s + it.amount, 0);
    const toggleItem = id => setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    const selectAll = () => {
      const all = {};
      outstandingItems.forEach(it => all[it.id] = true);
      setSelectedItems(all);
    };
    const clearAll = () => setSelectedItems({});
    const openPayModal = () => {
      if (!checkedItems.length) return;
      setPayForm(prev => ({
        ...prev,
        amount: checkedTotal.toFixed(2)
      }));
      setPayModal(true);
    };
    const fmtMonthRange = monthStr => {
      const ms = (monthStr || "").split(",").map(m => m.trim()).filter(Boolean);
      if (!ms.length) return "–";
      const fmt = m => window.kvDate(new Date(m + "-01"), {
        month: "short",
        year: "numeric"
      }, m);
      return ms.length === 1 ? fmt(ms[0]) : `${fmt(ms[0])} – ${fmt(ms[ms.length - 1])}`;
    };
    const paySelected = async () => {
      if (saving || paymentMutationInFlight.current) return;
      if (!canCreatePayments) {
        setFlash({
          msg: window.kvT("Access Denied. You do not have permission to record payments."),
          type: "danger"
        });
        return;
      }
      if (!checkedItems.length) return;
      const customAmount = parseFloat(payForm.amount || 0);
      if (!Number.isFinite(customAmount) || customAmount <= 0 || customAmount > checkedTotal + 0.005) {
        setFlash({
          msg: window.kvT("Payment amount must be greater than zero and cannot exceed the selected outstanding balance."),
          type: "danger"
        });
        return;
      }
      let remainingAmount = customAmount;
      const allocatedItems = [];
      checkedItems.forEach(item => {
        if (remainingAmount <= 0) return;
        const amount = Math.min(item.amount, remainingAmount);
        if (amount <= 0) return;
        allocatedItems.push({
          type: item.type,
          amount: Number(amount.toFixed(2)),
          month: item.month,
          status: amount + 0.005 < item.amount ? "Partial" : "Paid"
        });
        remainingAmount -= amount;
      });
      paymentMutationInFlight.current = true;
      setSaving(true);
      try {
        const payload = {
          student_id: selected.id,
          date: payForm.date,
          method: payForm.method,
          ref: payForm.ref,
          notes: payForm.notes,
          status: customAmount + 0.005 < checkedTotal ? "Partial" : "Paid",
          items: allocatedItems
        };
        const res = await api.post("api/payments.php", payload);
        if (res.error) {
          setFlash({
            msg: res.error,
            type: "danger"
          });
          return;
        }
        const newPays = res.payments || [];
        if (typeof setPayments === "function") {
          setPayments(prev => [...prev, ...newPays]);
        }
        const receiptItems = (newPays.length ? newPays : allocatedItems).map((item, index) => ({
          id: item.id || `receipt-item-${index}`,
          type: item.type,
          month: item.month || "",
          status: item.status || allocatedItems[index]?.status || "Paid",
          desc: item.desc || window.kvPaymentItemLabel(item.type, item.month),
          amount: parseFloat(item.amount || 0),
          balance_after: item.balance_after,
          allocation_json: item.allocation_json
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
          outstandingBalance: Math.max(0, Number((checkedTotal - customAmount).toFixed(2))),
          payments: newPays
        };
        try {
          await refreshPaymentData();
        } catch (error) {
          setPaymentRefreshError(true);
          setFlash({
            msg: window.kvT("Payment action succeeded, but the latest payment data could not be refreshed. Retry the refresh."),
            type: "danger"
          });
        }
        setPayModal(false);
        setSelectedItems({});
        navigate({
          page: "students",
          state: profileState({
            profileReceipt: receiptData
          })
        });
      } catch (e) {
        setFlash({
          msg: window.kvT("Network error. Please try again."),
          type: "danger"
        });
      } finally {
        paymentMutationInFlight.current = false;
        setSaving(false);
      }
    };
    const openPaymentReceipt = async payment => {
      if (!payment || !payment.receipt) return;
      try {
        const res = await api.get(`api/payments.php?id=${payment.id}`);
        if (res.error) {
          setFlash({
            msg: res.error,
            type: "danger"
          });
          return;
        }
        const receiptPreview = {
          receipt: res.receipt,
          date: res.date || "",
          method: res.method || "",
          ref: res.ref || "",
          notes: res.notes || "",
          student: selected,
          items: [{
            id: res.id,
            type: res.type,
            month: res.month || "",
            status: res.status || "Paid",
            desc: res.type === "Monthly Fee" ? window.kvT("Monthly Fee ({period})", {
              period: fmtMonthRange(res.month)
            }) : window.kvT(res.type),
            amount: parseFloat(res.amount || 0),
            balance_after: res.balance_after,
            allocation_json: res.allocation_json
          }],
          total: parseFloat(res.amount || 0),
          outstandingBalance: res.balance_after === null || res.balance_after === undefined ? null : parseFloat(res.balance_after)
        };
        navigate({
          page: "students",
          state: profileState({
            profileReceipt: receiptPreview
          })
        });
      } catch (e) {
        setFlash({
          msg: window.kvT("Unable to load receipt details."),
          type: "danger"
        });
      }
    };
    const formatPhoneForWA = phone => {
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
      const issuedDate = profileReceipt?.date ? window.kvDate(profileReceipt.date, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }, profileReceipt.date) : window.kvDate(new Date(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const itemText = (profileReceipt?.items || []).map(it => window.kvPaymentItemLabel(it.type, it.month, it.desc)).filter(Boolean).join(", ");
      const locale = window.kvLang || "en";
      const text = locale === "ms" ? `Salam, kami telah menerima pembayaran anda sebanyak RM ${amount}${itemText ? ` untuk ${itemText}` : ""}. Terima kasih. Nombor resit anda ialah ${receiptNo}, dikeluarkan pada ${issuedDate}.` : `Salam/Hi, we have received your payment of RM ${amount}${itemText ? ` for ${itemText}` : ""}. Thank you. Your receipt number is ${receiptNo}, issued on ${issuedDate}.`;
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank");
    };
    const printStudentProfile = () => {
      const previousTitle = document.title;
      const printedAt = window.kvDate(new Date(), {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }, "");
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
    const formatReceiptPeriod = value => {
      const values = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
      if (!values.length) return {
        label: "",
        count: 0
      };
      const parsed = values.map(value => {
        const key = /^\d{4}$/.test(value) ? `${value}-01` : value;
        const date = new Date(`${key}-01`);
        return {
          key: value,
          date,
          time: date.getTime()
        };
      }).filter(item => !Number.isNaN(item.time)).sort((a, b) => a.time - b.time);
      const labels = parsed.map(item => window.kvDate(item.date, {
        month: "short",
        year: "numeric"
      }, item.key));
      if (!labels.length) return {
        label: values.join(", "),
        count: values.length
      };
      let label = labels.join(", ");
      if (parsed.length > 1) {
        const contiguous = parsed.every((item, index) => index === 0 || item.date.getFullYear() * 12 + item.date.getMonth() - (parsed[index - 1].date.getFullYear() * 12 + parsed[index - 1].date.getMonth()) === 1);
        label = contiguous ? `${labels[0]} - ${labels[labels.length - 1]}` : labels.join(", ");
      }
      return {
        label,
        count: parsed.length
      };
    };
    if (profileReceipt) {
      const s = profileReceipt.student;
      const receiptItems = (profileReceipt.items || []).map((item, index) => ({
        ...item,
        id: item.id || `receipt-item-${index}`,
        amount: parseFloat(item.amount || 0)
      }));
      const monthlyItems = receiptItems.filter(item => item.type === "Monthly Fee");
      const receiptMonths = [...new Set(monthlyItems.flatMap(item => window.kvGetFullySettledReceiptMonths(item)))];
      const formattedOverallPeriod = formatReceiptPeriod(receiptMonths.join(","));
      const overallPeriod = monthlyItems.length ? formattedOverallPeriod.label ? formattedOverallPeriod : {
        label: window.kvT("No month fully settled"),
        count: 0
      } : formattedOverallPeriod;
      const receiptTotal = receiptItems.reduce((total, item) => total + item.amount, 0);
      const receiptBalance = Number.isFinite(Number(profileReceipt.outstandingBalance)) ? Math.max(0, Number(profileReceipt.outstandingBalance)) : receiptItems.length > 0 && receiptItems.every(it => it.balance_after !== null && it.balance_after !== undefined && it.balance_after !== '') ? receiptItems.reduce((sum, it) => sum + parseFloat(it.balance_after || 0), 0) : null;
      const receiptStatus = receiptItems.some(item => item.status === "Voided") ? "Voided" : receiptBalance !== null && receiptBalance > 0.005 || receiptItems.some(item => item.status === "Partial") ? "Partial" : receiptItems.some(item => item.status === "Advance") ? "Advance" : "Paid";
      const receiptDate = profileReceipt.date ? window.kvDate(profileReceipt.date, {
        day: "numeric",
        month: "short",
        year: "numeric"
      }, profileReceipt.date) : window.kvDate(new Date(), {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const receiptType = receiptItems.length > 1 ? window.kvT("Multiple Payments") : window.kvT(receiptItems[0]?.type || "Payment");
      const isCompactReceipt = receiptItems.length > 1 || receiptItems.some(item => window.kvParseAllocationJson(item?.allocation_json).length > 2);
      return React.createElement("div", {
        className: "kv-page kv-page--receipt-preview kv-page--student-receipt"
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
        onClick: () => goBack({
          page: "students",
          state: profileState()
        }),
        title: window.kvT("Back to student profile")
      }, React.createElement("i", {
        className: "ti ti-arrow-left",
        "aria-hidden": "true"
      })), React.createElement("h2", {
        className: "kv-page-title"
      }, window.kvT("Receipt Preview")), receiptStatus !== "Voided" && React.createElement(Btn, {
        small: true,
        variant: "outline",
        onClick: sendReceiptWhatsApp,
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
        onClick: () => {
          const orig = document.title;
          const issueDate = (profileReceipt.date || new Date().toISOString().split('T')[0]).replace(/[^\d-]/g, '');
          document.title = `${issueDate}_${s.name}_${s.parent}_${profileReceipt.receipt}`;
          setTimeout(() => {
            window.print();
            document.title = orig;
          }, 100);
        },
        style: {
          background: C.blue,
          color: "#fff",
          border: "none"
        }
      }, React.createElement("i", {
        className: "ti ti-printer",
        "aria-hidden": "true"
      }), " ", window.kvT("Print / PDF")), React.createElement(Btn, {
        small: true,
        variant: "outline",
        onClick: () => goBack({
          page: "students",
          state: profileState()
        })
      }, React.createElement("i", {
        className: "ti ti-check",
        "aria-hidden": "true"
      }), " ", window.kvT("Done"))), paymentRefreshNotice, React.createElement("div", {
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
      }), " ", window.kvT(receiptStatus === "Voided" ? "Voided Receipt" : "Official Receipt")), React.createElement("div", {
        className: "kv-receipt-school-name",
        "aria-label": SCHOOL
      }, React.createElement("span", {
        className: "kv-receipt-school-name-line"
      }, "Tadika Permata Intelek Ceria"), React.createElement("span", {
        className: "kv-receipt-school-name-line"
      }, "Taska Rahiza")), React.createElement("div", {
        className: "kv-receipt-school-address"
      }, "No. 10-G & 12-G, Jalan SP3/2", React.createElement("br", null), "Taman Saujana Puchong", React.createElement("br", null), "47110 Puchong")), React.createElement("div", {
        className: "kv-receipt-meta-card"
      }, React.createElement("div", {
        className: "kv-receipt-meta-title"
      }, window.kvT("RECEIPT DETAILS")), React.createElement("div", {
        className: "kv-receipt-meta-grid"
      }, React.createElement("span", null, window.kvT("Receipt No."), ":"), React.createElement("strong", {
        className: "kv-receipt-number"
      }, profileReceipt.receipt), React.createElement("span", null, window.kvT("Date Issued:")), React.createElement("strong", null, receiptDate), React.createElement("span", null, window.kvT("Payment Type:")), React.createElement("strong", null, receiptType)))), React.createElement("section", {
        className: "kv-receipt-student-card"
      }, React.createElement("div", {
        className: "kv-receipt-student-grid"
      }, React.createElement("div", null, React.createElement("div", {
        className: "kv-receipt-field-label"
      }, window.kvT("Student")), React.createElement("div", {
        className: "kv-receipt-field-value"
      }, s.name)), React.createElement("div", null, React.createElement("div", {
        className: "kv-receipt-field-label"
      }, window.kvT("Class")), React.createElement("div", {
        className: "kv-receipt-field-value"
      }, s.class)), React.createElement("div", null, React.createElement("div", {
        className: "kv-receipt-field-label"
      }, window.kvT("Parent / Guardian")), React.createElement("div", {
        className: "kv-receipt-field-value"
      }, s.parent)), React.createElement("div", null, React.createElement("div", {
        className: "kv-receipt-field-label"
      }, window.kvT("Fee Period")), React.createElement("div", {
        className: "kv-receipt-field-value"
      }, overallPeriod.label || "—", overallPeriod.count > 1 ? ` (${overallPeriod.count} ${window.kvT("months")})` : "")))), overallPeriod.label && React.createElement("div", {
        className: "kv-receipt-period-banner",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          margin: "16px 0",
          padding: "14px 18px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #f3edff 0%, #faf8ff 100%)",
          border: "1px solid #dfd2f5"
        }
      }, React.createElement("div", null, React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#7750a8"
        }
      }, window.kvT(monthlyItems.length ? "Paid Fee Months" : "Fee months covered")), React.createElement("div", {
        style: {
          fontSize: 17,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginTop: 3
        }
      }, overallPeriod.label)), overallPeriod.count > 1 && React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: "#7750a8",
          whiteSpace: "nowrap"
        }
      }, overallPeriod.count, " ", window.kvT("months"))), React.createElement("section", {
        className: "kv-receipt-payment-section"
      }, React.createElement("div", {
        className: "kv-receipt-section-heading"
      }, React.createElement("div", null, React.createElement("span", null, window.kvT("Payment Summary")), React.createElement("small", null, window.kvT("Official payment document"))), React.createElement("span", {
        className: "kv-receipt-paid-badge",
        style: receiptStatus === "Voided" ? {
          background: "#eeeeee",
          color: "#555555"
        } : receiptStatus === "Partial" ? {
          background: "#fff3cd",
          color: "#8a5a00"
        } : undefined
      }, React.createElement("i", {
        className: "ti ti-circle-check-filled",
        "aria-hidden": "true"
      }), " ", window.kvT(receiptStatus === "Voided" ? "Voided" : receiptStatus === "Partial" ? "Partial Payment" : receiptStatus === "Advance" ? "Advance Payment" : "Paid"))), React.createElement("table", {
        className: "kv-receipt-items-table"
      }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, window.kvT("Description")), React.createElement("th", null, window.kvT("Fee Period")), React.createElement("th", null, window.kvT("Amount (RM)")))), React.createElement("tbody", null, receiptItems.map((item, index) => {
        const formattedItemPeriod = item.type === "Monthly Fee" ? formatReceiptPeriod(window.kvGetFullySettledReceiptMonths(item).join(',')) : {
          label: "",
          count: 0
        };
        const itemPeriod = item.type === "Monthly Fee" && !formattedItemPeriod.label ? {
          label: window.kvT("No month fully settled"),
          count: 0
        } : formattedItemPeriod;
        return React.createElement("tr", {
          key: item.id || index
        }, React.createElement("td", null, item.type === "Monthly Fee" ? window.kvT("Monthly Fee") : item.desc || window.kvPaymentItemLabel(item.type, item.month)), React.createElement("td", null, itemPeriod.label ? `${itemPeriod.label}${itemPeriod.count > 1 ? ` (${itemPeriod.count} ${window.kvT("months")})` : ""}` : "—"), React.createElement("td", null, item.amount.toFixed(2)));
      })), React.createElement("tfoot", null, React.createElement("tr", null, React.createElement("td", {
        colSpan: "2"
      }, window.kvT(receiptStatus === "Voided" ? "Voided Amount" : "Total Received")), React.createElement("td", null, "RM ", receiptTotal.toFixed(2))), receiptStatus !== "Voided" && receiptBalance !== null && React.createElement("tr", null, React.createElement("td", {
        colSpan: "2",
        style: {
          color: receiptBalance > 0 ? "#8a5a00" : C.green
        }
      }, window.kvT("Total Outstanding Balance")), React.createElement("td", {
        style: {
          color: receiptBalance > 0 ? "#8a5a00" : C.green
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
      })), React.createElement("div", null, React.createElement("h4", null, window.kvT("Payment Details")), React.createElement("dl", null, React.createElement("div", null, React.createElement("dt", null, window.kvT("Method")), React.createElement("dd", null, window.kvT(profileReceipt.method || "Cash"))), profileReceipt.ref ? React.createElement("div", null, React.createElement("dt", null, window.kvT("Ref")), React.createElement("dd", null, profileReceipt.ref)) : null, profileReceipt.notes ? React.createElement("div", null, React.createElement("dt", null, window.kvT("Notes")), React.createElement("dd", null, profileReceipt.notes)) : null))), React.createElement(window.kvReceiptAllocationCard, {
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
      })), React.createElement("div", null, React.createElement("span", null, window.kvT(receiptStatus === "Voided" ? "Payment Voided" : receiptStatus === "Partial" ? "Partial Payment Received" : "Payment Confirmed")), React.createElement("p", null, window.kvT(receiptStatus === "Voided" ? "This payment has been cancelled and is not included in the student paid balance." : receiptStatus === "Partial" ? "This receipt confirms a partial payment. The remaining balance is still outstanding." : "This receipt confirms that the payment above has been received and recorded in KinderVault."))), React.createElement("strong", null, "RM ", receiptTotal.toFixed(2))), React.createElement("footer", {
        className: "kv-receipt-footer"
      }, React.createElement("div", null, React.createElement("strong", null, window.kvT("Generated by KinderVault")), React.createElement("span", null, profileReceipt.receipt)), React.createElement("div", {
        className: "kv-receipt-footer-thanks"
      }, window.kvT(receiptStatus === "Voided" ? "This receipt is retained for audit purposes only." : "Thank you for your payment.")))))));
    }
    return React.createElement("div", {
      className: "kv-page kv-page--student-profile"
    }, payModal && React.createElement("div", {
      className: "kv-modal-backdrop",
      onClick: e => e.target === e.currentTarget && setPayModal(false)
    }, React.createElement("div", {
      className: "kv-modal",
      style: {
        padding: 28
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 16,
        marginBottom: 16,
        color: "var(--color-text-primary)"
      }
    }, React.createElement("i", {
      className: "ti ti-cash",
      style: {
        marginRight: 8,
        color: C.green
      },
      "aria-hidden": "true"
    }), window.kvT("Confirm Payment")), React.createElement("div", {
      style: {
        background: "var(--color-background-secondary)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        fontSize: 13
      }
    }, checkedItems.map((it, i) => React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        borderBottom: i < checkedItems.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none"
      }
    }, React.createElement("span", {
      style: {
        color: "var(--color-text-primary)"
      }
    }, window.kvPaymentItemLabel(it.type, it.month, it.desc)), React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, "RM ", it.amount.toFixed(2)))), React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0 0",
        fontWeight: 700,
        borderTop: `2px solid ${C.blue}`,
        marginTop: 6
      }
    }, React.createElement("span", {
      style: {
        color: "var(--color-text-primary)"
      }
    }, window.kvT("TOTAL")), React.createElement("span", {
      style: {
        color: C.green
      }
    }, "RM ", checkedTotal.toFixed(2)))), React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, React.createElement(Input, {
      label: window.kvT('Amount to Pay (RM) *'),
      type: "number",
      min: "0.01",
      max: checkedTotal.toFixed(2),
      step: "0.01",
      value: payForm.amount,
      onChange: e => setPayForm({
        ...payForm,
        amount: e.target.value
      })
    }), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-tertiary)",
        marginTop: 4
      }
    }, window.kvT("Default amount is the selected outstanding balance. You may enter a smaller amount for a partial payment.")), React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: 8,
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--color-background-secondary)",
        fontSize: 12
      }
    }, React.createElement("span", null, window.kvT("Outstanding Balance")), React.createElement("strong", {
      style: {
        color: Math.max(0, checkedTotal - parseFloat(payForm.amount || 0)) > 0 ? "#8a5a00" : C.green
      }
    }, "RM ", Math.max(0, checkedTotal - parseFloat(payForm.amount || 0)).toFixed(2)))), React.createElement("div", {
      className: "kv-form-grid-2",
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 10
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--color-text-secondary)",
        marginBottom: 4
      }
    }, window.kvT('Payment Date *')), React.createElement("input", {
      type: "date",
      value: payForm.date,
      onChange: e => setPayForm({
        ...payForm,
        date: e.target.value
      }),
      style: {
        width: "100%",
        padding: "7px 10px",
        fontSize: 13,
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: 7,
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
        boxSizing: "border-box"
      }
    })), React.createElement(Select, {
      label: window.kvT('Method *'),
      value: payForm.method,
      onChange: e => setPayForm({
        ...payForm,
        method: e.target.value
      }),
      options: paymentMethods.map(m => ({
        value: m,
        label: window.kvT(m)
      }))
    })), React.createElement("div", {
      style: {
        marginBottom: 10
      }
    }, React.createElement(Input, {
      label: window.kvT('Reference No.'),
      value: payForm.ref,
      onChange: e => setPayForm({
        ...payForm,
        ref: e.target.value
      }),
      placeholder: window.kvT('Bank ref / slip no.')
    })), React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, React.createElement(Input, {
      label: window.kvT('Notes (optional)'),
      value: payForm.notes,
      onChange: e => setPayForm({
        ...payForm,
        notes: e.target.value
      }),
      placeholder: window.kvT('Any remarks…')
    })), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, React.createElement(Btn, {
      onClick: paySelected,
      disabled: saving,
      style: {
        flex: 1,
        opacity: saving ? 0.6 : 1
      }
    }, saving ? React.createElement(React.Fragment, null, React.createElement("i", {
      className: "ti ti-loader",
      "aria-hidden": "true"
    }), " ", window.kvT('Saving…')) : React.createElement(React.Fragment, null, React.createElement("i", {
      className: "ti ti-receipt",
      "aria-hidden": "true"
    }), " ", window.kvT('Save & Generate Receipt'))), React.createElement(Btn, {
      variant: "outline",
      onClick: () => setPayModal(false)
    }, window.kvT('Cancel'))))), React.createElement("div", {
      className: "kv-page-header no-print",
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
      title: window.kvT("Back to students")
    }, React.createElement("i", {
      className: "ti ti-arrow-left",
      "aria-hidden": "true"
    })), React.createElement("h2", {
      className: "kv-page-title"
    }, selected.name), statusBadge(selected.status), React.createElement("div", {
      style: {
        marginLeft: "auto",
        display: "flex",
        gap: 8
      }
    }, React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: printStudentProfile
    }, React.createElement("i", {
      className: "ti ti-printer",
      "aria-hidden": "true"
    }), " ", window.kvT("Print")), canViewDevelopment && React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: openStudentDevelopment
    }, React.createElement("i", {
      className: "ti ti-chart-line",
      "aria-hidden": "true"
    }), " ", window.kvT("Development")), canUpdateStudents && React.createElement(Btn, {
      small: true,
      onClick: () => openEdit(selected)
    }, React.createElement("i", {
      className: "ti ti-edit",
      "aria-hidden": "true"
    }), " ", window.kvT("Edit")))), paymentRefreshNotice, React.createElement("div", {
      className: "kv-profile-grid",
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        marginBottom: 14
      }
    }, React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("i", {
      className: "ti ti-id-badge",
      style: {
        marginRight: 6
      },
      "aria-hidden": "true"
    }), window.kvT("Student Details")), React.createElement("div", {
      style: {
        padding: "12px 16px"
      }
    }, [["Student Code", React.createElement("code", {
      style: {
        fontSize: 12
      }
    }, selected.code)], ["IC / Birth Cert", selected.ic || "–"], ["Gender", formatGender(selected)], ["Date of Birth", selected.dob ? window.kvDate(selected.dob, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }, selected.dob) : "–"], ["Class", React.createElement("span", {
      style: {
        background: C.blueBg,
        color: C.blueTx,
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 10
      }
    }, selected.class)], ["Enrolment", selected.enrol ? window.kvDate(selected.enrol, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }, selected.enrol) : "–"], ["Monthly Fee", React.createElement("span", {
      style: {
        fontWeight: 500,
        color: C.green
      }
    }, "RM ", parseFloat(selected.fee).toFixed(2))]].map(([l, v]) => React.createElement("div", {
      key: l,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        fontSize: 13
      }
    }, React.createElement("span", {
      style: {
        color: "var(--color-text-tertiary)"
      }
    }, window.kvT(l)), React.createElement("span", {
      style: {
        color: "var(--color-text-primary)"
      }
    }, v))))), React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("i", {
      className: "ti ti-users",
      style: {
        marginRight: 6
      },
      "aria-hidden": "true"
    }), window.kvT("Parent / Guardian")), React.createElement("div", {
      style: {
        padding: "12px 16px"
      }
    }, [["Father", selected.father_name || "–"], ["Father Phone", selected.father_phone || "–"], ["Mother", selected.mother_name || "–"], ["Mother Phone", selected.mother_phone || "–"], ["Address", selected.father_address || selected.mother_address || selected.address || "–"]].map(([l, v]) => React.createElement("div", {
      key: l,
      style: {
        padding: "5px 0",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        fontSize: 13
      }
    }, React.createElement("div", {
      style: {
        color: "var(--color-text-tertiary)",
        fontSize: 11
      }
    }, window.kvT(l)), React.createElement("div", {
      style: {
        color: "var(--color-text-primary)"
      }
    }, v)))))), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 14
      }
    }, React.createElement(Btn, {
      variant: profileTab === "outstanding" ? "amber" : "outline",
      onClick: () => {
        setProfileTab("outstanding");
        replaceRouteState && replaceRouteState({
          profileTab: "outstanding"
        });
      }
    }, React.createElement("i", {
      className: "ti ti-alert-circle",
      "aria-hidden": "true"
    }), " ", window.kvT("Outstanding"), outstandingItems.length > 0 && React.createElement("span", {
      style: {
        background: profileTab === "outstanding" ? "rgba(255,255,255,0.25)" : "var(--color-background-secondary)",
        color: profileTab === "outstanding" ? "#fff" : "var(--color-text-secondary)",
        fontSize: 11,
        padding: "1px 7px",
        borderRadius: 10,
        marginLeft: 6
      }
    }, outstandingItems.length)), React.createElement(Btn, {
      variant: profileTab === "paid" ? "amber" : "outline",
      onClick: () => {
        setProfileTab("paid");
        replaceRouteState && replaceRouteState({
          profileTab: "paid"
        });
      }
    }, React.createElement("i", {
      className: "ti ti-history",
      "aria-hidden": "true"
    }), " ", window.kvT("Payment History"))), profileTab === "outstanding" && React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%"
      }
    }, React.createElement("div", null, React.createElement("i", {
      className: "ti ti-receipt-2",
      style: {
        marginRight: 6
      },
      "aria-hidden": "true"
    }), window.kvT("Outstanding Fees")), canCreatePayments && outstandingItems.length > 0 && React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, checkedIds.length < outstandingItems.length ? React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: selectAll
    }, window.kvT("Select All")) : React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: clearAll
    }, window.kvT("Clear All")), checkedIds.length > 0 && React.createElement(Btn, {
      small: true,
      variant: "amber",
      onClick: openPayModal
    }, React.createElement("i", {
      className: "ti ti-cash",
      "aria-hidden": "true"
    }), " ", window.kvT("Pay Selected ({count}) - RM {amount}", {
      count: checkedIds.length,
      amount: checkedTotal.toFixed(2)
    }))))), outstandingItems.length === 0 ? React.createElement("div", {
      style: {
        padding: 32,
        textAlign: "center",
        color: "var(--color-text-tertiary)",
        fontSize: 13
      }
    }, React.createElement("i", {
      className: "ti ti-circle-check",
      style: {
        fontSize: 32,
        color: C.green,
        display: "block",
        marginBottom: 8
      },
      "aria-hidden": "true"
    }), window.kvT("All fees paid up to date!")) : React.createElement("div", null, outstandingItems.map(it => React.createElement("div", {
      key: it.id,
      onClick: () => canCreatePayments && toggleItem(it.id),
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        cursor: canCreatePayments ? "pointer" : "default",
        background: selectedItems[it.id] ? "var(--color-background-secondary)" : "transparent",
        transition: "background .15s"
      }
    }, React.createElement("div", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 7,
        border: `3px solid ${selectedItems[it.id] ? C.amber : C.border}`,
        background: selectedItems[it.id] ? C.amber : "rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 0,
        boxShadow: selectedItems[it.id] ? "0 0 0 4px rgba(255,172,0,0.15)" : "inset 0 0 0 1px rgba(0,0,0,0.05)",
        transition: "all .15s"
      }
    }, selectedItems[it.id] ? React.createElement("i", {
      className: "ti ti-check",
      style: {
        fontSize: 12,
        color: "#fff"
      },
      "aria-hidden": "true"
    }) : React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "transparent"
      }
    })), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 500,
        color: "var(--color-text-primary)",
        fontSize: 13,
        marginBottom: 2
      }
    }, window.kvPaymentItemLabel(it.type, it.month, it.desc)), React.createElement("div", {
      style: {
        fontSize: 11,
        color: it.isOverdue ? C.red : "var(--color-text-tertiary)"
      }
    }, it.isOverdue ? window.kvT("Overdue") : it.status === "Partial" ? window.kvT("Partial") : it.type === "Monthly Fee" ? window.kvT("Due this month") : window.kvT("Unpaid"))), React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        color: it.isOverdue ? C.red : "var(--color-text-primary)",
        flexShrink: 0
      }
    }, "RM ", it.amount.toFixed(2)))), checkedIds.length > 0 && React.createElement("div", {
      style: {
        padding: "12px 16px",
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        background: "var(--color-background-secondary)"
      }
    }, React.createElement(Btn, {
      variant: "amber",
      onClick: openPayModal
    }, React.createElement("i", {
      className: "ti ti-cash",
      "aria-hidden": "true"
    }), " ", window.kvT("Pay {count} item(s) - RM {amount}", {
      count: checkedIds.length,
      amount: checkedTotal.toFixed(2)
    }))))), profileTab === "paid" && React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("i", {
      className: "ti ti-history",
      style: {
        marginRight: 6
      },
      "aria-hidden": "true"
    }), window.kvT("Payment History")), stuPaidPayments.length === 0 ? React.createElement("div", {
      style: {
        padding: 24,
        textAlign: "center",
        color: "var(--color-text-tertiary)",
        fontSize: 13
      }
    }, window.kvT("No payment records yet.")) : React.createElement("div", {
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
    }, ["Date", "Type", "Period", "Amount", "Method", "Status", "Receipt", "Action"].map(h => React.createElement("th", {
      key: h,
      style: {
        padding: "8px 14px",
        textAlign: "left",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: .5,
        color: "var(--color-text-tertiary)",
        fontWeight: 500,
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        whiteSpace: "nowrap"
      }
    }, window.kvT(h))))), React.createElement("tbody", null, [...stuPaidPayments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => React.createElement("tr", {
      key: p.id,
      style: {
        borderBottom: "0.5px solid var(--color-border-tertiary)"
      }
    }, React.createElement("td", {
      style: {
        padding: "9px 14px",
        color: "var(--color-text-secondary)"
      }
    }, p.date ? window.kvDate(p.date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }, p.date) : "–"), React.createElement("td", {
      style: {
        padding: "9px 14px",
        color: "var(--color-text-primary)"
      }
    }, window.kvT(p.type)), React.createElement("td", {
      style: {
        padding: "9px 14px",
        color: "var(--color-text-secondary)"
      }
    }, fmtMonthRange(p.month)), React.createElement("td", {
      style: {
        padding: "9px 14px",
        fontWeight: 500,
        color: C.green
      }
    }, "RM ", parseFloat(p.amount).toFixed(2)), React.createElement("td", {
      style: {
        padding: "9px 14px",
        color: "var(--color-text-secondary)"
      }
    }, window.kvT(p.method || "–")), React.createElement("td", {
      style: {
        padding: "9px 14px"
      }
    }, statusBadge(p.status)), React.createElement("td", {
      style: {
        padding: "9px 14px",
        fontFamily: "monospace",
        fontSize: 11,
        color: "var(--color-text-primary)"
      }
    }, p.receipt || "–"), React.createElement("td", {
      style: {
        padding: "9px 14px"
      }
    }, p.receipt ? React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => goReceipt(p)
    }, window.kvT("View Receipt")) : "–"))))))), React.createElement("div", {
      className: "print-area kv-student-profile-print-area",
      "aria-label": window.kvT("Student Profile")
    }, React.createElement("div", {
      className: "kv-student-profile-print-sheet"
    }, React.createElement("header", {
      className: "kv-profile-print-header"
    }, React.createElement("div", null, React.createElement("div", {
      className: "kv-profile-print-eyebrow"
    }, "KINDERVAULT"), React.createElement("h1", null, window.kvT("Student Profile")), React.createElement("p", null, selected.name || "-")), React.createElement("div", {
      className: "kv-profile-print-date"
    }, window.kvDate(new Date(), {
      day: "numeric",
      month: "short",
      year: "numeric"
    }))), React.createElement("div", {
      className: "kv-profile-print-grid"
    }, React.createElement("section", {
      className: "kv-profile-print-section"
    }, React.createElement("h2", null, window.kvT("Student Details")), React.createElement("dl", null, React.createElement("div", null, React.createElement("dt", null, window.kvT("Student Code")), React.createElement("dd", null, selected.code || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("IC / Birth Cert")), React.createElement("dd", null, selected.ic || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Gender")), React.createElement("dd", null, formatGender(selected))), React.createElement("div", null, React.createElement("dt", null, window.kvT("Date of Birth")), React.createElement("dd", null, selected.dob ? window.kvDate(selected.dob, {
      day: "numeric",
      month: "short",
      year: "numeric"
    }, selected.dob) : "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Class")), React.createElement("dd", null, selected.class || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Enrolment")), React.createElement("dd", null, selected.enrol ? window.kvDate(selected.enrol, {
      day: "numeric",
      month: "short",
      year: "numeric"
    }, selected.enrol) : "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Monthly Fee")), React.createElement("dd", null, "RM ", parseFloat(selected.fee || 0).toFixed(2))))), React.createElement("section", {
      className: "kv-profile-print-section"
    }, React.createElement("h2", null, window.kvT("Parent / Guardian")), React.createElement("dl", null, React.createElement("div", null, React.createElement("dt", null, window.kvT("Father")), React.createElement("dd", null, selected.father_name || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Father Phone")), React.createElement("dd", null, selected.father_phone || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Mother")), React.createElement("dd", null, selected.mother_name || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Mother Phone")), React.createElement("dd", null, selected.mother_phone || "-")), React.createElement("div", null, React.createElement("dt", null, window.kvT("Address")), React.createElement("dd", null, selected.father_address || selected.mother_address || selected.address || "-"))))), React.createElement("section", {
      className: "kv-profile-print-section kv-profile-print-summary"
    }, React.createElement("h2", null, window.kvT("Payment History")), React.createElement("div", {
      className: "kv-profile-print-summary-grid"
    }, React.createElement("div", null, React.createElement("span", null, window.kvT("Status")), React.createElement("strong", null, window.kvT(selected.status || "-"))), React.createElement("div", null, React.createElement("span", null, window.kvT("Outstanding")), React.createElement("strong", null, outstandingItems.length)), React.createElement("div", null, React.createElement("span", null, window.kvT("Payment Records")), React.createElement("strong", null, stuPaidPayments.length))), stuPaidPayments.length ? React.createElement("table", {
      className: "kv-profile-print-table"
    }, React.createElement("thead", null, React.createElement("tr", null, ["Date", "Type", "Period", "Amount", "Method", "Status", "Receipt"].map(label => React.createElement("th", {
      key: label
    }, window.kvT(label))))), React.createElement("tbody", null, [...stuPaidPayments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => React.createElement("tr", {
      key: payment.id
    }, React.createElement("td", null, payment.date ? window.kvDate(payment.date, {
      day: "numeric",
      month: "short",
      year: "numeric"
    }, payment.date) : "-"), React.createElement("td", null, window.kvT(payment.type || "-")), React.createElement("td", null, fmtMonthRange(payment.month)), React.createElement("td", null, "RM ", parseFloat(payment.amount || 0).toFixed(2)), React.createElement("td", null, window.kvT(payment.method || "-")), React.createElement("td", null, window.kvT(payment.status || "-")), React.createElement("td", null, payment.receipt || "-"))))) : React.createElement("p", {
      className: "kv-profile-print-empty"
    }, window.kvT("No payment records yet."))), React.createElement("footer", {
      className: "kv-profile-print-footer"
    }, window.kvT("Generated by KinderVault")))), "      ");
  }
  if (view === "add" || view === "edit") return React.createElement("div", {
    className: "kv-page kv-page--student-form"
  }, React.createElement("div", {
    className: "kv-page-header kv-student-form-page-header"
  }, React.createElement(Btn, {
    variant: "outline",
    small: true,
    onClick: backToList,
    title: window.kvT("Back to students")
  }, React.createElement("i", {
    className: "ti ti-arrow-left",
    "aria-hidden": "true"
  })), React.createElement("h2", {
    className: "kv-page-title"
  }, view === "add" ? window.kvT("Add New Student") : window.kvT("Edit Student")), view === "add" && canCreateStudents && scannerEnabled && React.createElement(Btn, {
    variant: "outline",
    onClick: () => setScannerOpen(true),
    style: {
      marginLeft: "auto"
    }
  }, React.createElement("i", {
    className: "ti ti-scan",
    "aria-hidden": "true"
  }), " ", window.kvT("Scan Physical Registration Form"))), scannerOpen && scannerEnabled && React.createElement(RegistrationScannerModal, {
    onClose: () => setScannerOpen(false),
    onApply: applyScannedRegistration,
    students: students,
    isAdministrator: isAdministrator
  }), React.createElement("div", {
    className: "kv-student-form-layout"
  }, React.createElement(Card, {
    className: "kv-student-form-section"
  }, React.createElement("div", {
    className: "kv-student-form-card-body"
  }, React.createElement("div", {
    className: "kv-student-form-section-head"
  }, React.createElement("h3", null, window.kvT("Student Information"))), React.createElement("div", {
    className: "kv-student-form-grid kv-student-form-grid--primary"
  }, React.createElement(Input, {
    label: window.kvT("Child's Name *"),
    value: form.name || "",
    onChange: e => setForm({
      ...form,
      name: e.target.value
    })
  }), React.createElement(Input, {
    label: window.kvT("MyKid No."),
    placeholder: "220510-14-5021",
    value: form.ic || "",
    onChange: e => setForm({
      ...form,
      ic: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-form-grid"
  }, React.createElement(Input, {
    label: window.kvT("Birth Certificate No."),
    value: form.birth_cert || "",
    onChange: e => setForm({
      ...form,
      birth_cert: e.target.value
    })
  }), React.createElement(Input, {
    label: window.kvT("Date of Birth *"),
    type: "date",
    value: form.dob || "",
    onChange: e => setForm({
      ...form,
      dob: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-form-grid kv-student-form-grid--short"
  }, React.createElement(Select, {
    label: window.kvT("Gender *"),
    value: form.gender || "",
    onChange: e => setForm({
      ...form,
      gender: e.target.value
    }),
    options: [{
      value: "M",
      label: window.kvT("Male")
    }, {
      value: "F",
      label: window.kvT("Female")
    }]
  }), React.createElement(Input, {
    label: window.kvT("Birth Order"),
    value: form.child_position || "",
    onChange: e => setForm({
      ...form,
      child_position: e.target.value
    })
  }), React.createElement(Input, {
    label: window.kvT("Enrolment Date"),
    type: "date",
    value: form.enrol || "",
    onChange: e => setForm({
      ...form,
      enrol: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-form-grid kv-student-form-grid--academic"
  }, React.createElement(Select, {
    label: window.kvT('Class *'),
    value: form.class || "",
    onChange: e => setForm({
      ...form,
      class: e.target.value
    }),
    options: classes
  }), React.createElement("div", {
    className: "kv-field kv-student-age-field"
  }, React.createElement("div", {
    className: "kv-field-label"
  }, window.kvT("Programme Age")), React.createElement("div", {
    className: "kv-student-age-options"
  }, ["4", "5", "6"].map(age => React.createElement("button", {
    key: age,
    type: "button",
    onClick: () => setForm({
      ...form,
      program_age: age,
      class: classByProgrammeAge[age] || form.class
    }),
    className: form.program_age === age ? "is-selected" : ""
  }, window.kvT("{age} years", {
    age
  }))))), React.createElement("div", {
    className: "kv-field kv-student-package-field"
  }, React.createElement("div", {
    className: "kv-field-label"
  }, window.kvT("Monthly Package")), React.createElement("select", {
    className: "kv-form-control",
    value: form.monthly_package || "A",
    onChange: e => setForm({
      ...form,
      monthly_package: e.target.value,
      fee: packageAmount(e.target.value)
    })
  }, Object.entries(feeConfig?.monthly_packages || {}).map(([key, item]) => React.createElement("option", {
    key: key,
    value: key
  }, key, " - ", window.kvT(item.label)))), React.createElement("div", {
    className: "kv-student-fee-field"
  }, React.createElement("div", {
    className: "kv-field-label"
  }, window.kvT('Monthly Fee (RM)')), React.createElement("div", {
    className: "kv-money-input"
  }, React.createElement("span", null, "RM"), React.createElement("input", {
    className: "kv-form-control",
    type: "number",
    value: form.fee,
    disabled: true
  }))))), React.createElement("div", {
    className: "kv-field kv-student-annual-field"
  }, React.createElement("div", {
    className: "kv-field-label"
  }, window.kvT("Annual Fee Options")), React.createElement("div", {
    className: "kv-student-annual-options"
  }, [["wants_uniform", "Uniform"], ["wants_sports_uniform", "Baju Sukan"], ["wants_tudung", "Tudung"], ["wants_iqra", "Kelas IQRA"]].map(([key, label]) => React.createElement("label", {
    key: key
  }, React.createElement("input", {
    type: "checkbox",
    checked: !!form[key],
    onChange: e => setForm({
      ...form,
      [key]: e.target.checked ? 1 : 0
    })
  }), window.kvT(label))))))), React.createElement(Card, {
    className: "kv-student-form-section"
  }, React.createElement("div", {
    className: "kv-student-form-card-body"
  }, React.createElement("div", {
    className: "kv-student-form-section-head"
  }, React.createElement("h3", null, window.kvT("Parent / Guardian Information"))), React.createElement("div", {
    className: "kv-student-guardian-columns"
  }, React.createElement("section", {
    className: "kv-student-guardian-panel"
  }, React.createElement("h4", null, window.kvT("Father")), React.createElement("div", {
    className: "kv-student-guardian-grid"
  }, React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Name"),
    value: form.father_name || "",
    onChange: e => setForm({
      ...form,
      father_name: e.target.value
    })
  })), React.createElement(Input, {
    label: window.kvT("IC No."),
    value: form.father_ic || "",
    onChange: e => setForm({
      ...form,
      father_ic: e.target.value
    })
  }), React.createElement(Input, {
    label: window.kvT("Phone No."),
    placeholder: "012-3456789",
    value: form.father_phone || "",
    onChange: e => setForm({
      ...form,
      father_phone: e.target.value
    })
  }), React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Home Address"),
    value: form.father_address || "",
    onChange: e => setForm({
      ...form,
      father_address: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Occupation"),
    value: form.father_job || "",
    onChange: e => setForm({
      ...form,
      father_job: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Employer Name and Address"),
    value: form.father_employer || "",
    onChange: e => setForm({
      ...form,
      father_employer: e.target.value
    })
  })))), React.createElement("section", {
    className: "kv-student-guardian-panel"
  }, React.createElement("h4", null, window.kvT("Mother")), React.createElement("div", {
    className: "kv-student-guardian-grid"
  }, React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Name"),
    value: form.mother_name || "",
    onChange: e => setForm({
      ...form,
      mother_name: e.target.value
    })
  })), React.createElement(Input, {
    label: window.kvT("IC No."),
    value: form.mother_ic || "",
    onChange: e => setForm({
      ...form,
      mother_ic: e.target.value
    })
  }), React.createElement(Input, {
    label: window.kvT("Phone No."),
    placeholder: "012-3456789",
    value: form.mother_phone || "",
    onChange: e => setForm({
      ...form,
      mother_phone: e.target.value
    })
  }), React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Home Address"),
    value: form.mother_address || "",
    onChange: e => setForm({
      ...form,
      mother_address: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Occupation"),
    value: form.mother_job || "",
    onChange: e => setForm({
      ...form,
      mother_job: e.target.value
    })
  })), React.createElement("div", {
    className: "kv-student-guardian-span-full"
  }, React.createElement(Input, {
    label: window.kvT("Employer Name and Address"),
    value: form.mother_employer || "",
    onChange: e => setForm({
      ...form,
      mother_employer: e.target.value
    })
  }))))), React.createElement("div", {
    className: "kv-student-form-grid kv-student-form-grid--system"
  }, React.createElement(Input, {
    label: window.kvT("Parent / Guardian Summary"),
    value: derivePrimaryParent(form),
    disabled: true
  }), React.createElement(Select, {
    label: window.kvT('Status'),
    value: form.status || "",
    onChange: e => setForm({
      ...form,
      status: e.target.value
    }),
    options: ["Active", "Inactive", "Graduated"].map(status => ({
      value: status,
      label: window.kvT(status)
    }))
  }))))), React.createElement("div", {
    className: "kv-student-form-actions"
  }, React.createElement(Btn, {
    onClick: save,
    style: {
      opacity: loading ? 0.6 : 1
    }
  }, loading ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "ti ti-loader",
    "aria-hidden": "true"
  }), " ", window.kvT('Saving...')) : React.createElement(React.Fragment, null, React.createElement("i", {
    className: "ti ti-device-floppy",
    "aria-hidden": "true"
  }), " ", window.kvT('Save Student'))), React.createElement(Btn, {
    variant: "outline",
    onClick: backToList
  }, window.kvT('Cancel'))));
  const printStudentList = () => {
    const previousTitle = document.title;
    const printedAt = window.kvDate(new Date(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }, "");
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
  return React.createElement("div", {
    className: "kv-page kv-page--students"
  }, React.createElement("div", {
    className: "kv-page-header no-print",
    style: {
      display: "flex",
      alignItems: "center",
      marginBottom: 16
    }
  }, React.createElement("h2", {
    className: "kv-page-title"
  }, React.createElement("i", {
    className: "ti ti-users",
    style: {
      marginRight: 8
    },
    "aria-hidden": "true"
  }), window.kvT('Students')), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginLeft: "auto",
      flexWrap: "wrap"
    }
  }, React.createElement(Btn, {
    variant: "outline",
    onClick: printStudentList
  }, React.createElement("i", {
    className: "ti ti-printer",
    "aria-hidden": "true"
  }), " ", window.kvT("Print")), canCreateStudents && React.createElement(Btn, {
    onClick: openAdd
  }, React.createElement("i", {
    className: "ti ti-user-plus",
    "aria-hidden": "true"
  }), " ", window.kvT('Add Student')))), React.createElement(Card, {
    className: "kv-filter-card",
    style: {
      marginBottom: 16
    }
  }, React.createElement("div", {
    className: "kv-table-toolbar",
    style: {
      padding: "10px 14px",
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    className: "kv-search-field",
    style: {
      position: "relative",
      flex: 1,
      minWidth: 140
    }
  }, React.createElement("i", {
    className: "ti ti-search",
    style: {
      position: "absolute",
      left: 9,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: 13,
      color: "var(--color-text-tertiary)"
    },
    "aria-hidden": "true"
  }), React.createElement("input", {
    value: search,
    onChange: e => {
      const value = e.target.value;
      setSearch(value);
      replaceRouteState && replaceRouteState({
        search: value
      });
    },
    placeholder: window.kvT('Search name, IC, parent...'),
    style: {
      width: "100%",
      padding: "6px 10px 6px 28px",
      fontSize: 12,
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: 7,
      background: "var(--color-background-primary)",
      color: "var(--color-text-primary)",
      boxSizing: "border-box"
    }
  })), React.createElement("select", {
    value: classF,
    onChange: e => {
      const value = e.target.value;
      setClassF(value);
      replaceRouteState && replaceRouteState({
        classF: value
      });
    },
    style: {
      padding: "6px 10px",
      fontSize: 12,
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: 7,
      background: "var(--color-background-primary)",
      color: "var(--color-text-secondary)"
    }
  }, React.createElement("option", {
    value: ""
  }, window.kvT('All Classes')), classes.map(c => React.createElement("option", {
    key: c
  }, c))), (search || classF) && React.createElement(Btn, {
    variant: "outline",
    small: true,
    onClick: () => {
      setSearch("");
      setClassF("");
      replaceRouteState && replaceRouteState({
        search: "",
        classF: ""
      });
    }
  }, window.kvT("Clear")))), React.createElement(Card, {
    className: "kv-table-card"
  }, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-table",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT('Student List'), " ", React.createElement("span", {
    style: {
      background: "var(--color-background-secondary)",
      color: "var(--color-text-secondary)",
      fontSize: 11,
      padding: "1px 7px",
      borderRadius: 10,
      marginLeft: 4
    }
  }, filtered.length)), filtered.length ? React.createElement("div", {
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
  }, ["#", window.kvT('Student'), window.kvT('IC Number'), window.kvT('Class'), window.kvT('Gender'), window.kvT('Parent'), window.kvT('Phone'), window.kvT('Fee'), window.kvT('Status'), window.kvT('Actions')].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: "8px 12px",
      textAlign: "left",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      whiteSpace: "nowrap"
    }
  }, h)))), React.createElement("tbody", null, filtered.map((s, i) => React.createElement("tr", {
    key: s.id,
    style: {
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, React.createElement("td", {
    style: {
      padding: "9px 12px",
      color: "var(--color-text-tertiary)",
      fontSize: 11
    }
  }, i + 1), React.createElement("td", {
    style: {
      padding: "9px 12px"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      color: "var(--color-text-primary)"
    }
  }, s.name), React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--color-text-tertiary)",
      fontFamily: "monospace"
    }
  }, s.code)), React.createElement("td", {
    style: {
      padding: "9px 12px",
      fontFamily: "monospace",
      fontSize: 11,
      color: "var(--color-text-secondary)"
    }
  }, s.ic || "–"), React.createElement("td", {
    style: {
      padding: "9px 12px"
    }
  }, React.createElement("span", {
    style: {
      background: C.blueBg,
      color: C.blueTx,
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 10
    }
  }, s.class)), React.createElement("td", {
    style: {
      padding: "9px 12px",
      color: "var(--color-text-secondary)"
    }
  }, formatGender(s)), React.createElement("td", {
    style: {
      padding: "9px 12px",
      color: "var(--color-text-secondary)"
    }
  }, s.parent), React.createElement("td", {
    style: {
      padding: "9px 12px",
      color: "var(--color-text-secondary)"
    }
  }, s.phone || "–"), React.createElement("td", {
    style: {
      padding: "9px 12px",
      fontWeight: 500,
      color: C.green
    }
  }, "RM ", parseFloat(s.fee).toFixed(2)), React.createElement("td", {
    style: {
      padding: "9px 12px"
    }
  }, statusBadge(s.status)), React.createElement("td", {
    style: {
      padding: "9px 12px"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: () => openProfile(s)
  }, React.createElement("i", {
    className: "ti ti-eye",
    "aria-hidden": "true"
  })), canUpdateStudents && React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: () => openEdit(s),
    title: window.kvT("Edit student")
  }, React.createElement("i", {
    className: "ti ti-edit",
    "aria-hidden": "true"
  })), canDeleteStudents && React.createElement(Btn, {
    small: true,
    variant: "danger",
    onClick: () => del(s),
    title: window.kvT("Delete student")
  }, React.createElement("i", {
    className: "ti ti-trash",
    "aria-hidden": "true"
  }))))))))) : React.createElement(EmptyState, {
    icon: "users",
    text: search ? window.kvT('No students match your search.') : window.kvT('No students yet.'),
    action: React.createElement(Btn, {
      onClick: openAdd,
      style: {
        marginTop: 12
      }
    }, window.kvT('Add First Student'))
  })), React.createElement("div", {
    className: "print-area kv-student-list-print-area",
    "aria-label": window.kvT("Student List")
  }, React.createElement("div", {
    className: "kv-student-list-print-sheet"
  }, React.createElement("header", {
    className: "kv-list-print-header"
  }, React.createElement("div", null, React.createElement("h1", null, window.kvT("Student List")), React.createElement("p", null, window.kvT("Students"), " \xB7 ", filtered.length)), React.createElement("span", null, window.kvDate(new Date(), {
    day: "numeric",
    month: "short",
    year: "numeric"
  }))), filtered.length ? React.createElement("table", {
    className: "kv-list-print-table"
  }, React.createElement("thead", null, React.createElement("tr", null, ["#", "Student", "Student Code", "IC Number", "Class", "Gender", "Parent", "Phone", "Fee", "Status"].map(label => React.createElement("th", {
    key: label
  }, window.kvT(label))))), React.createElement("tbody", null, filtered.map((student, index) => React.createElement("tr", {
    key: student.id
  }, React.createElement("td", null, index + 1), React.createElement("td", null, React.createElement("strong", null, student.name || "-")), React.createElement("td", null, student.code || "-"), React.createElement("td", null, student.ic || "-"), React.createElement("td", null, student.class || "-"), React.createElement("td", null, formatGender(student)), React.createElement("td", null, student.parent || "-"), React.createElement("td", null, student.phone || "-"), React.createElement("td", null, "RM ", parseFloat(student.fee || 0).toFixed(2)), React.createElement("td", null, window.kvT(student.status || "-")))))) : React.createElement("p", {
    className: "kv-list-print-empty"
  }, window.kvT("No students yet.")))));
};
