const BackupPage = ({
  students,
  payments,
  devRecords,
  isAdministrator,
  embedded = false
}) => {
  const isProduction = window.KV_APP_ENV === "production";
  const databaseLabel = isProduction ? "TiDB Cloud Starter" : "kindervault (MySQL)";
  const [status, setStatus] = React.useState("idle");
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
        alert(window.kvT('Backup failed: server returned {status}', {
          status: res.status
        }));
        setStatus('idle');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
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
      setTimeout(() => setStatus('idle'), 3000);
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
  return React.createElement("div", {
    className: embedded ? "kv-settings-stack kv-backup-settings" : "kv-page kv-page--backup"
  }, embedded ? React.createElement("div", {
    className: "kv-settings-page-head"
  }, React.createElement("div", null, React.createElement("h3", null, window.kvT("Backup & Restore")), React.createElement("p", null, window.kvT(isProduction ? "Create downloadable SQL backups of current database records." : "Create database backups and use the local recovery guidance to restore a saved .sql file.")))) : React.createElement("h2", {
    className: "kv-page-title",
    style: {
      margin: "0 0 20px"
    }
  }, React.createElement("i", {
    className: "ti ti-database-export",
    style: {
      marginRight: 8
    },
    "aria-hidden": "true"
  }), window.kvT("Backup & Restore")), React.createElement("div", {
    className: "kv-page-grid kv-backup-grid",
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, React.createElement(Card, {
    className: "kv-backup-primary-card"
  }, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-database",
    style: {
      marginRight: 6,
      color: C.green
    },
    "aria-hidden": "true"
  }), window.kvT("Database Status")), React.createElement("div", {
    style: {
      padding: 16
    }
  }, status === "done" && React.createElement("div", {
    style: {
      background: C.greenBg,
      color: C.greenTx,
      borderRadius: 7,
      padding: "8px 12px",
      fontSize: 12,
      marginBottom: 12
    }
  }, React.createElement("i", {
    className: "ti ti-check",
    "aria-hidden": "true"
  }), " ", window.kvT("Backup generated successfully.")), React.createElement("table", {
    className: "kv-data-table",
    style: {
      width: "100%",
      fontSize: 13
    }
  }, React.createElement("tbody", null, [["Database", databaseLabel], ["Total Students", students.length], ["Total Payments", payments.length], ["Dev Records", devRecords.length], ["Status", "Running"]].map(([l, v]) => React.createElement("tr", {
    key: l,
    style: {
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, React.createElement("td", {
    style: {
      padding: "6px 0",
      color: "var(--color-text-tertiary)"
    }
  }, window.kvT(l)), React.createElement("td", {
    style: {
      padding: "6px 0",
      textAlign: "right",
      color: "var(--color-text-primary)"
    }
  }, typeof v === "number" ? React.createElement("span", {
    style: {
      background: C.blueBg,
      color: C.blueTx,
      fontSize: 11,
      padding: "2px 7px",
      borderRadius: 10
    }
  }, v) : v === "Running" ? React.createElement("span", {
    style: {
      background: C.greenBg,
      color: C.greenTx,
      fontSize: 11,
      padding: "2px 7px",
      borderRadius: 10
    }
  }, window.kvT(v)) : v))))), React.createElement("button", {
    onClick: doBackup,
    disabled: status === "downloading",
    className: "kv-backup-download",
    style: {
      width: "100%",
      marginTop: 16,
      padding: "10px",
      background: C.blue,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 500,
      cursor: status === "downloading" ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      opacity: status === "downloading" ? 0.7 : 1,
      fontFamily: "inherit"
    }
  }, status === "downloading" ? React.createElement(React.Fragment, null, React.createElement("i", {
    className: "ti ti-loader",
    "aria-hidden": "true"
  }), " ", window.kvT("Preparing download...")) : React.createElement(React.Fragment, null, React.createElement("i", {
    className: "ti ti-cloud-download",
    "aria-hidden": "true"
  }), " ", window.kvT("Download Backup Now (.sql)"))), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)",
      marginTop: 8,
      lineHeight: 1.5
    }
  }, React.createElement("i", {
    className: "ti ti-info-circle",
    style: {
      marginRight: 4
    },
    "aria-hidden": "true"
  }), window.kvT("Exports current database records as a downloadable SQL backup file.")))), React.createElement("div", {
    className: "kv-backup-stack",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-refresh",
    style: {
      marginRight: 6,
      color: C.amber
    },
    "aria-hidden": "true"
  }), window.kvT(isProduction ? "Restore Guidance" : "Restore from Backup")), React.createElement("div", {
    style: {
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      background: C.amberBg,
      color: C.amberTx,
      borderRadius: 7,
      padding: "8px 12px",
      fontSize: 12,
      marginBottom: 12
    }
  }, React.createElement("i", {
    className: "ti ti-alert-triangle",
    "aria-hidden": "true"
  }), " ", React.createElement("strong", null, window.kvT("Warning:")), " ", window.kvT("Restoring will overwrite all current data.")), isProduction ? React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-secondary)",
      lineHeight: 1.65
    }
  }, React.createElement("p", {
    style: {
      margin: "0 0 12px"
    }
  }, window.kvT("A saved SQL backup can be restored by an authorised administrator or developer using approved database administration tools.")), React.createElement("div", {
    style: {
      background: "var(--color-background-secondary)",
      border: "1px solid var(--color-border-secondary)",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 11.5
    }
  }, React.createElement("i", {
    className: "ti ti-shield-lock",
    style: {
      marginRight: 5,
      color: C.blue
    },
    "aria-hidden": "true"
  }), window.kvT("Direct SQL file upload and execution are not provided through the web interface to reduce the risk of malicious SQL execution, accidental database overwrite, and incorrect restoration.")), React.createElement("p", {
    style: {
      margin: "12px 0 0"
    }
  }, window.kvT("Restore is a controlled administrative recovery process rather than an automatic browser-based restore feature."))) : React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-secondary)",
      lineHeight: 1.6
    }
  }, window.kvT("To restore, import a .sql backup using local Adminer.")), isAdministrator ? React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 12,
      border: "1px solid var(--color-border-secondary)",
      borderRadius: 8,
      background: "var(--color-background-secondary)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: adminerCredentials ? 10 : 0
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--color-text-primary)"
    }
  }, React.createElement("i", {
    className: "ti ti-shield-lock",
    style: {
      marginRight: 5,
      color: C.blue
    },
    "aria-hidden": "true"
  }), window.kvT("Local Adminer access")), !adminerCredentials && React.createElement(Btn, {
    small: true,
    variant: "outline",
    onClick: revealAdminerCredentials,
    disabled: credentialsLoading
  }, React.createElement("i", {
    className: "ti ti-eye",
    "aria-hidden": "true"
  }), credentialsLoading ? window.kvT("Loading...") : window.kvT("Reveal details"))), adminerCredentials && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "5px 10px",
      fontSize: 12,
      lineHeight: 1.5
    }
  }, React.createElement("span", {
    style: {
      color: "var(--color-text-tertiary)"
    }
  }, window.kvT("URL")), React.createElement("a", {
    href: adminerCredentials.url,
    target: "_blank",
    rel: "noreferrer"
  }, adminerCredentials.url), React.createElement("span", {
    style: {
      color: "var(--color-text-tertiary)"
    }
  }, window.kvT("Server")), React.createElement("code", null, adminerCredentials.server), React.createElement("span", {
    style: {
      color: "var(--color-text-tertiary)"
    }
  }, window.kvT("Username")), React.createElement("code", null, adminerCredentials.username), React.createElement("span", {
    style: {
      color: "var(--color-text-tertiary)"
    }
  }, window.kvT("Password")), React.createElement("code", null, adminerCredentials.password), React.createElement("span", {
    style: {
      color: "var(--color-text-tertiary)"
    }
  }, window.kvT("Database")), React.createElement("code", null, adminerCredentials.database)), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)",
      lineHeight: 1.5,
      marginTop: 10
    }
  }, React.createElement("i", {
    className: "ti ti-info-circle",
    style: {
      marginRight: 4
    },
    "aria-hidden": "true"
  }), window.kvT("This is a local database-maintenance login, not a KinderVault user account.")))) : React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-tertiary)",
      marginTop: 12
    }
  }, React.createElement("i", {
    className: "ti ti-lock",
    style: {
      marginRight: 4
    },
    "aria-hidden": "true"
  }), window.kvT("Local database access details are visible to Administrators only.")), React.createElement("ol", {
    style: {
      fontSize: 12,
      color: "var(--color-text-tertiary)",
      marginTop: 10,
      paddingLeft: 16,
      lineHeight: 1.8
    }
  }, React.createElement("li", null, window.kvT("Open"), " ", React.createElement("a", {
    href: "http://localhost/adminer/",
    target: "_blank",
    rel: "noreferrer"
  }, "Adminer"), "."), React.createElement("li", null, window.kvT("Choose MySQL, enter the local access details above, then sign in.")), React.createElement("li", null, window.kvT("Select the kindervault database.")), React.createElement("li", null, window.kvT("Choose Import, upload your .sql file, then run the import.")))))), !isProduction && React.createElement(Card, null, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-calendar",
    style: {
      marginRight: 6,
      color: C.blue
    },
    "aria-hidden": "true"
  }), window.kvT("Auto-Backup Setup")), React.createElement("div", {
    style: {
      padding: 16,
      fontSize: 12,
      color: "var(--color-text-secondary)",
      lineHeight: 1.7
    }
  }, window.kvT("Use Windows Task Scheduler to auto-backup daily. Create a backup.bat file with:"), React.createElement("div", {
    style: {
      marginTop: 10,
      background: "var(--color-background-secondary)",
      borderRadius: 6,
      padding: "8px 10px",
      fontFamily: "monospace",
      fontSize: 11,
      color: "var(--color-text-primary)"
    }
  }, "curl \"http://localhost/kindervault/api/backup.php\""), React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, window.kvT("Schedule it in Task Scheduler to run nightly at 2:00 AM.")))))));
};
