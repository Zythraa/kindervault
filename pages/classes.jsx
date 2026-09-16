// ============================================================
// pages/classes.jsx - ClassesPage component
// ============================================================

const ClassRosterModal = ({classInfo, students, onClose}) => {
  React.useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="kv-modal-backdrop" onClick={event=>event.target===event.currentTarget&&onClose()}>
    <div className="kv-modal kv-class-roster-modal" role="dialog" aria-modal="true" aria-labelledby="class-roster-title">
      <div className="kv-class-roster-head">
        <div>
          <div className="kv-class-roster-eyebrow"><i className="ti ti-users" aria-hidden="true"/>{window.kvT("Students in this class")}</div>
          <h3 id="class-roster-title">{classInfo.name}</h3>
          <p>{window.kvT(classInfo.age)} <span>{window.kvT("{count} student(s) enrolled", {count: students.length})}</span></p>
        </div>
        <button type="button" className="kv-icon-btn" onClick={onClose} aria-label={window.kvT("Close student list")} title={window.kvT("Close")}><i className="ti ti-x" aria-hidden="true"/></button>
      </div>
      <div className="kv-class-roster-body">
        {students.length ? <div className="kv-table-scroll"><table className="kv-data-table kv-class-roster-table"><thead><tr><th>{window.kvT("Student")}</th><th>{window.kvT("Gender")}</th><th>{window.kvT("Status")}</th></tr></thead><tbody>{students.map(student => <tr key={student.id}><td><div className="kv-class-roster-student-name">{student.name}</div><code>{student.code || "-"}</code></td><td>{student.gender === "M" ? window.kvT("Male") : student.gender === "F" ? window.kvT("Female") : "-"}</td><td><span className={`kv-badge kv-badge--${student.status === "Active" ? "green" : "gray"}`}>{window.kvT(student.status || "Active")}</span></td></tr>)}</tbody></table></div> : <EmptyState icon="users" text={window.kvT("No students are enrolled in this class yet.")}/>} 
      </div>
      <div className="kv-class-roster-footer"><Btn variant="outline" onClick={onClose}>{window.kvT("Close")}</Btn></div>
    </div>
  </div>;
};

const ClassesPage = ({classesList, students = []}) => {
  const fixedClasses = [
    {name:"Permata", age:"4 years old"},
    {name:"Intelek", age:"5 years old"},
    {name:"Ceria", age:"6 years old"},
  ];
  const [rosterClass, setRosterClass] = React.useState(null);
  const studentsInClass = className => students.filter(student=>student.class===className).slice().sort((left,right)=>String(left.name || "").localeCompare(String(right.name || "")));
  const rosterStudents = rosterClass ? studentsInClass(rosterClass.name) : [];

  return (
    <div className="kv-page kv-page--classes">
      <div className="kv-page-header">
        <h2 className="kv-page-title"><i className="ti ti-chalkboard" style={{marginRight:8}} aria-hidden="true"/>{window.kvT('Manage Classes')}</h2>
      </div>

      <Card className="kv-info-card" style={{maxWidth:760,marginBottom:16}}>
        <div style={{padding:16}}>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>
            {window.kvT("The class structure is fixed based on the owner's decision. Only one class is used for each age year.")}
          </div>
        </div>
      </Card>

      <Card className="kv-table-card" style={{maxWidth:760}}>
        <CardHead><i className="ti ti-list" style={{marginRight:6}} aria-hidden="true"/>{window.kvT('Class List')} <span style={{background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:11,padding:"1px 7px",borderRadius:10,marginLeft:4}}>{fixedClasses.length}</span></CardHead>
        <div className="kv-table-scroll" style={{overflowX:"auto"}}>
          <table className="kv-data-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"var(--color-background-secondary)"}}>
                <th style={{padding:"8px 16px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>#</th>
                <th style={{padding:"8px 16px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{window.kvT('Class Name')}</th>
                <th style={{padding:"8px 16px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{window.kvT("Age Group")}</th>
                <th style={{padding:"8px 16px",textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{window.kvT('Students Enrolled')}</th>
                <th style={{padding:"8px 16px",textAlign:"right",fontSize:11,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{window.kvT("Roster")}</th>
              </tr>
            </thead>
            <tbody>
              {fixedClasses.map((c,i)=>{
                const enrolledStudents = studentsInClass(c.name);
                const count = enrolledStudents.length;
                return (
                  <tr key={c.name} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    <td style={{padding:"12px 16px",color:"var(--color-text-tertiary)",fontSize:11}}>{i+1}</td>
                    <td style={{padding:"12px 16px",fontWeight:600,color:"var(--color-text-primary)"}}>{c.name}</td>
                    <td style={{padding:"12px 16px",color:"var(--color-text-secondary)"}}>{window.kvT(c.age)}</td>
                    <td style={{padding:"12px 16px",color:"var(--color-text-secondary)"}}>
                      {count > 0 ? <span style={{background:C.blueBg,color:C.blueTx,fontSize:11,padding:"2px 8px",borderRadius:10}}>{window.kvT("{count} student(s)", {count})}</span> : <span style={{color:"var(--color-text-tertiary)",fontSize:11}}>{window.kvT('None')}</span>}
                    </td>
                    <td style={{padding:"10px 16px",textAlign:"right"}}><Btn small variant="outline" onClick={()=>setRosterClass(c)} title={window.kvT("View students enrolled in {className}", {className: c.name})}><i className="ti ti-users" aria-hidden="true"/> {window.kvT("View students")}</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {rosterClass && <ClassRosterModal classInfo={rosterClass} students={rosterStudents} onClose={()=>setRosterClass(null)}/>} 
    </div>
  );
};
