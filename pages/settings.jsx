// ============================================================
// pages/settings.jsx - Settings and administrator controls
// ============================================================

const settingsRoleFallbacks = [
  {name:"Administrator",description:"Full access to all KinderVault features.",permissions:[]},
  {name:"Teacher",description:"Student viewing and development work by default.",permissions:[]},
  {name:"Authorized Staff",description:"A configurable restricted role.",permissions:[]},
];

const SESSION_TIMEOUT_PRESETS = [
  {value:5, label:"5 minutes"}, {value:15, label:"15 minutes"},
  {value:30, label:"30 minutes"}, {value:45, label:"45 minutes"},
  {value:60, label:"1 hour"}, {value:120, label:"2 hours"},
  {value:180, label:"3 hours"}, {value:360, label:"6 hours"},
  {value:480, label:"8 hours"}, {value:720, label:"12 hours"},
  {value:1440, label:"24 hours"},
];

const SettingsModal = ({title, onClose, children, wide=false, modalClassName=""}) => (
  <div className="kv-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <div className={`kv-modal kv-settings-modal${modalClassName ? ` ${modalClassName}` : ""}`} style={{width:wide?"min(920px, 100%)":undefined}} role="dialog" aria-modal="true" aria-label={window.kvT(title)} onMouseDown={event=>event.stopPropagation()}>
      <div className="kv-settings-modal-head">
        <div>{window.kvT(title)}</div>
        <button type="button" className="kv-icon-btn" onClick={onClose} title={window.kvT("Close")} aria-label={window.kvT("Close dialog")}><i className="ti ti-x" aria-hidden="true"/></button>
      </div>
      {children}
    </div>
  </div>
);

