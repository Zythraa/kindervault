// ============================================================
// pages/receipts.jsx  –  ReceiptsPage component
// ============================================================

const ReceiptsPage = ({students, payments, selectedReceipt, openReceipt, goBack, navigationState = {}, navigationKey, replaceRouteState, permissions = [], isAdministrator = false}) => {
  const locale = window.kvLang || 'en';
  const canPrintReceipts = canUsePermission(permissions, "receipts.print", isAdministrator);
  const [searchQuery, setSearchQuery] = React.useState(navigationState.search || "");
  const [filterType, setFilterType] = React.useState(navigationState.filterType || "");

  React.useEffect(() => {
    setSearchQuery(navigationState.search || "");
    setFilterType(navigationState.filterType || "");
  }, [navigationKey]);

  const formatPaymentPeriod = (value) => {
    const values = String(value || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!values.length) return {label: '', count: 0};
    const parsed = values.map(v => {
      const key = /^\d{4}$/.test(v) ? `${v}-01` : v;
      const date = new Date(`${key}-01`);
      return {key: v, date, time: date.getTime()};
    }).filter(v => !Number.isNaN(v.time)).sort((a,b) => a.time - b.time);
    const labels = parsed.map(v => window.kvDate(v.date, {month:'short', year:'numeric'}, v.key));
    if (!labels.length) return {label: values.join(', '), count: values.length};
    let label = labels.join(', ');
    if (parsed.length > 1) {
      const contiguous = parsed.every((item, index) => index === 0 || (item.date.getFullYear() * 12 + item.date.getMonth()) - (parsed[index - 1].date.getFullYear() * 12 + parsed[index - 1].date.getMonth()) === 1);
      label = contiguous ? `${labels[0]} - ${labels[labels.length - 1]}` : labels.join(', ');
    }
    return {label, count: parsed.length};
  };
  const expandAdvanceMonths = (item, student) => {
    const explicit = String(item?.month || '').split(',').map(value => value.trim()).filter(Boolean);
    if (explicit.length !== 1 || item?.type !== 'Monthly Fee' || item?.status !== 'Advance') return explicit;
    const start = explicit[0];
    const monthlyFee = parseFloat(student?.fee || 0);
    const amount = parseFloat(item?.amount || 0);
    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(start) || !Number.isFinite(monthlyFee) || monthlyFee <= 0 || !Number.isFinite(amount) || amount <= monthlyFee) return explicit;
    const count = Math.round(amount / monthlyFee);
    if (count < 2 || count > 60 || Math.abs(amount - (count * monthlyFee)) > 0.01) return explicit;
    const [year, month] = start.split('-').map(Number);
    return Array.from({length: count}, (_, index) => {
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
    const receiptMaxId = Math.max(...items.map(item => parseInt(item.id || 0)).filter(Number.isFinite), 0);
    payments.filter(p => parseInt(p.student_id) === parseInt(student?.id) && parseInt(p.id || 0) <= receiptMaxId && p.type === "Monthly Fee" && ["Paid", "Advance", "Partial"].includes(p.status)).sort((a,b) => parseInt(a.id || 0) - parseInt(b.id || 0)).forEach(p => {
      const covered = expandAdvanceMonths(p, student);
      let remaining = parseFloat(p.amount || 0);
      covered.forEach(month => {
        if (!target.has(month) || remaining <= 0) return;
        const available = Math.max(0, fee - (paid[month] || 0));
        const applied = Math.min(available, remaining);
        paid[month] = (paid[month] || 0) + applied;
        remaining -= applied;
      });
    });
    const due = months.length * fee;
    const received = months.reduce((sum, month) => sum + Math.min(fee, paid[month] || 0), 0);
    return Math.max(0, due - received);
  };
  const allReceiptPayments = payments.filter(p=>p.receipt);
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
    }));
    return {
      ...first,
      type: group.length > 1 ? "Multiple Payments" : first.type,
      amount: items.reduce((total, item) => total + item.amount, 0),
      items,
      payment_ids: group.map(payment => payment.id),
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

  const open = (p) => openReceipt(p);
  const backToList = () => goBack({page:"receipts", state:{search:searchQuery, filterType}});

  const handlePrint = (p = selectedReceipt, delay = 50) => {
    if (!p || !canPrintReceipts) return;
    const s = students.find(x=>x.id===p.student_id||x.id===parseInt(p.student_id));
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
    const printedAt = window.kvDate(new Date(), {year:"numeric", month:"2-digit", day:"2-digit"}, "");
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
    const monthStr = periodInfo.label
      ? `${periodInfo.label}${periodInfo.count > 1 ? ` (${periodInfo.count} ${window.kvT("months")})` : ""}`
      : "";
    const issuedDate = p.date
      ? window.kvDate(p.date, {day:'numeric', month:'short', year:'numeric'}, p.date)
      : window.kvDate(new Date(), {day:'numeric', month:'short', year:'numeric'});
    const text = window.kvT("Hello from *{school}*. We have received your payment of RM {amount} for {type}{period}. Thank you. Your receipt number is {receipt}, issued on {date}. Please keep this number for your records.", {
      school: SCHOOL,
      amount,
      type: window.kvT(p.type),
      period: monthStr ? ` (${monthStr})` : '',
      receipt: p.receipt,
      date: issuedDate,
    });
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (selectedReceipt) {
    const sel = selectedReceipt;
    const s   = students.find(x=>x.id===sel.student_id||x.id===parseInt(sel.student_id));
    const date = sel.date
      ? window.kvDate(sel.date, {day:'numeric', month:'short', year:'numeric'}, sel.date)
      : window.kvDate(new Date(), {day:'numeric', month:'short', year:'numeric'});
    const receiptItems = sel.items?.length ? sel.items : [{type:sel.type, month:sel.month, status:sel.status, amount:parseFloat(sel.amount || 0)}];

    const monthlyPeriods = collectReceiptMonths(receiptItems, s);

    const overallPeriod = formatPaymentPeriod([...new Set(monthlyPeriods)].join(','));
    const receiptTotal = receiptItems.reduce((total, item) => total + parseFloat(item.amount || 0), 0);
    const receiptStatus = receiptItems.some(item => item.status === 'Partial') ? 'Partial' : (receiptItems.some(item => item.status === 'Advance') ? 'Advance' : 'Paid');
    const receiptBalance = calculateReceiptBalance(receiptItems, s);

    return (
      <div className="kv-page kv-page--receipt-preview">
        <div className="kv-page-header kv-receipt-actions no-print" style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <Btn variant="outline" small onClick={backToList} title={window.kvT("Back to receipts")}><i className="ti ti-arrow-left" aria-hidden="true"/></Btn>
          <h2 className="kv-page-title">{window.kvT('Receipt Preview')}</h2>
          <Btn small variant="outline" onClick={() => sendWhatsApp(sel)} style={{marginLeft:"auto",background:"#25D366",color:"#fff",border:"none"}}>
            <i className="ti ti-brand-whatsapp" aria-hidden="true"/> {window.kvT('Send WhatsApp')}
          </Btn>
          {canPrintReceipts && <Btn small onClick={() => handlePrint()} style={{background:C.blue,color:"#fff",border:"none"}}>
            <i className="ti ti-printer" aria-hidden="true"/> {window.kvT('Print / PDF')}
          </Btn>}
        </div>
        <div className="print-area kv-receipt-print-area">
          <Card className="kv-receipt-sheet">
            <div className="kv-receipt-top-accent" aria-hidden="true"/>
            <div className="kv-receipt-layout">
              <header className="kv-receipt-header">
                <div className="kv-receipt-brand">
                  <div className="kv-receipt-document-label"><i className="ti ti-receipt" aria-hidden="true"/> {window.kvT('Official Receipt')}</div>
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
                    <span>{window.kvT('Receipt No.:')}</span>
                    <strong className="kv-receipt-number">{sel.receipt}</strong>
                    <span>{window.kvT('Date Issued:')}</span>
                    <strong>{date}</strong>
                    <span>{window.kvT('Payment Type:')}</span>
                    <strong>{window.kvT(sel.type)}</strong>
                  </div>
                </div>
              </header>

              <section className="kv-receipt-student-card">
                <div className="kv-receipt-student-grid">
                  <div><div className="kv-receipt-field-label">{window.kvT('Student')}</div><div className="kv-receipt-field-value">{sel.student_name||s?.name}</div></div>
                  <div><div className="kv-receipt-field-label">{window.kvT('Class')}</div><div className="kv-receipt-field-value">{sel.student_class||s?.class}</div></div>
                  <div><div className="kv-receipt-field-label">{window.kvT('Parent / Guardian')}</div><div className="kv-receipt-field-value">{sel.student_parent||s?.parent}</div></div>
                  <div><div className="kv-receipt-field-label">{window.kvT('Fee Period')}</div><div className="kv-receipt-field-value">{overallPeriod.label || "—"}{overallPeriod.count > 1 ? ` (${overallPeriod.count} ${window.kvT('months')})` : ""}</div></div>
                </div>
              </section>

              {overallPeriod.label && <div className="kv-receipt-period-banner" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,margin:'16px 0',padding:'14px 18px',borderRadius:12,background:'linear-gradient(135deg, #f3edff 0%, #faf8ff 100%)',border:'1px solid #dfd2f5'}}>
                <div><div style={{fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#7750a8'}}>{window.kvT('Fee months covered')}</div><div style={{fontSize:17,fontWeight:700,color:'var(--color-text-primary)',marginTop:3}}>{overallPeriod.label}</div></div>
                {overallPeriod.count > 1 && <div style={{fontSize:13,fontWeight:600,color:'#7750a8',whiteSpace:'nowrap'}}>{overallPeriod.count} {window.kvT('months')}</div>}
              </div>}
              <section className="kv-receipt-payment-section">
                <div className="kv-receipt-section-heading">
                  <div><span>{window.kvT('Payment Summary')}</span><small>{window.kvT('Official payment document')}</small></div>
                  <span className="kv-receipt-paid-badge" style={receiptStatus === 'Partial' ? {background:'#fff3cd',color:'#8a5a00'} : undefined}><i className="ti ti-circle-check-filled" aria-hidden="true"/> {window.kvT(receiptStatus === 'Partial' ? 'Partial Payment' : (receiptStatus === 'Advance' ? 'Advance Payment' : 'Paid'))}</span>
                </div>
                <table className="kv-receipt-items-table">
                  <thead><tr><th>{window.kvT('Description')}</th><th>{window.kvT('Fee Period')}</th><th>{window.kvT('Amount (RM)')}</th></tr></thead>
                  <tbody>
                    {receiptItems.map((item, index) => { const itemPeriod = item.type === 'Monthly Fee' ? formatPaymentPeriod(item.month) : {label: '', count: 0}; return <tr key={item.id || `${item.type}-${index}`}>
                      <td>{item.desc || window.kvPaymentItemLabel(item.type, item.month)}</td>
                      <td>{itemPeriod.label ? `${itemPeriod.label}${itemPeriod.count > 1 ? ` (${itemPeriod.count} ${window.kvT('months')})` : ""}` : "—"}</td>
                      <td>{parseFloat(item.amount || 0).toFixed(2)}</td>
                    </tr>})}
                  </tbody>
                  <tfoot><tr><td colSpan="2">{window.kvT('Total Received')}</td><td>RM {receiptTotal.toFixed(2)}</td></tr>{receiptStatus === 'Partial' && receiptBalance !== null && <tr><td colSpan="2" style={{color:'#8a5a00'}}>{window.kvT('Outstanding Balance')}</td><td style={{color:'#8a5a00'}}>RM {receiptBalance.toFixed(2)}</td></tr>}</tfoot>
                </table>
              </section>

              <section className="kv-receipt-lower-grid">
                <div className="kv-receipt-info-card">
                  <div className="kv-receipt-info-icon"><i className="ti ti-credit-card" aria-hidden="true"/></div>
                  <div>
                    <h4>{window.kvT('Payment Details')}</h4>
                    <dl>
                      <div><dt>{window.kvT('Method')}</dt><dd>{window.kvT(sel.method || 'Cash')}</dd></div>
                      {sel.ref ? <div><dt>{window.kvT('Ref')}</dt><dd>{sel.ref}</dd></div> : null}
                      {sel.notes ? <div><dt>{window.kvT('Notes')}</dt><dd>{sel.notes}</dd></div> : null}
                    </dl>
                  </div>
                </div>
                <div className="kv-receipt-info-card">
                  <div className="kv-receipt-info-icon"><i className="ti ti-file-certificate" aria-hidden="true"/></div>
                  <div><h4>{window.kvT('Receipt Notes')}</h4><p>{window.kvT('No signature required. This is a digital receipt.')}</p></div>
                </div>
              </section>

              <section className="kv-receipt-confirmation">
                <div className="kv-receipt-confirmation-mark"><i className="ti ti-check" aria-hidden="true"/></div>
                <div><span>{window.kvT(receiptStatus === 'Partial' ? 'Partial Payment Received' : 'Payment Confirmed')}</span><p>{window.kvT(receiptStatus === 'Partial' ? 'This receipt confirms a partial payment. The remaining balance is still outstanding.' : 'This receipt confirms that the payment above has been received and recorded in KinderVault.')}</p></div>
                <strong>RM {receiptTotal.toFixed(2)}</strong>
              </section>

              <footer className="kv-receipt-footer">
                <div><strong>{window.kvT('Generated by KinderVault')}</strong><span>{sel.receipt}</span></div>
                <div className="kv-receipt-footer-thanks">{window.kvT('Thank you for your payment.')}</div>
              </footer>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="kv-page kv-page--receipts">
      <div className="kv-page-header no-print" style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <h2 className="kv-page-title" style={{margin:0}}>
          <i className="ti ti-receipt" style={{marginRight:8}} aria-hidden="true"/>{window.kvT('Receipts')}
        </h2>
        {canPrintReceipts && <Btn variant="outline" onClick={printReceiptList} style={{marginLeft:"auto"}}><i className="ti ti-printer" aria-hidden="true"/> {window.kvT("Print")}</Btn>}
      </div>
      <Card className="kv-table-card">
        <CardHead>
          <div className="kv-table-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",flexWrap:"wrap",gap:10}}>
            <div>
              <i className="ti ti-table" style={{marginRight:6}} aria-hidden="true"/>{window.kvT('All Receipts')}&nbsp;
              <span style={{background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{receipts.length}</span>
            </div>
            <div className="kv-table-filters" style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{position:"relative"}}>
                <i className="ti ti-search" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-tertiary)",fontSize:14}} aria-hidden="true"/>
                <input 
                  type="text" 
                  placeholder={window.kvT('Search student...')} 
                  value={searchQuery}
                  onChange={e => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    replaceRouteState && replaceRouteState({search:value});
                  }}
                  className="kv-input"
                  style={{padding:"6px 10px 6px 30px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",width:200}}
                />
              </div>
              <select 
                value={filterType}
                onChange={e => {
                  const value = e.target.value;
                  setFilterType(value);
                  replaceRouteState && replaceRouteState({filterType:value});
                }}
                className="kv-input"
                style={{padding:"6px 10px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}
              >
                <option value="">{window.kvT('All Types')}</option>
                {receiptTypes.map(t => (
                  <option key={t} value={t}>{window.kvT(t)}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHead>
        {receipts.length ? (
          <div className="kv-table-scroll" style={{overflowX:"auto"}}>
            <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--color-background-secondary)"}}>
                  {[window.kvT('Receipt No.'), window.kvT('Student'), window.kvT('Type'), window.kvT('Amount'), window.kvT('Date'), window.kvT('Actions')].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipts.map(p=>{
                  const s = students.find(x=>x.id===p.student_id||x.id===parseInt(p.student_id));
                  return (
                    <tr key={p.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                      <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,fontWeight:500,color:"var(--color-text-primary)"}}>{p.receipt}</td>
                      <td style={{padding:"9px 12px"}}><div style={{fontWeight:500,color:"var(--color-text-primary)"}}>{p.student_name||s?.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{p.student_class||s?.class}</div></td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{window.kvT(p.type)}</td>
                      <td style={{padding:"9px 12px",fontWeight:500,color:C.green}}>RM {parseFloat(p.amount).toFixed(2)}</td>
                      <td style={{padding:"9px 12px",color:"var(--color-text-secondary)"}}>{p.date ? window.kvDate(p.date, {day:'numeric', month:'short', year:'numeric'}, p.date) : "–"}</td>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",gap:6}}>
                          <Btn small variant="outline" onClick={()=>open(p)}><i className="ti ti-eye" aria-hidden="true"/> {window.kvT('View')}</Btn>
                          <Btn small variant="outline" onClick={()=>sendWhatsApp(p)} style={{background:"#25D366",color:"#fff",borderColor:"#25D366"}}><i className="ti ti-brand-whatsapp" aria-hidden="true"/></Btn>
                          {canPrintReceipts && <Btn small variant="outline" onClick={()=>{open(p); handlePrint(p, 300);}}><i className="ti ti-printer" aria-hidden="true"/></Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="receipt" text={window.kvT('No receipts yet. Record a payment to generate one.')}/>}      </Card>

      <div className="print-area kv-receipts-list-print-area" aria-label={window.kvT("All Receipts")}>
        <div className="kv-receipts-list-print-sheet">
          <header className="kv-list-print-header">
            <div>
              <h1>{window.kvT("All Receipts")}</h1>
              <p>{window.kvT("Receipts")} · {receipts.length}</p>
            </div>
            <span>{window.kvDate(new Date(), {day:"numeric", month:"short", year:"numeric"})}</span>
          </header>
          {receipts.length ? (
            <table className="kv-list-print-table kv-receipts-list-print-table">
              <thead><tr>
                {["Receipt No.", "Student", "Type", "Fee Period", "Amount (RM)", "Date"].map(label => <th key={label}>{window.kvT(label)}</th>)}
              </tr></thead>
              <tbody>{receipts.map(receipt => {
                const student = students.find(item => item.id === receipt.student_id || item.id === parseInt(receipt.student_id));
                const monthlyMonths = collectReceiptMonths(receipt.items || [receipt], student);
                const period = formatPaymentPeriod(monthlyMonths.join(","));
                return <tr key={receipt.receipt || receipt.id}>
                  <td><strong>{receipt.receipt || "-"}</strong></td>
                  <td><strong>{receipt.student_name || student?.name || "-"}</strong><small>{receipt.student_class || student?.class || "-"}</small></td>
                  <td>{window.kvT(receipt.type || "-")}</td>
                  <td>{period.label || "-"}</td>
                  <td>RM {parseFloat(receipt.amount || 0).toFixed(2)}</td>
                  <td>{receipt.date ? window.kvDate(receipt.date, {day:"numeric", month:"short", year:"numeric"}, receipt.date) : "-"}</td>
                </tr>;
              })}</tbody>
            </table>
          ) : <p className="kv-list-print-empty">{window.kvT("No receipts yet. Record a payment to generate one.")}</p>}
        </div>
      </div>
    </div>
  );
};
