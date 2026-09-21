// ============================================================
// pages/backup.jsx  –  BackupPage component
// ============================================================

const BackupPage = ({students, payments, devRecords, isAdministrator, embedded = false}) => {
  const isProduction = window.KV_APP_ENV === "production";
  const databaseLabel = isProduction ? "TiDB Cloud Starter" : "kindervault (MySQL)";
  const [status, setStatus] = React.useState("idle"); // idle | downloading | done
  const [adminerCredentials, setAdminerCredentials] = React.useState(null);
  const [credentialsLoading, setCredentialsLoading] = React.useState(false);

  const doBackup = async () => {
    setStatus("downloading");
    try {
      const res = await fetch('api/backup.php');
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('kv:session-unauthorized'));
        return;
      }
      if (!res.ok) {
        alert(window.kvT('Backup failed: server returned {status}', {status: res.status}));
        setStatus('idle');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // try to derive a filename from headers, fallback
      const disp = res.headers.get('Content-Disposition') || '';
      const m = /filename="?([^\";]+)"?/.exec(disp);
      a.download = m ? m[1] : `kindervault_backup.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      localStorage.setItem("kv_last_backup_meta", JSON.stringify({
        at: new Date().toISOString(),
        status: "Successful",
        file: a.download || ""
      }));
      setStatus('done');
      setTimeout(()=>setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      alert(window.kvT('Network error while downloading backup.'));
      setStatus('idle');
    }
  };

  const revealAdminerCredentials = async () => {
    if (!isAdministrator) return;
    setCredentialsLoading(true);
    try {
      const res = await api.get("api/backup_credentials.php");
      if (res.error) {
        alert(res.error);
        return;
      }
      setAdminerCredentials(res.credentials || null);
    } catch (err) {
      console.error(err);
      alert(window.kvT("Unable to load local database credentials."));
    } finally {
      setCredentialsLoading(false);
    }
  };

  return (
    <div className={embedded ? "kv-settings-stack kv-backup-settings" : "kv-page kv-page--backup"}>
      {embedded
        ? <div className="kv-settings-page-head"><div><h3>{window.kvT("Backup & Restore")}</h3><p>{window.kvT(isProduction ? "Create downloadable SQL backups of current database records." : "Create database backups and use the local recovery guidance to restore a saved .sql file.")}</p></div></div>
        : <h2 className="kv-page-title" style={{margin:"0 0 20px"}}><i className="ti ti-database-export" style={{marginRight:8}} aria-hidden="true"/>{window.kvT("Backup & Restore")}</h2>}
      <div className="kv-page-grid kv-backup-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card className="kv-backup-primary-card">
          <CardHead><i className="ti ti-database" style={{marginRight:6,color:C.green}} aria-hidden="true"/>{window.kvT("Database Status")}</CardHead>
          <div style={{padding:16}}>
            {status==="done"&&<div style={{background:C.greenBg,color:C.greenTx,borderRadius:7,padding:"8px 12px",fontSize:12,marginBottom:12}}><i className="ti ti-check" aria-hidden="true"/> {window.kvT("Backup generated successfully.")}</div>}
            <table className="kv-data-table" style={{width:"100%",fontSize:13}}>
              <tbody>
              {[
                ["Database",databaseLabel],
                ["Total Students",students.length],
                ["Total Payments",payments.length],
                ["Dev Records",devRecords.length],
                ["Status","Running"],
              ].map(([l,v])=>(
                <tr key={l} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                  <td style={{padding:"6px 0",color:"var(--color-text-tertiary)"}}>{window.kvT(l)}</td>
                  <td style={{padding:"6px 0",textAlign:"right",color:"var(--color-text-primary)"}}>
                    {typeof v==="number"
                      ? <span style={{background:C.blueBg,color:C.blueTx,fontSize:11,padding:"2px 7px",borderRadius:10}}>{v}</span>
                      : v==="Running"
                        ? <span style={{background:C.greenBg,color:C.greenTx,fontSize:11,padding:"2px 7px",borderRadius:10}}>{window.kvT(v)}</span>
                        : v}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
            <button onClick={doBackup} disabled={status==="downloading"} className="kv-backup-download"
              style={{width:"100%",marginTop:16,padding:"10px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:status==="downloading"?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:status==="downloading"?0.7:1,fontFamily:"inherit"}}>
              {status==="downloading"
                ? <><i className="ti ti-loader" aria-hidden="true"/> {window.kvT("Preparing download...")}</>
                : <><i className="ti ti-cloud-download" aria-hidden="true"/> {window.kvT("Download Backup Now (.sql)")}</>}
            </button>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:8,lineHeight:1.5}}>
              <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden="true"/>
              {window.kvT("Exports current database records as a downloadable SQL backup file.")}
            </div>
          </div>
        </Card>

        <div className="kv-backup-stack" style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card>
            <CardHead><i className="ti ti-refresh" style={{marginRight:6,color:C.amber}} aria-hidden="true"/>{window.kvT(isProduction ? "Restore Guidance" : "Restore from Backup")}</CardHead>
            <div style={{padding:16}}>
              <div style={{background:C.amberBg,color:C.amberTx,borderRadius:7,padding:"8px 12px",fontSize:12,marginBottom:12}}>
                <i className="ti ti-alert-triangle" aria-hidden="true"/> <strong>{window.kvT("Warning:")}</strong> {window.kvT("Restoring will overwrite all current data.")}
              </div>
              {isProduction ? <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>
                <p style={{margin:"0 0 12px"}}>{window.kvT("A saved SQL backup can be restored by an authorised administrator or developer using approved database administration tools.")}</p>
                <div style={{background:"var(--color-background-secondary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"10px 12px",fontSize:11.5}}>
                  <i className="ti ti-shield-lock" style={{marginRight:5,color:C.blue}} aria-hidden="true"/>{window.kvT("Direct SQL file upload and execution are not provided through the web interface to reduce the risk of malicious SQL execution, accidental database overwrite, and incorrect restoration.")}
                </div>
                <p style={{margin:"12px 0 0"}}>{window.kvT("Restore is a controlled administrative recovery process rather than an automatic browser-based restore feature.")}</p>
              </div> : <>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.6}}>
                  {window.kvT("To restore, import a .sql backup using local Adminer.")}
                </div>
                {isAdministrator ? <div style={{marginTop:12,padding:12,border:"1px solid var(--color-border-secondary)",borderRadius:8,background:"var(--color-background-secondary)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:adminerCredentials?10:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}><i className="ti ti-shield-lock" style={{marginRight:5,color:C.blue}} aria-hidden="true"/>{window.kvT("Local Adminer access")}</div>
                    {!adminerCredentials && <Btn small variant="outline" onClick={revealAdminerCredentials} disabled={credentialsLoading}><i className="ti ti-eye" aria-hidden="true"/>{credentialsLoading ? window.kvT("Loading...") : window.kvT("Reveal details")}</Btn>}
                  </div>
                  {adminerCredentials && <>
                    <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"5px 10px",fontSize:12,lineHeight:1.5}}>
                      <span style={{color:"var(--color-text-tertiary)"}}>{window.kvT("URL")}</span><a href={adminerCredentials.url} target="_blank" rel="noreferrer">{adminerCredentials.url}</a>
                      <span style={{color:"var(--color-text-tertiary)"}}>{window.kvT("Server")}</span><code>{adminerCredentials.server}</code>
                      <span style={{color:"var(--color-text-tertiary)"}}>{window.kvT("Username")}</span><code>{adminerCredentials.username}</code>
                      <span style={{color:"var(--color-text-tertiary)"}}>{window.kvT("Password")}</span><code>{adminerCredentials.password}</code>
                      <span style={{color:"var(--color-text-tertiary)"}}>{window.kvT("Database")}</span><code>{adminerCredentials.database}</code>
                    </div>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",lineHeight:1.5,marginTop:10}}><i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden="true"/>{window.kvT("This is a local database-maintenance login, not a KinderVault user account.")}</div>
                  </>}
                </div> : <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:12}}><i className="ti ti-lock" style={{marginRight:4}} aria-hidden="true"/>{window.kvT("Local database access details are visible to Administrators only.")}</div>}
                <ol style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:10,paddingLeft:16,lineHeight:1.8}}>
                  <li>{window.kvT("Open")} <a href="http://localhost/adminer/" target="_blank" rel="noreferrer">Adminer</a>.</li>
                  <li>{window.kvT("Choose MySQL, enter the local access details above, then sign in.")}</li>
                  <li>{window.kvT("Select the kindervault database.")}</li>
                  <li>{window.kvT("Choose Import, upload your .sql file, then run the import.")}</li>
                </ol>
              </>}
            </div>
          </Card>

          {!isProduction && (
          <Card>
            <CardHead><i className="ti ti-calendar" style={{marginRight:6,color:C.blue}} aria-hidden="true"/>{window.kvT("Auto-Backup Setup")}</CardHead>
            <div style={{padding:16,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}>
              {window.kvT("Use Windows Task Scheduler to auto-backup daily. Create a backup.bat file with:")}
              <div style={{marginTop:10,background:"var(--color-background-secondary)",borderRadius:6,padding:"8px 10px",fontFamily:"monospace",fontSize:11,color:"var(--color-text-primary)"}}>
                curl "http://localhost/kindervault/api/backup.php"
              </div>
              <div style={{marginTop:8}}>{window.kvT("Schedule it in Task Scheduler to run nightly at 2:00 AM.")}</div>
            </div>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
};