const SettingsPermissionEditor = ({catalog, value, onChange, disabled=false, fullAccess=false}) => {
  const visibleCatalog = (catalog || []).filter(item => item.key !== "chatbot.use");
  const allKeys = visibleCatalog.map(item => item.key);
  const retainedHiddenKeys = (value || []).filter(key => !allKeys.includes(key));
  const selected = new Set((value || []).filter(key => allKeys.includes(key)));
  const groups = visibleCatalog.reduce((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});
  const toggle = (key) => {
    if (disabled) return;
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...retainedHiddenKeys, ...Array.from(next)]);
  };

  if (fullAccess) {
    return <div className="kv-settings-full-access"><i className="ti ti-shield-check" aria-hidden="true"/> {window.kvT("Administrator accounts always have full access to KinderVault.")}</div>;
  }

  return (
    <div className="kv-permission-editor">
      <div className="kv-permission-toolbar">
        <div>{window.kvT("{selected} of {total} permissions selected", {selected: selected.size, total: allKeys.length})}</div>
        <div style={{display:"flex",gap:8}}>
          <Btn small variant="outline" type="button" disabled={disabled} onClick={()=>onChange([...retainedHiddenKeys,...allKeys])}>{window.kvT("Select All")}</Btn>
          <Btn small variant="outline" type="button" disabled={disabled} onClick={()=>onChange(retainedHiddenKeys)}>{window.kvT("Clear All")}</Btn>
        </div>
      </div>
      <div className="kv-permission-groups">
        {Object.entries(groups).map(([group, items]) => (
          <section key={group} className="kv-permission-group">
            <div className="kv-permission-group-title">{window.kvT(group)}</div>
            <div className="kv-permission-list">
              {items.map(item => (
                <label key={item.key} className={`kv-permission-option${selected.has(item.key)?" is-selected":""}${disabled?" is-disabled":""}`}>
                  <input type="checkbox" checked={selected.has(item.key)} disabled={disabled} onChange={()=>toggle(item.key)}/>
                  <span>{window.kvT(item.label)}</span>
                  <code>{item.key}</code>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const SettingsUserModal = ({mode, form, setForm, roles, catalog, saving, onSave, onClose}) => {
  const allKeys = (catalog || []).map(item => item.key);
  const roleOptions = (roles || settingsRoleFallbacks).map(role => ({value:role.name,label:window.kvT(role.name)}));
  const chooseRole = (roleName) => {
    const role = (roles || []).find(item => item.name === roleName);
    setForm(prev => ({
      ...prev,
      role: roleName,
      permissions: roleName === "Administrator" ? allKeys : (role?.permissions || []),
    }));
  };

  return (
    <SettingsModal title={mode === "create" ? "Create User" : "Edit User"} onClose={onClose} wide>
      <div className="kv-settings-modal-body">
        <div className="kv-form-grid-2">
          <Input label={window.kvT("Full Name *")} value={form.full_name} onChange={event=>setForm(prev=>({...prev,full_name:event.target.value}))}/>
          <Input label={window.kvT("Username / Login ID *")} value={form.username} onChange={event=>setForm(prev=>({...prev,username:event.target.value}))}/>
        </div>
        {mode === "create" && <div className="kv-form-grid-2">
          <Input label={window.kvT("Initial Password *")} type="password" value={form.password} onChange={event=>setForm(prev=>({...prev,password:event.target.value}))} autoComplete="new-password"/>
          <Input label={window.kvT("Confirm Password *")} type="password" value={form.confirm} onChange={event=>setForm(prev=>({...prev,confirm:event.target.value}))} autoComplete="new-password"/>
        </div>}
        <div className="kv-form-grid-2">
          <Select label={window.kvT("Role")} value={form.role} onChange={event=>chooseRole(event.target.value)} options={roleOptions}/>
          <Select label={window.kvT("Account Status")} value={form.status} onChange={event=>setForm(prev=>({...prev,status:event.target.value}))} options={["Active","Inactive"].map(status=>({value:status,label:window.kvT(status)}))}/>
        </div>
        <div className="kv-settings-section-label">{window.kvT("Individual Permissions")}</div>
        <div className="kv-settings-help">{window.kvT("Role permissions are the default. These selections save the effective access for this user.")}</div>
        <SettingsPermissionEditor catalog={catalog} value={form.permissions} onChange={permissions=>setForm(prev=>({...prev,permissions}))} fullAccess={form.role === "Administrator"}/>
      </div>
      <div className="kv-settings-modal-footer">
        <Btn variant="outline" onClick={onClose}>{window.kvT("Cancel")}</Btn>
        <Btn onClick={onSave} disabled={saving}>{saving?<><i className="ti ti-loader" aria-hidden="true"/> {window.kvT("Saving...")}</>:<><i className="ti ti-device-floppy" aria-hidden="true"/> {window.kvT("Save User")}</>}</Btn>
      </div>
    </SettingsModal>
  );
};

const SettingsPasswordModal = ({user, password, setPassword, saving, onSave, onClose}) => (
  <SettingsModal title={window.kvT("Reset Password: {user}", {user:user.full_name})} onClose={onClose}>
    <div className="kv-settings-modal-body">
      <div className="kv-settings-help" style={{marginBottom:16}}>{window.kvT("Set a new password for this account. The existing password is never displayed.")}</div>
      <Input label={window.kvT("New Password *")} type="password" value={password.password} onChange={event=>setPassword(prev=>({...prev,password:event.target.value}))} autoComplete="new-password"/>
      <Input label={window.kvT("Confirm Password *")} type="password" value={password.confirm} onChange={event=>setPassword(prev=>({...prev,confirm:event.target.value}))} autoComplete="new-password"/>
    </div>
    <div className="kv-settings-modal-footer">
      <Btn variant="outline" onClick={onClose}>{window.kvT("Cancel")}</Btn>
      <Btn onClick={onSave} disabled={saving}>{saving ? window.kvT("Saving...") : window.kvT("Reset Password")}</Btn>
    </div>
  </SettingsModal>
);

const copyMfaValue = async (value) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch (error) {
    return false;
  }
};

const SettingsMfaEnrollmentModal = ({setup, setSetup, saving, onConfirm, onCancel}) => {
  const [copied, setCopied] = React.useState(false);
  const [qrError, setQrError] = React.useState(false);
  const qrContainerRef = React.useRef(null);

  React.useEffect(() => {
    const container = qrContainerRef.current;
    if (!container || !setup.provisioning_uri) return;
    container.textContent = "";
    setQrError(false);
    try {
      if (typeof window.QRCode !== "function") throw new Error("QRCode library unavailable");
      new window.QRCode(container, {
        text: setup.provisioning_uri,
        width: 196,
        height: 196,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    } catch (error) {
      setQrError(true);
    }
    return () => { container.textContent = ""; };
  }, [setup.provisioning_uri]);

  const copySecret = async () => {
    const success = await copyMfaValue(setup.secret);
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <SettingsModal title="Set Up Authenticator App" onClose={onCancel}>
      <div className="kv-settings-modal-body kv-mfa-enrollment">
        <div className="kv-mfa-enrollment-lead"><i className="ti ti-shield-lock" aria-hidden="true"/><div><strong>{window.kvT("Protect your KinderVault account")}</strong><span>{window.kvT("Use Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app.")}</span></div></div>
        <ol className="kv-mfa-steps">
          <li>{window.kvT("In your authenticator app, choose to add an account.")}</li>
          <li>{window.kvT("Scan the QR code below with your device.")}</li>
          <li>{window.kvT("Enter the six-digit code your app shows to finish setup.")}</li>
        </ol>
        <div className="kv-mfa-qr-panel">
          <div className="kv-mfa-qr-code" ref={qrContainerRef} role="img" aria-label={window.kvT("Authenticator setup QR code")}/>
          <div className="kv-mfa-qr-copy">
            <strong>{window.kvT("Scan with your authenticator app")}</strong>
            <span>{window.kvT("The QR code contains the same account name and secret key shown below.")}</span>
            {qrError && <span className="kv-mfa-qr-error"><i className="ti ti-alert-triangle" aria-hidden="true"/> {window.kvT("QR code could not be generated. Use the setup key below.")}</span>}
          </div>
        </div>
        <div className="kv-mfa-manual-label">{window.kvT("Or enter the setup key manually")}</div>
        <div className="kv-mfa-secret-wrap">
          <span>{window.kvT("Setup key")}</span>
          <code>{setup.secret}</code>
          <Btn small variant="outline" type="button" onClick={copySecret}><i className={`ti ti-${copied ? "check" : "copy"}`} aria-hidden="true"/> {window.kvT(copied ? "Copied" : "Copy")}</Btn>
        </div>
        <Input label={window.kvT("Current six-digit code")} value={setup.code} inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="123456" onChange={event=>setSetup(previous=>({...previous,code:event.target.value.replace(/\D/g, "")}))}/>
        <div className="kv-mfa-time-note"><i className="ti ti-clock" aria-hidden="true"/> {window.kvT("Your setup key expires after 10 minutes. The authenticator code changes every 30 seconds.")}</div>
      </div>
      <div className="kv-settings-modal-footer"><Btn variant="outline" onClick={onCancel} disabled={saving}>{window.kvT("Cancel")}</Btn><Btn onClick={onConfirm} disabled={saving || setup.code.length !== 6}>{window.kvT(saving ? "Verifying..." : "Verify and enable MFA")}</Btn></div>
    </SettingsModal>
  );
};

const SettingsMfaRecoveryCodesModal = ({codes, onClose}) => {
  const [copied, setCopied] = React.useState(false);
  const copyCodes = async () => {
    const success = await copyMfaValue(codes.join("\n"));
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <SettingsModal title="Save Your Recovery Codes" onClose={onClose}>
      <div className="kv-settings-modal-body kv-mfa-recovery-modal">
        <div className="kv-mfa-recovery-warning"><i className="ti ti-alert-triangle" aria-hidden="true"/><span>{window.kvT("Each code works once. Store them somewhere safe and offline. They will not be shown again.")}</span></div>
        <div className="kv-mfa-recovery-grid">{codes.map(code=><code key={code}>{code}</code>)}</div>
        <Btn small variant="outline" type="button" onClick={copyCodes}><i className={`ti ti-${copied ? "check" : "copy"}`} aria-hidden="true"/> {window.kvT(copied ? "Copied" : "Copy all codes")}</Btn>
      </div>
      <div className="kv-settings-modal-footer"><Btn onClick={onClose}>{window.kvT("I've stored them safely")}</Btn></div>
    </SettingsModal>
  );
};

const SettingsMfaReauthModal = ({action, form, setForm, saving, onSave, onClose}) => {
  const disabling = action === "disable";
  return (
    <SettingsModal title={disabling ? "Turn Off Multi-Factor Authentication" : "Generate New Recovery Codes"} onClose={onClose}>
      <div className="kv-settings-modal-body">
        <div className="kv-settings-help" style={{marginBottom:16}}>{window.kvT(disabling ? "Confirm your current password and authenticator code before removing this protection." : "Your existing recovery codes will stop working after new ones are generated.")}</div>
        <Input label={window.kvT("Current Password *")} type="password" value={form.password} autoComplete="current-password" onChange={event=>setForm(previous=>({...previous,password:event.target.value}))}/>
        <Input label={window.kvT("Authenticator Code *")} value={form.code} inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="123456" onChange={event=>setForm(previous=>({...previous,code:event.target.value.replace(/\D/g, "")}))}/>
      </div>
      <div className="kv-settings-modal-footer"><Btn variant="outline" onClick={onClose} disabled={saving}>{window.kvT("Cancel")}</Btn><Btn variant={disabling ? "danger" : "primary"} onClick={onSave} disabled={saving || !form.password || form.code.length !== 6}>{window.kvT(saving ? "Confirming..." : disabling ? "Turn Off MFA" : "Generate New Codes")}</Btn></div>
    </SettingsModal>
  );
};

const SettingsAuditDetailModal = ({record, onClose}) => {
  const metadata = record.metadata || {};
  const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
  return (
    <SettingsModal title={window.kvT("Activity LOG-{id}", {id:String(record.id).padStart(6,"0")})} onClose={onClose} wide modalClassName="kv-audit-detail-modal">
      <div className="kv-settings-modal-body kv-audit-detail-body">
        <div className="kv-audit-detail-grid">
          {[
            ["User", record.user_name_snapshot || record.username_snapshot || window.kvT("System")],
            ["Role", record.user_role_snapshot ? window.kvT(record.user_role_snapshot) : "-"],
            ["Action", window.kvT(record.action)],
            ["Module", record.module ? window.kvT(record.module) : "-"],
            ["Record", record.record_id || (record.record_type ? window.kvT(record.record_type) : "-")],
            ["Status", window.kvT(record.status)],
            ["Date & Time", window.kvDateTime(record.created_at, {dateStyle:"medium",timeStyle:"short"})],
            ["IP Address", record.ip_address || window.kvT("Not collected")],
          ].map(([label, value]) => <div key={label}><span>{window.kvT(label)}</span><strong>{value}</strong></div>)}
        </div>
        <div className="kv-audit-detail-description">{record.description}</div>
        {changes.length > 0 && <div className="kv-audit-changes">
          <div className="kv-settings-section-label">{window.kvT("Changed Fields")}</div>
          {changes.map((change,index) => <div className="kv-audit-change" key={`${change.field}-${index}`}><strong>{window.kvT(change.field)}</strong><span>{String(change.before || "-")}</span><i className="ti ti-arrow-right" aria-hidden="true"/><span>{String(change.after || "-")}</span></div>)}
        </div>}
        {(metadata.added || metadata.removed) && <div className="kv-audit-changes">
          <div className="kv-settings-section-label">{window.kvT("Permission Changes")}</div>
          {metadata.added?.length > 0 && <div className="kv-audit-change-list"><strong>{window.kvT("Added")}</strong><span>{metadata.added.join(", ")}</span></div>}
          {metadata.removed?.length > 0 && <div className="kv-audit-change-list"><strong>{window.kvT("Removed")}</strong><span>{metadata.removed.join(", ")}</span></div>}
        </div>}
        {record.user_agent && <div className="kv-settings-help kv-audit-browser-detail">{window.kvT("Browser:")} {record.user_agent}</div>}
      </div>
      <div className="kv-settings-modal-footer"><Btn variant="outline" onClick={onClose}>{window.kvT("Close")}</Btn></div>
    </SettingsModal>
  );
};

const SettingsAuditPrintReport = ({data, formatDateTime}) => {
  const filters = Object.entries(data.filters || {}).filter(([, value]) => value !== "");
  const filterLabels = {
    q:"Search", from:"From date", to:"To date", user_id:"User", role:"Role",
    module:"Module", action:"Action", status:"Status",
  };
  const filterValue = (key, value) => {
    if (key === "user_id") return data.users?.[value] || value;
    if (["role","module","action","status"].includes(key)) return window.kvT(value);
    return value;
  };

  return (
    <section className="print-area kv-audit-print-area" aria-label={window.kvT("Security Audit History")}> 
      <header className="kv-audit-print-header">
        <div><span>KinderVault</span><h1>{window.kvT("Security Audit History")}</h1></div>
        <div className="kv-audit-print-generated"><strong>{window.kvT("Generated")}</strong><span>{formatDateTime(data.generated_at)}</span></div>
      </header>
      <div className="kv-audit-print-overview">
        <div><strong>{data.records.length}</strong><span>{window.kvT("Total Events")}</span></div>
        <div><strong>{filters.length || window.kvT("None")}</strong><span>{window.kvT("Applied Filters")}</span></div>
      </div>
      <div className="kv-audit-print-filters">
        <strong>{window.kvT("Applied Filters")}</strong>
        {filters.length ? <div>{filters.map(([key,value])=><span key={key}><b>{window.kvT(filterLabels[key] || key)}:</b> {filterValue(key,value)}</span>)}</div> : <span>{window.kvT("No filters applied; this report contains the complete audit history.")}</span>}
      </div>
      {data.records.length ? <div className="kv-audit-print-events">{data.records.map(record => {
        const metadata = record.metadata && Object.keys(record.metadata).length ? JSON.stringify(record.metadata, null, 2) : "";
        return <article className="kv-audit-print-event" key={record.id}>
          <div className="kv-audit-print-event-head">
            <strong>LOG-{String(record.id).padStart(6,"0")}</strong>
            <span>{formatDateTime(record.created_at)}</span>
            <b className={record.status === "Success" ? "is-success" : "is-failed"}>{window.kvT(record.status)}</b>
          </div>
          <dl>
            <div><dt>{window.kvT("User")}</dt><dd>{record.user_name_snapshot || window.kvT("System")} {record.username_snapshot ? `(${record.username_snapshot})` : ""}</dd></div>
            <div><dt>{window.kvT("User ID")}</dt><dd>{record.user_id ?? "-"}</dd></div>
            <div><dt>{window.kvT("Role")}</dt><dd>{record.user_role_snapshot ? window.kvT(record.user_role_snapshot) : "-"}</dd></div>
            <div><dt>{window.kvT("Action")}</dt><dd>{window.kvT(record.action)}</dd></div>
            <div><dt>{window.kvT("Module")}</dt><dd>{record.module ? window.kvT(record.module) : "-"}</dd></div>
            <div><dt>{window.kvT("Record")}</dt><dd>{record.record_id || "-"} {record.record_type ? `(${window.kvT(record.record_type)})` : ""}</dd></div>
            <div><dt>{window.kvT("IP Address")}</dt><dd>{record.ip_address || window.kvT("Not collected")}</dd></div>
          </dl>
          <div className="kv-audit-print-description"><strong>{window.kvT("Description")}</strong><span>{record.description || "-"}</span></div>
          <div className="kv-audit-print-description"><strong>{window.kvT("User Agent")}</strong><span>{record.user_agent || window.kvT("Not collected")}</span></div>
          {metadata && <div className="kv-audit-print-metadata"><strong>{window.kvT("Event Metadata")}</strong><pre>{metadata}</pre></div>}
        </article>;
      })}</div> : <p className="kv-audit-print-empty">{window.kvT("No activity matches the selected filters.")}</p>}
    </section>
  );
};

const SettingsPage = ({setFlash, currentUser, setCurrentUser, feeConfig, setFeeConfig, isAdministrator, students = [], setStudents, payments = [], devRecords = [], classesList = [], setClassesList, navigationState = {}, navigationKey}) => {
  const allowedInitialTabs = isAdministrator
    ? ["general","users","roles","security","audit","backup"]
    : ["general","security"];
  const [activeTab, setActiveTab] = React.useState(allowedInitialTabs.includes(navigationState?.tab) ? navigationState.tab : "general");
  const [name, setName] = React.useState(currentUser?.full_name || "");
  const [pass, setPass] = React.useState("");
  const [conf, setConf] = React.useState("");
  const [generalSaving, setGeneralSaving] = React.useState(false);
  const [localFeeConfig, setLocalFeeConfig] = React.useState({
    ...(feeConfig || {}),
    monthly_iqra: feeConfig?.monthly_iqra ?? feeConfig?.annual?.iqra ?? 30,
  });
  const [classNames, setClassNames] = React.useState([]);
  const [classSaving, setClassSaving] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [roles, setRoles] = React.useState(settingsRoleFallbacks);
  const [catalog, setCatalog] = React.useState([]);
  const [adminLoading, setAdminLoading] = React.useState(false);
  const [userModal, setUserModal] = React.useState(null);
  const [userForm, setUserForm] = React.useState(null);
  const [userSaving, setUserSaving] = React.useState(false);
  const [passwordTarget, setPasswordTarget] = React.useState(null);
  const [passwordForm, setPasswordForm] = React.useState({password:"",confirm:""});
  const [roleEditor, setRoleEditor] = React.useState(null);
  const [roleSaving, setRoleSaving] = React.useState(false);
  const [securityConfig, setSecurityConfig] = React.useState(null);
  const [sessionTimeoutCustomMode, setSessionTimeoutCustomMode] = React.useState(false);
  const [sessionTimeoutOpen, setSessionTimeoutOpen] = React.useState(false);
  const sessionTimeoutPickerRef = React.useRef(null);
  const [securitySaving, setSecuritySaving] = React.useState(false);
  const [securityInfo, setSecurityInfo] = React.useState(null);
  const [mfaStatus, setMfaStatus] = React.useState(null);
  const [mfaSetup, setMfaSetup] = React.useState(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = React.useState(null);
  const [mfaSensitiveAction, setMfaSensitiveAction] = React.useState(null);
  const [mfaSensitiveForm, setMfaSensitiveForm] = React.useState({password:"",code:""});
  const [mfaSaving, setMfaSaving] = React.useState(false);
  const [auditRecords, setAuditRecords] = React.useState([]);
  const [auditSummary, setAuditSummary] = React.useState(null);
  const [auditPagination, setAuditPagination] = React.useState({page:1,per_page:25,total:0,total_pages:1});
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [auditDetail, setAuditDetail] = React.useState(null);
  const [auditFilters, setAuditFilters] = React.useState({q:"",from:"",to:"",user_id:"",role:"",module:"",action:"",status:""});
  const [auditPrintLoading, setAuditPrintLoading] = React.useState(false);
  const [auditPrintData, setAuditPrintData] = React.useState(null);

  const tabs = [
    {id:"general",label:"General",icon:"settings"},
    ...(isAdministrator ? [
      {id:"users",label:"User Management",icon:"users"},
      {id:"roles",label:"Roles & Permissions",icon:"shield-lock"},
    ] : []),
    {id:"security",label:"Security",icon:"lock"},
    ...(isAdministrator ? [
      {id:"audit",label:"Audit Log",icon:"list-search"},
      {id:"backup",label:"Backup & Restore",icon:"database-export"},
    ] : []),
  ];

  React.useEffect(() => {
    setName(currentUser?.full_name || "");
  }, [currentUser?.full_name]);

  React.useEffect(() => {
    setLocalFeeConfig({
      ...(feeConfig || {}),
      monthly_iqra: feeConfig?.monthly_iqra ?? feeConfig?.annual?.iqra ?? 30,
    });
  }, [feeConfig]);

  React.useEffect(() => {
    setClassNames((classesList || []).slice().sort((left, right) => Number(left.age_group || 99) - Number(right.age_group || 99)));
  }, [classesList]);

  React.useEffect(() => {
    const closeOnOutsidePointer = (event) => {
      if (!sessionTimeoutPickerRef.current?.contains(event.target)) setSessionTimeoutOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  React.useEffect(() => {
    if (!isAdministrator && !["general","security"].includes(activeTab)) setActiveTab("general");
  }, [isAdministrator, activeTab]);

  React.useEffect(() => {
    const allowedTabs = isAdministrator
      ? ["general","users","roles","security","audit","backup"]
      : ["general","security"];
    setActiveTab(allowedTabs.includes(navigationState?.tab) ? navigationState.tab : "general");
  }, [isAdministrator, navigationKey, navigationState?.tab]);

  const loadAdminData = async () => {
    if (!isAdministrator) return;
    setAdminLoading(true);
    try {
      const res = await api.get("api/users.php");
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setUsers(Array.isArray(res.users) ? res.users : []);
      setRoles(Array.isArray(res.roles) ? res.roles : settingsRoleFallbacks);
      setCatalog(Array.isArray(res.permission_catalog) ? res.permission_catalog : []);
    } catch (error) {
      setFlash({msg:window.kvT("Unable to load user management data."),type:"danger"});
    } finally {
      setAdminLoading(false);
    }
  };

  const loadSecurity = async () => {
    if (!isAdministrator) return;
    try {
      const res = await api.get("api/security.php");
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setSecurityConfig(res.security_config || null);
      setSessionTimeoutCustomMode(false);
      setSessionTimeoutOpen(false);
      setSecurityInfo(res.mfa || null);
    } catch (error) {
      setFlash({msg:window.kvT("Unable to load security settings."),type:"danger"});
    }
  };

  const loadMfaStatus = async () => {
    try {
      const res = await api.get("api/mfa.php");
      if (res.error) {
        setMfaStatus({available:false,status:res.error});
        return;
      }
      setMfaStatus(res.mfa || null);
    } catch (error) {
      setMfaStatus({available:false,status:window.kvT("Unable to load multi-factor authentication status.")});
    }
  };

  const loadAudit = async (requestedPage=1) => {
    if (!isAdministrator) return;
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({page:String(requestedPage),per_page:"25"});
      Object.entries(auditFilters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const res = await api.get(`api/audit_logs.php?${params.toString()}`);
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setAuditRecords(Array.isArray(res.records) ? res.records : []);
      setAuditSummary(res.summary || null);
      setAuditPagination(res.pagination || {page:1,per_page:25,total:0,total_pages:1});
    } catch (error) {
      setFlash({msg:window.kvT("Unable to load audit activity."),type:"danger"});
    } finally {
      setAuditLoading(false);
    }
  };

  React.useEffect(() => {
    if (["users","roles","audit"].includes(activeTab)) loadAdminData();
    if (activeTab === "security") loadSecurity();
    if (activeTab === "audit") loadAudit(1);
  }, [activeTab, isAdministrator]);

  React.useEffect(() => {
    loadMfaStatus();
  }, [currentUser?.id]);

  React.useEffect(() => {
    if (!auditPrintData) return;
    const previousTitle = document.title;
    document.title = auditPrintData.print_title || "Audit history";
    document.documentElement.classList.add("kv-printing-audit");
    document.body.classList.add("kv-printing-audit");
    const timer = window.setTimeout(() => {
      try {
        window.print();
      } finally {
        document.title = previousTitle;
        document.documentElement.classList.remove("kv-printing-audit");
        document.body.classList.remove("kv-printing-audit");
        setAuditPrintData(null);
      }
    }, 150);
    return () => {
      window.clearTimeout(timer);
      document.title = previousTitle;
      document.documentElement.classList.remove("kv-printing-audit");
      document.body.classList.remove("kv-printing-audit");
    };
  }, [auditPrintData]);

  const patchFee = (path, value) => {
    setLocalFeeConfig(previous => {
      const next = JSON.parse(JSON.stringify(previous || {}));
      let ref = next;
      for (let index = 0; index < path.length - 1; index++) ref = ref[path[index]];
      ref[path[path.length - 1]] = value;
      return next;
    });
  };

  const moneyInput = (label, path) => {
    const amount = path.reduce((acc, key) => acc?.[key], localFeeConfig) ?? 0;
    return <div className="kv-money-field" style={{marginBottom:12}} key={path.join("-")}>
      <div className="kv-field-label">{window.kvT(label)}</div>
      <div className="kv-money-input" style={{display:"flex"}}>
        <span>RM</span>
        <input className="kv-form-control" type="number" min="0" value={amount} onChange={event=>patchFee(path, parseFloat(event.target.value || 0))}/>
      </div>
    </div>;
  };

  const saveGeneral = async () => {
    if (pass !== conf) {
      setFlash({msg:window.kvT("Passwords do not match."),type:"danger"});
      return;
    }
    setGeneralSaving(true);
    try {
      const payload = {full_name:name,password:pass,confirm:conf};
      if (isAdministrator) payload.fee_config = localFeeConfig;
      const res = await api.post("api/settings.php", payload);
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      if (isAdministrator) setFeeConfig(localFeeConfig);
      if (typeof setCurrentUser === "function") setCurrentUser(previous=>({...previous,full_name:name}));
      setPass("");
      setConf("");
      setFlash({msg:window.kvT("Settings saved successfully."),type:"success"});
    } catch (error) {
      setFlash({msg:window.kvT("Network error. Please try again."),type:"danger"});
    } finally {
      setGeneralSaving(false);
    }
  };

  const saveClassNames = async () => {
    if (!isAdministrator || classSaving) return;
    const names = classNames.map(item => String(item.name || "").trim());
    if (names.some(name => !name || name.length > 80 || /[<>]/.test(name))) {
      setFlash({msg:window.kvT("Each class name is required and must be 80 characters or fewer."),type:"danger"});
      return;
    }
    if (new Set(names.map(name => name.toLowerCase())).size !== names.length) {
      setFlash({msg:window.kvT("Class names must be unique."),type:"danger"});
      return;
    }
    setClassSaving(true);
    try {
      const renamePairs = classNames.map(item => {
        const before = (classesList || []).find(current => current.id === item.id);
        return {before: before?.name || item.name, after: String(item.name || "").trim(), age_group: item.age_group};
      });
      let nextClasses = classNames;
      for (const item of classNames) {
        const response = await api.put(`api/classes.php?id=${item.id}`, {name:String(item.name || "").trim()});
        if (response.error) throw new Error(response.error);
        if (response.class) nextClasses = nextClasses.map(current => current.id === item.id ? response.class : current);
      }
      setClassNames(nextClasses);
      if (typeof setClassesList === "function") setClassesList(nextClasses);
      if (typeof setStudents === "function") {
        setStudents(previous => previous.map(student => {
          const pair = renamePairs.find(rename => String(student.class || "") === String(rename.before || "")
            || (rename.age_group && new RegExp("^\\s*" + rename.age_group + "(?:\\D|$)").test(String(student.program_age || ""))));
          return pair ? {...student, class: pair.after} : student;
        }));
      }
      setFlash({msg:window.kvT("Class names saved successfully."),type:"success"});
    } catch (error) {
      setFlash({msg:error.message || window.kvT("Unable to save class names."),type:"danger"});
    } finally {
      setClassSaving(false);
    }
  };

  const openCreateUser = () => {
    const teacher = roles.find(role => role.name === "Teacher") || roles[0] || settingsRoleFallbacks[1];
    setUserForm({full_name:"",username:"",password:"",confirm:"",role:teacher.name,status:"Active",permissions:teacher.permissions || []});
    setUserModal("create");
  };

  const openEditUser = (user) => {
    setUserForm({
      id:user.id,
      full_name:user.full_name,
      username:user.username,
      role:user.role,
      status:user.status,
      permissions:user.effective_permissions || [],
    });
    setUserModal("edit");
  };

  const saveUser = async () => {
    if (!userForm) return;
    if (userModal === "create" && userForm.password !== userForm.confirm) {
      setFlash({msg:window.kvT("Passwords do not match."),type:"danger"});
      return;
    }
    setUserSaving(true);
    try {
      const res = userModal === "create"
        ? await api.post("api/users.php", userForm)
        : await api.put(`api/users.php?id=${userForm.id}`, userForm);
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setUserModal(null);
      setUserForm(null);
      setFlash({msg:window.kvT(userModal === "create" ? "User created successfully." : "User updated successfully."),type:"success"});
      await loadAdminData();
    } catch (error) {
      setFlash({msg:window.kvT("Unable to save the user account."),type:"danger"});
    } finally {
      setUserSaving(false);
    }
  };

  const changeUserStatus = async (user) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    if (nextStatus === "Inactive" && !window.confirm(window.kvT("Deactivate {user}?", {user:user.full_name}))) return;
    try {
      const res = await api.put(`api/users.php?id=${user.id}`, {
        full_name:user.full_name,
        username:user.username,
        role:user.role,
        status:nextStatus,
        permissions:user.effective_permissions || [],
      });
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setFlash({msg:window.kvT(nextStatus === "Active" ? "User activated." : "User deactivated."),type:"success"});
      await loadAdminData();
    } catch (error) {
      setFlash({msg:window.kvT("Unable to update account status."),type:"danger"});
    }
  };

  const resetPassword = async () => {
    if (!passwordTarget) return;
    setUserSaving(true);
    try {
      const res = await api.post("api/users.php", {action:"reset_password",id:passwordTarget.id,...passwordForm});
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setPasswordTarget(null);
      setPasswordForm({password:"",confirm:""});
      setFlash({msg:window.kvT("Password reset successfully."),type:"success"});
      await loadAdminData();
    } catch (error) {
      setFlash({msg:window.kvT("Unable to reset the password."),type:"danger"});
    } finally {
      setUserSaving(false);
    }
  };

  const saveRole = async () => {
    if (!roleEditor) return;
    setRoleSaving(true);
    try {
      const res = await api.put("api/roles.php", {role:roleEditor.name,permissions:roleEditor.permissions});
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setRoles(Array.isArray(res.roles) ? res.roles : roles);
      setRoleEditor(null);
      setFlash({msg:window.kvT("Role permissions saved successfully."),type:"success"});
      await loadAdminData();
    } catch (error) {
      setFlash({msg:window.kvT("Unable to save role permissions."),type:"danger"});
    } finally {
      setRoleSaving(false);
    }
  };

  const saveSecurity = async () => {
    if (!securityConfig) return;
    const timeoutMinutes = Number(securityConfig.session_timeout_minutes);
    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 5 || timeoutMinutes > 1440) {
      setFlash({msg:window.kvT("Enter a session timeout from 5 to 1,440 minutes."),type:"danger"});
      document.getElementById("kv-session-timeout-custom")?.focus();
      return;
    }
    setSecuritySaving(true);
    try {
      const res = await api.put("api/security.php", {security_config:securityConfig});
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      const savedSecurityConfig = res.security_config || securityConfig;
      setSecurityConfig(savedSecurityConfig);
      setSecurityInfo(res.mfa || securityInfo);
      setFlash({msg:window.kvT("Security settings saved successfully."),type:"success"});
    } catch (error) {
      setFlash({msg:window.kvT("Unable to save security settings."),type:"danger"});
    } finally {
      setSecuritySaving(false);
    }
  };

  const beginMfaEnrollment = async () => {
    setMfaSaving(true);
    try {
      const res = await api.post("api/mfa.php", {action:"begin_enrollment"});
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setMfaSetup({
        secret:res.secret,
        account_name:res.account_name || currentUser?.username || "KinderVault",
        provisioning_uri:res.provisioning_uri || "",
        code:"",
      });
    } catch (error) {
      setFlash({msg:window.kvT("Unable to start MFA setup."),type:"danger"});
    } finally {
      setMfaSaving(false);
    }
  };

  const cancelMfaEnrollment = async () => {
    try {
      await api.post("api/mfa.php", {action:"cancel_enrollment"});
    } catch (error) {
      // The setup secret only lives in this session and naturally expires.
    }
    setMfaSetup(null);
  };

  const confirmMfaEnrollment = async () => {
    if (!mfaSetup) return;
    setMfaSaving(true);
    try {
      const res = await api.post("api/mfa.php", {action:"confirm_enrollment",code:mfaSetup.code});
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setMfaStatus(res.mfa || null);
      setMfaSetup(null);
      setMfaRecoveryCodes(Array.isArray(res.recovery_codes) ? res.recovery_codes : []);
      if (isAdministrator && activeTab === "security") loadSecurity();
    } catch (error) {
      setFlash({msg:window.kvT("Unable to verify the authenticator code."),type:"danger"});
    } finally {
      setMfaSaving(false);
    }
  };

  const openMfaSensitiveAction = (action) => {
    setMfaSensitiveForm({password:"",code:""});
    setMfaSensitiveAction(action);
  };

  const saveMfaSensitiveAction = async () => {
    if (!mfaSensitiveAction) return;
    setMfaSaving(true);
    try {
      const res = await api.post("api/mfa.php", {action:mfaSensitiveAction,...mfaSensitiveForm});
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setMfaStatus(res.mfa || null);
      setMfaSensitiveAction(null);
      setMfaSensitiveForm({password:"",code:""});
      if (Array.isArray(res.recovery_codes)) {
        setMfaRecoveryCodes(res.recovery_codes);
      } else {
        setFlash({msg:window.kvT("Multi-factor authentication has been turned off."),type:"success"});
      }
      if (isAdministrator && activeTab === "security") loadSecurity();
    } catch (error) {
      setFlash({msg:window.kvT("Unable to update multi-factor authentication."),type:"danger"});
    } finally {
      setMfaSaving(false);
    }
  };

  const openAuditDetail = async (id) => {
    try {
      const res = await api.get(`api/audit_logs.php?id=${id}`);
      if (res.error) {
        setFlash({msg:res.error,type:"danger"});
        return;
      }
      setAuditDetail(res.record || null);
    } catch (error) {
      setFlash({msg:window.kvT("Unable to load activity details."),type:"danger"});
    }
  };

  const printAuditHistory = async () => {
    if (!isAdministrator || auditPrintLoading) return;
    setAuditPrintLoading(true);
    try {
      const records = [];
      let page = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({page:String(page),per_page:"100",include_details:"1"});
        Object.entries(auditFilters).forEach(([key, value]) => { if (value) params.set(key, value); });
        const res = await api.get(`api/audit_logs.php?${params.toString()}`);
        if (res.error) throw new Error(res.error);
        records.push(...(Array.isArray(res.records) ? res.records : []));
        totalPages = Math.max(1, Number(res.pagination?.total_pages || 1));
        page += 1;
      } while (page <= totalPages);

      const userNames = Object.fromEntries(users.map(user => [String(user.id), user.full_name]));
      const generatedAt = new Date();
      const pad = value => String(value).padStart(2, "0");
      const printTitle = `Audit history (${pad(generatedAt.getDate())}-${pad(generatedAt.getMonth() + 1)}-${generatedAt.getFullYear()}) (${pad(generatedAt.getHours())}-${pad(generatedAt.getMinutes())})`;
      setAuditPrintData({records,filters:{...auditFilters},users:userNames,generated_at:generatedAt.toISOString(),print_title:printTitle});
    } catch (error) {
      setFlash({msg:error.message || window.kvT("Unable to prepare the audit history for printing."),type:"danger"});
    } finally {
      setAuditPrintLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return window.kvT("Never");
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : window.kvDateTime(date, {dateStyle:"medium",timeStyle:"short"});
  };

  const auditActionBadge = (action) => {
    const color = /DELETE|DEACTIVATED|FAILED|DENIED|BLOCKED/.test(action) ? "red" : /LOGIN|LOGOUT|SECURITY|PASSWORD|ROLE|PERMISSIONS/.test(action) ? "blue" : /BACKUP/.test(action) ? "teal" : "green";
    return <span className={`kv-badge kv-badge--${color}`}>{window.kvT(action)}</span>;
  };

  const renderMfaAccountCard = () => <Card className="kv-mfa-account-card">
    <CardHead><i className="ti ti-shield-lock" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Multi-Factor Authentication")}</CardHead>
    <div className="kv-form-card-body">
      {!mfaStatus ? <div className="kv-settings-help">{window.kvT("Checking MFA protection for this account...")}</div> : <>
        <div className="kv-mfa-account-status">
          <div className={`kv-mfa-account-icon${mfaStatus.enabled ? " is-enabled" : ""}`}><i className={`ti ti-${mfaStatus.enabled ? "shield-check" : "shield"}`} aria-hidden="true"/></div>
          <div><div className="kv-mfa-account-title"><strong>{window.kvT(mfaStatus.enabled ? "Authenticator app enabled" : "Authenticator app not set up")}</strong>{mfaStatus.required_by_administrator_policy && <span className="kv-badge kv-badge--blue">{window.kvT("Required")}</span>}</div><p>{window.kvT(mfaStatus.status)}</p>{mfaStatus.enabled && <small>{window.kvT("{count} recovery codes remaining", {count:mfaStatus.recovery_codes_remaining})}{mfaStatus.confirmed_at ? ` - ${window.kvT("Enabled {date}", {date:formatDateTime(mfaStatus.confirmed_at)})}` : ""}</small>}</div>
        </div>
        {!mfaStatus.available ? <div className="kv-mfa-unavailable"><i className="ti ti-alert-triangle" aria-hidden="true"/> {window.kvT("MFA setup is unavailable until KinderVault can access its local encryption key.")}</div> : <div className="kv-mfa-account-actions">
          {mfaStatus.enabled ? <><Btn small variant="outline" onClick={()=>openMfaSensitiveAction("regenerate_recovery_codes")} disabled={mfaSaving}><i className="ti ti-refresh" aria-hidden="true"/> {window.kvT("New recovery codes")}</Btn>{!mfaStatus.required_by_administrator_policy && <Btn small variant="danger" onClick={()=>openMfaSensitiveAction("disable")} disabled={mfaSaving}><i className="ti ti-shield-off" aria-hidden="true"/> {window.kvT("Turn off MFA")}</Btn>}</> : <Btn onClick={beginMfaEnrollment} disabled={mfaSaving}><i className="ti ti-shield-plus" aria-hidden="true"/> {window.kvT(mfaSaving ? "Starting setup..." : "Set up authenticator app")}</Btn>}
        </div>}
      </>}
    </div>
  </Card>;

  const renderGeneral = () => <div className="kv-settings-stack">
    <Card>
      <CardHead><i className="ti ti-user-circle" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("My Account")}</CardHead>
      <div className="kv-form-card-body">
        <div className="kv-form-grid-2">
          <Input label={window.kvT("Full Name")} value={name} onChange={event=>setName(event.target.value)}/>
          <div className="kv-field"><div className="kv-field-label">{window.kvT("Username")}</div><input className="kv-form-control" disabled value={currentUser?.username || ""}/></div>
        </div>
        <div className="kv-settings-section-label">{window.kvT("Change Password")}</div>
        <div className="kv-form-grid-2">
          <Input label={window.kvT("New Password")} type="password" value={pass} onChange={event=>setPass(event.target.value)} placeholder={window.kvT("Leave blank to keep the current password")} autoComplete="new-password"/>
          <Input label={window.kvT("Confirm Password")} type="password" value={conf} onChange={event=>setConf(event.target.value)} placeholder={window.kvT("Repeat new password")} autoComplete="new-password"/>
        </div>
      </div>
    </Card>
    {isAdministrator && <Card>
      <CardHead><i className="ti ti-cash-banknote" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Fee Structure")}</CardHead>
      <div className="kv-form-card-body">
        <div className="kv-settings-section-label">{window.kvT("Annual Fees")}</div>
        <div className="kv-form-grid-3">
          <div>{moneyInput("Registration",["annual","registration"])}{moneyInput(window.kvT("Books / Materials - {age} years", {age:4}),["annual","books","4"])}{moneyInput(window.kvT("Books / Materials - {age} years", {age:5}),["annual","books","5"])}{moneyInput(window.kvT("Books / Materials - {age} years", {age:6}),["annual","books","6"])}</div>
          <div>{moneyInput("Uniform",["annual","uniform"])}{moneyInput("Sports Uniform",["annual","sports_uniform"])}{moneyInput("Tudung",["annual","tudung"])}{moneyInput("Lawatan",["annual","lawatan"])}</div>
          <div>{moneyInput("Sukan",["annual","sukan"])}{moneyInput("Penyampaian Hadiah",["annual","hadiah"])}{moneyInput("Pakej Gambar",["annual","gambar"])}</div>
        </div>
        <div className="kv-settings-section-label" style={{marginTop:8}}>{window.kvT("Monthly Fees")}</div>
        <div className="kv-form-grid-3">
          <div>{moneyInput(localFeeConfig?.monthly_packages?.A?.label || "Package A",["monthly_packages","A","amount"])}{moneyInput("IQRA Class",["monthly_iqra"])}</div>
          {["B","C"].map(code => <div key={code}>{moneyInput(localFeeConfig?.monthly_packages?.[code]?.label || `Package ${code}`,["monthly_packages",code,"amount"])}</div>)}
        </div>
      </div>
    </Card>}
    {isAdministrator && <Card>
      <CardHead><i className="ti ti-chalkboard" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Class Names")}</CardHead>
      <div className="kv-form-card-body">
        <div className="kv-settings-help" style={{marginBottom:16}}>{window.kvT("Rename the existing age-group classes. Students assigned to a renamed class are updated automatically; the age grouping remains unchanged.")}</div>
        <div className="kv-form-grid-3">
          {classNames.map(item => <div className="kv-field" key={item.id}>
            <div className="kv-field-label">{window.kvT(`${item.age_group || "-"} years old`)}</div>
            <input className="kv-form-control" maxLength="80" value={item.name || ""} onChange={event=>setClassNames(previous=>previous.map(current=>current.id === item.id ? {...current,name:event.target.value} : current))}/>
          </div>)}
        </div>
        <div style={{marginTop:16}}><Btn onClick={saveClassNames} disabled={classSaving || !classNames.length}>{classSaving?<><i className="ti ti-loader" aria-hidden="true"/> {window.kvT("Saving...")}</>:<><i className="ti ti-device-floppy" aria-hidden="true"/> {window.kvT("Save Class Names")}</>}</Btn></div>
      </div>
    </Card>}
    <div><Btn onClick={saveGeneral} disabled={generalSaving}>{generalSaving?<><i className="ti ti-loader" aria-hidden="true"/> {window.kvT("Saving...")}</>:<><i className="ti ti-device-floppy" aria-hidden="true"/> {window.kvT("Save Settings")}</>}</Btn></div>
  </div>;

  const renderUsers = () => <div className="kv-settings-stack">
    <div className="kv-settings-page-head">
      <div><h3>{window.kvT("User Management")}</h3><p>{window.kvT("Create and manage access for KinderVault accounts.")}</p></div>
      <Btn onClick={openCreateUser}><i className="ti ti-user-plus" aria-hidden="true"/> {window.kvT("Create User")}</Btn>
    </div>
    <Card className="kv-table-card">
      <CardHead><i className="ti ti-users" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("User Accounts")} <span className="kv-settings-count">{users.length}</span></CardHead>
      {adminLoading ? <Spinner/> : users.length ? <div className="kv-table-scroll"><table className="kv-data-table kv-settings-table"><thead><tr>{["User","Role","Status","MFA","Last Login","Actions"].map(header=><th key={header}>{window.kvT(header)}</th>)}</tr></thead><tbody>
        {users.map(user=><tr key={user.id}>
          <td><div className="kv-settings-user-name">{user.full_name}</div><code>{user.username}</code></td>
          <td><span className="kv-badge kv-badge--blue">{window.kvT(user.role)}</span></td>
          <td>{statusBadge(user.status)}</td>
          <td><span className={`kv-badge kv-badge--${user.mfa_enabled ? "green" : "amber"}`}>{window.kvT(user.mfa_enabled ? "Enabled" : "Not set")}</span></td>
          <td>{formatDateTime(user.last_login_at)}</td>
          <td><div className="kv-settings-row-actions">
            <Btn small variant="outline" title={window.kvT("View or edit user")} aria-label={window.kvT("View or edit {user}", {user:user.full_name})} onClick={()=>openEditUser(user)}><i className="ti ti-edit" aria-hidden="true"/></Btn>
            <Btn small variant="outline" title={window.kvT("Manage permissions")} aria-label={window.kvT("Manage permissions for {user}", {user:user.full_name})} onClick={()=>openEditUser(user)}><i className="ti ti-shield-lock" aria-hidden="true"/></Btn>
            <Btn small variant="outline" title={window.kvT("Reset password")} aria-label={window.kvT("Reset password for {user}", {user:user.full_name})} onClick={()=>{setPasswordTarget(user);setPasswordForm({password:"",confirm:""});}}><i className="ti ti-key" aria-hidden="true"/></Btn>
            <Btn small variant={user.status === "Active" ? "danger" : "outline"} title={window.kvT(user.status === "Active" ? "Deactivate account" : "Activate account")} aria-label={window.kvT(user.status === "Active" ? "Deactivate {user}" : "Activate {user}", {user:user.full_name})} onClick={()=>changeUserStatus(user)}><i className={`ti ti-${user.status === "Active" ? "user-off" : "user-check"}`} aria-hidden="true"/></Btn>
          </div></td>
        </tr>)}
      </tbody></table></div> : <EmptyState icon="users" text={window.kvT("No user accounts found.")} action={<Btn onClick={openCreateUser} style={{marginTop:12}}>{window.kvT("Create User")}</Btn>}/>} 
    </Card>
  </div>;

  const renderRoles = () => <div className="kv-settings-stack">
    <div className="kv-settings-page-head"><div><h3>{window.kvT("Roles & Permissions")}</h3><p>{window.kvT("Set the default access granted to each role. Individual users can still have overrides.")}</p></div></div>
    <div className="kv-role-grid">
      {roles.map(role => <Card key={role.name} className="kv-role-card"><div className="kv-role-card-body"><div className="kv-role-card-icon"><i className={`ti ti-${role.name === "Administrator" ? "shield-check" : role.name === "Teacher" ? "school" : "user-shield"}`} aria-hidden="true"/></div><div><h4>{window.kvT(role.name)}</h4><p>{window.kvT(role.description)}</p><div className="kv-settings-help">{role.name === "Administrator" ? window.kvT("Full access") : window.kvT("{count} default permissions", {count:(role.permissions || []).length})}</div></div></div><div className="kv-role-card-foot"><Btn small variant="outline" onClick={()=>setRoleEditor({...role,permissions:role.permissions || []})}><i className="ti ti-adjustments" aria-hidden="true"/> {window.kvT(role.name === "Administrator" ? "View Access" : "Edit Defaults")}</Btn></div></Card>)}
    </div>
  </div>;

  const renderSecurity = () => <div className="kv-settings-stack">
    <div className="kv-settings-page-head"><div><h3>{window.kvT("Security Settings")}</h3><p>{window.kvT(isAdministrator ? "Control session duration, password rules, and failed-login protection." : "Manage your authenticator app and account protection.")}</p></div></div>
    {renderMfaAccountCard()}
    {isAdministrator && (!securityConfig ? <Spinner/> : <>
      <Card className="kv-session-security-card"><CardHead><i className="ti ti-shield-lock" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Login & Session Security")}</CardHead><div className="kv-form-card-body">
        <div className="kv-form-grid-2">
          <div className="kv-field"><div className="kv-field-label">{window.kvT("Session timeout")}</div><div className="kv-session-timeout-picker" ref={sessionTimeoutPickerRef}><input id="kv-session-timeout" className="kv-form-control" type="text" inputMode="numeric" autoComplete="off" value={sessionTimeoutCustomMode ? String(securityConfig.session_timeout_minutes ?? "") : window.kvT(SESSION_TIMEOUT_PRESETS.find(preset=>String(preset.value) === String(securityConfig.session_timeout_minutes))?.label || String(securityConfig.session_timeout_minutes ?? ""))} onChange={event=>{ setSessionTimeoutCustomMode(true); setSecurityConfig(previous=>({...previous,session_timeout_minutes:event.target.value})); }} onBlur={()=>window.setTimeout(()=>setSessionTimeoutOpen(false), 140)} placeholder={window.kvT("Choose a preset or enter minutes")}/><button type="button" className={`kv-session-timeout-trigger${sessionTimeoutOpen ? " is-open" : ""}`} onMouseDown={event=>event.preventDefault()} onClick={()=>setSessionTimeoutOpen(previous=>!previous)} aria-label={window.kvT("Session timeout preset")} aria-expanded={sessionTimeoutOpen}><i className="ti ti-chevron-down" aria-hidden="true"/></button>{sessionTimeoutOpen && <div className="kv-session-timeout-menu" role="listbox">{SESSION_TIMEOUT_PRESETS.map(preset=><button type="button" role="option" aria-selected={String(preset.value) === String(securityConfig.session_timeout_minutes) && !sessionTimeoutCustomMode} key={preset.value} onMouseDown={event=>event.preventDefault()} onClick={()=>{ setSessionTimeoutCustomMode(false); setSecurityConfig(previous=>({...previous,session_timeout_minutes:String(preset.value)})); setSessionTimeoutOpen(false); }}><span>{window.kvT(preset.label)}</span><small>{preset.value} {window.kvT("minutes")}</small></button>)}<div className="kv-session-timeout-menu-divider"/><button type="button" role="option" aria-selected={sessionTimeoutCustomMode} className="is-custom" onMouseDown={event=>event.preventDefault()} onClick={()=>{ setSessionTimeoutCustomMode(true); setSecurityConfig(previous=>({...previous,session_timeout_minutes:""})); setSessionTimeoutOpen(false); window.setTimeout(()=>document.getElementById("kv-session-timeout")?.focus(), 0); }}><i className="ti ti-edit" aria-hidden="true"/><span>{window.kvT("Custom duration")}</span></button></div>}</div><small className="kv-settings-help">{window.kvT("Choose a common duration or type any value from 5 to 1,440 minutes.")}</small></div>
          <Input label={window.kvT("Maximum Failed Logins")} type="number" min="3" max="20" value={securityConfig.max_failed_logins} onChange={event=>setSecurityConfig(previous=>({...previous,max_failed_logins:event.target.value}))}/>
          <Input label={window.kvT("Lockout Duration (minutes)")} type="number" min="1" max="1440" value={securityConfig.lockout_minutes} onChange={event=>setSecurityConfig(previous=>({...previous,lockout_minutes:event.target.value}))}/>
        </div>
      </div></Card>
      <Card><CardHead><i className="ti ti-key" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Password Rules")}</CardHead><div className="kv-form-card-body">
        <div className="kv-form-grid-2"><Input label={window.kvT("Minimum Password Length")} type="number" min="8" max="128" value={securityConfig.password_min_length} onChange={event=>setSecurityConfig(previous=>({...previous,password_min_length:event.target.value}))}/><div className="kv-security-toggle-list">
          <label><input type="checkbox" checked={Boolean(securityConfig.require_mixed_case)} onChange={event=>setSecurityConfig(previous=>({...previous,require_mixed_case:event.target.checked}))}/><span><strong>{window.kvT("Require mixed case")}</strong><small>{window.kvT("Passwords must include upper- and lower-case letters.")}</small></span></label>
          <label><input type="checkbox" checked={Boolean(securityConfig.require_number)} onChange={event=>setSecurityConfig(previous=>({...previous,require_number:event.target.checked}))}/><span><strong>{window.kvT("Require a number")}</strong><small>{window.kvT("Passwords must include at least one number.")}</small></span></label>
        </div></div>
      </div></Card>
      <Card><CardHead><i className="ti ti-fingerprint" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Multi-Factor Authentication")}</CardHead><div className="kv-form-card-body">
        <div className={`kv-settings-info${securityInfo?.available === false ? " kv-settings-info--danger" : ""}`}><i className={`ti ti-${securityInfo?.available === false ? "alert-triangle" : "info-circle"}`} aria-hidden="true"/><span>{window.kvT(securityInfo?.status || "Checking MFA readiness...")}</span></div>
        <div className="kv-security-toggle-list kv-mfa-enforcement-toggle">
          <label><input type="checkbox" checked={Boolean(securityConfig.mfa_required_for_administrators)} disabled={!securityInfo?.available || (securityInfo?.unenrolled_administrators || 0) > 0} onChange={event=>setSecurityConfig(previous=>({...previous,mfa_required_for_administrators:event.target.checked}))}/><span><strong>{window.kvT("Require MFA for all Administrators")}</strong><small>{securityInfo ? window.kvT("{active} active Administrator account(s); {unenrolled} still need MFA setup.", {active:securityInfo.active_administrators || 0,unenrolled:securityInfo.unenrolled_administrators || 0}) : window.kvT("Load security details to manage MFA enforcement.")}</small></span></label>
        </div>
      </div></Card>
      <div><Btn onClick={saveSecurity} disabled={securitySaving}>{window.kvT(securitySaving?"Saving...":"Save Security Settings")}</Btn></div>
    </>)}
  </div>;

  const renderAudit = () => <div className="kv-settings-stack">
    <div className="kv-settings-page-head"><div><h3>{window.kvT("Audit Log")}</h3><p>{window.kvT("Read-only activity records created automatically by KinderVault.")}</p></div><Btn variant="outline" onClick={printAuditHistory} disabled={auditPrintLoading}><i className={`ti ti-${auditPrintLoading ? "loader" : "printer"}`} aria-hidden="true"/> {window.kvT(auditPrintLoading ? "Preparing print..." : "Print Audit History")}</Btn></div>
    <div className="kv-audit-summary-grid">
      {[ ["Today",auditSummary?.today_activities || 0,"calendar-event","blue"], ["Failed Logins",auditSummary?.failed_logins || 0,"lock-access","red"], ["Security Events",auditSummary?.security_events || 0,"shield-alert","amber"], ["All Activity",auditSummary?.total_records || 0,"list-check","teal"] ].map(([label,value,icon,color])=><Card key={label} className={`kv-audit-summary-card kv-audit-summary-card--${color}`}><i className={`ti ti-${icon}`} aria-hidden="true"/><div><strong>{value}</strong><span>{window.kvT(label)}</span></div></Card>)}
    </div>
    <Card className="kv-filter-card kv-audit-filter-card"><div className="kv-settings-audit-filters">
      <div className="kv-audit-filter-row kv-audit-filter-row--primary">
        <div className="kv-audit-filter-control kv-audit-filter-control--search">
          <span className="kv-audit-filter-label">{window.kvT("Search activity")}</span>
          <div className="kv-search-field"><i className="ti ti-search" aria-hidden="true"/><input className="kv-form-control" value={auditFilters.q} placeholder={window.kvT("Search activity")} aria-label={window.kvT("Search activity")} onChange={event=>setAuditFilters(previous=>({...previous,q:event.target.value}))}/></div>
        </div>
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("From date")}</span><input className="kv-form-control" type="date" value={auditFilters.from} aria-label={window.kvT("From date")} onChange={event=>setAuditFilters(previous=>({...previous,from:event.target.value}))}/></label>
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("To date")}</span><input className="kv-form-control" type="date" value={auditFilters.to} aria-label={window.kvT("To date")} onChange={event=>setAuditFilters(previous=>({...previous,to:event.target.value}))}/></label>
        <div className="kv-settings-filter-actions"><Btn small onClick={()=>loadAudit(1)}><i className="ti ti-filter" aria-hidden="true"/> {window.kvT("Apply")}</Btn><Btn small variant="outline" onClick={()=>{setAuditFilters({q:"",from:"",to:"",user_id:"",role:"",module:"",action:"",status:""});setTimeout(()=>loadAudit(1),0);}}>{window.kvT("Clear")}</Btn></div>
      </div>
      <div className="kv-audit-filter-row kv-audit-filter-row--secondary">
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("User")}</span><select className="kv-form-control" value={auditFilters.user_id} aria-label={window.kvT("All users")} onChange={event=>setAuditFilters(previous=>({...previous,user_id:event.target.value}))}><option value="">{window.kvT("All users")}</option>{users.map(user=><option value={user.id} key={user.id}>{user.full_name}</option>)}</select></label>
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("Role")}</span><select className="kv-form-control" value={auditFilters.role} aria-label={window.kvT("All roles")} onChange={event=>setAuditFilters(previous=>({...previous,role:event.target.value}))}><option value="">{window.kvT("All roles")}</option>{roles.map(role=><option value={role.name} key={role.name}>{window.kvT(role.name)}</option>)}</select></label>
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("Module")}</span><select className="kv-form-control" value={auditFilters.module} aria-label={window.kvT("All modules")} onChange={event=>setAuditFilters(previous=>({...previous,module:event.target.value}))}><option value="">{window.kvT("All modules")}</option>{["Authentication","Student Management","Payment Management","Receipt Management","Student Development","User Management","Roles & Permissions","Security","Backup & Restore","Settings","Chatbot"].map(value=><option value={value} key={value}>{window.kvT(value)}</option>)}</select></label>
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("Action")}</span><select className="kv-form-control" value={auditFilters.action} aria-label={window.kvT("All actions")} onChange={event=>setAuditFilters(previous=>({...previous,action:event.target.value}))}><option value="">{window.kvT("All actions")}</option>{["CREATE","UPDATE","DELETE","LOGIN","LOGIN_FAILED","MFA_CHALLENGE_STARTED","MFA_CHALLENGE_FAILED","MFA_ENABLED","MFA_DISABLED","MFA_RECOVERY_CODES_REGENERATED","MFA_ENROLLMENT_REQUIRED","LOGOUT","PASSWORD_RESET","PASSWORD_CHANGED","ROLE_CHANGED","PERMISSIONS_CHANGED","ROLE_PERMISSIONS_CHANGED","ACCOUNT_ACTIVATED","ACCOUNT_DEACTIVATED","ACCESS_DENIED","BACKUP_EXPORTED","BACKUP_CREDENTIALS_VIEWED","CHATBOT_QUERY","CHATBOT_ACCESS_DENIED","CHATBOT_SECURITY_BLOCKED"].map(value=><option value={value} key={value}>{window.kvT(value)}</option>)}</select></label>
        <label className="kv-audit-filter-control"><span className="kv-audit-filter-label">{window.kvT("Status")}</span><select className="kv-form-control" value={auditFilters.status} aria-label={window.kvT("All statuses")} onChange={event=>setAuditFilters(previous=>({...previous,status:event.target.value}))}><option value="">{window.kvT("All statuses")}</option>{["Success","Failed"].map(value=><option value={value} key={value}>{window.kvT(value)}</option>)}</select></label>
      </div>
    </div></Card>
    <Card className="kv-table-card"><CardHead><i className="ti ti-history" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Activity Log")} <span className="kv-settings-count">{auditPagination.total || 0}</span></CardHead>
      {auditLoading ? <Spinner/> : auditRecords.length ? <div className="kv-table-scroll"><table className="kv-data-table kv-audit-table"><thead><tr>{["Date & Time","User","Role","Module","Action","Record","Status","Details"].map(header=><th scope="col" key={header}>{window.kvT(header)}</th>)}</tr></thead><tbody>{auditRecords.map(record=><tr key={record.id}><td data-label={window.kvT("Date & Time")}>{formatDateTime(record.created_at)}</td><td data-label={window.kvT("User")}><div className="kv-audit-user"><div className="kv-settings-user-name">{record.user_name_snapshot || record.username_snapshot || window.kvT("System")}</div><code>{record.username_snapshot || "system"}</code></div></td><td data-label={window.kvT("Role")}>{record.user_role_snapshot ? window.kvT(record.user_role_snapshot) : "-"}</td><td data-label={window.kvT("Module")}>{record.module ? window.kvT(record.module) : "-"}</td><td data-label={window.kvT("Action")}>{auditActionBadge(record.action)}</td><td data-label={window.kvT("Record")}><code>{record.record_id || "-"}</code></td><td data-label={window.kvT("Status")}><span className={`kv-badge kv-badge--${record.status === "Success" ? "green" : "red"}`}>{window.kvT(record.status)}</span></td><td data-label={window.kvT("Details")}><Btn small variant="outline" onClick={()=>openAuditDetail(record.id)} title={window.kvT("View activity details")} aria-label={window.kvT("View activity details")}><i className="ti ti-eye" aria-hidden="true"/></Btn></td></tr>)}</tbody></table></div> : <EmptyState icon="history" text={window.kvT("No activity matches the selected filters.")}/>} 
      <div className="kv-audit-pagination"><span>{window.kvT("Page {page} of {total}", {page:auditPagination.page,total:auditPagination.total_pages})}</span><div><Btn small variant="outline" disabled={auditPagination.page <= 1} onClick={()=>loadAudit(auditPagination.page - 1)} title={window.kvT("Previous page")} aria-label={window.kvT("Previous page")}><i className="ti ti-chevron-left" aria-hidden="true"/></Btn><Btn small variant="outline" disabled={auditPagination.page >= auditPagination.total_pages} onClick={()=>loadAudit(auditPagination.page + 1)} title={window.kvT("Next page")} aria-label={window.kvT("Next page")}><i className="ti ti-chevron-right" aria-hidden="true"/></Btn></div></div>
    </Card>
  </div>;

  const renderBackup = () => <BackupPage embedded students={students} payments={payments} devRecords={devRecords} isAdministrator={isAdministrator}/>;

  const renderedTab = activeTab === "general" ? renderGeneral() : activeTab === "users" ? renderUsers() : activeTab === "roles" ? renderRoles() : activeTab === "security" ? renderSecurity() : activeTab === "audit" ? renderAudit() : renderBackup();

  return <div className="kv-page kv-page--settings kv-settings-workspace">
    <div className="kv-settings-heading"><div><h2 className="kv-page-title"><i className="ti ti-settings" aria-hidden="true"/> {window.kvT("Settings")}</h2><p>{window.kvT("Manage your account and KinderVault administration.")}</p></div></div>
    <div className="kv-settings-layout">
      <nav className="kv-settings-nav" aria-label={window.kvT("Settings sections")}>{tabs.map(tab=><button type="button" key={tab.id} className={activeTab===tab.id?"is-active":""} onClick={()=>setActiveTab(tab.id)}><i className={`ti ti-${tab.icon}`} aria-hidden="true"/><span>{window.kvT(tab.label)}</span></button>)}</nav>
      <div className="kv-settings-content">{renderedTab}</div>
    </div>
    {userModal && userForm && <SettingsUserModal mode={userModal} form={userForm} setForm={setUserForm} roles={roles} catalog={catalog} saving={userSaving} onSave={saveUser} onClose={()=>{setUserModal(null);setUserForm(null);}}/>}
    {passwordTarget && <SettingsPasswordModal user={passwordTarget} password={passwordForm} setPassword={setPasswordForm} saving={userSaving} onSave={resetPassword} onClose={()=>setPasswordTarget(null)}/>} 
    {mfaSetup && <SettingsMfaEnrollmentModal setup={mfaSetup} setSetup={setMfaSetup} saving={mfaSaving} onConfirm={confirmMfaEnrollment} onCancel={cancelMfaEnrollment}/>} 
    {mfaRecoveryCodes && <SettingsMfaRecoveryCodesModal codes={mfaRecoveryCodes} onClose={()=>{setMfaRecoveryCodes(null);setFlash({msg:window.kvT("MFA recovery codes are ready for secure storage."),type:"success"});}}/>}
    {mfaSensitiveAction && <SettingsMfaReauthModal action={mfaSensitiveAction} form={mfaSensitiveForm} setForm={setMfaSensitiveForm} saving={mfaSaving} onSave={saveMfaSensitiveAction} onClose={()=>setMfaSensitiveAction(null)}/>} 
    {roleEditor && <SettingsModal title={window.kvT("{role} Default Permissions", {role:window.kvT(roleEditor.name)})} onClose={()=>setRoleEditor(null)} wide><div className="kv-settings-modal-body"><div className="kv-settings-help" style={{marginBottom:16}}>{window.kvT(roleEditor.description)}</div><SettingsPermissionEditor catalog={catalog} value={roleEditor.permissions} onChange={permissions=>setRoleEditor(previous=>({...previous,permissions}))} fullAccess={roleEditor.name === "Administrator"}/></div><div className="kv-settings-modal-footer"><Btn variant="outline" onClick={()=>setRoleEditor(null)}>{window.kvT("Close")}</Btn>{roleEditor.name !== "Administrator" && <Btn onClick={saveRole} disabled={roleSaving}>{window.kvT(roleSaving?"Saving...":"Save Changes")}</Btn>}</div></SettingsModal>}
    {auditDetail && <SettingsAuditDetailModal record={auditDetail} onClose={()=>setAuditDetail(null)}/>} 
    {auditPrintData && <SettingsAuditPrintReport data={auditPrintData} formatDateTime={formatDateTime}/>} 
  </div>;
};
