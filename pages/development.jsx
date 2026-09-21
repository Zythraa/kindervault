// ============================================================
// pages/development.jsx  -  KPM SSP fill page + print page
// ============================================================

const DEVELOPMENT_FORMS = {
  4: {
    title: "PERKEMBANGAN KANAK-KANAK 4 TAHUN",
    subtitle: "(Untuk kegunaan kanak-kanak berumur 48 bulan hingga 59 bulan bagi tujuan pendidikan)",
    printedPage: 17,
    items: [
      {no:1, domain:"Motor Kasar", text:"Lompat ke hadapan dengan sebelah kaki."},
      {no:2, domain:"Motor Kasar", text:"Berlari laju dan berhenti tanpa jatuh."},
      {no:3, domain:"Motor Kasar", text:"Turun tangga berselang kaki tanpa bantuan."},
      {no:4, domain:"Motor Halus", text:"Meniru tanda palang (+)."},
      {no:5, domain:"Motor Halus", text:"Boleh melukis gambar orang yang mempunyai sekurang-kurangnya tiga daripada anggota badan seperti kepala, mata, hidung, mulut, leher, badan, rambut, atau tangan."},
      {no:6, domain:"Motor Halus", text:"Boleh menggunting kertas menjadi separuh dalam satu garisan lurus."},
      {no:7, domain:"Pertuturan dan Bahasa", text:"Menjawab soalan berkaitan aktiviti harian (contoh: Apa awak buat bila lapar?)."},
      {no:8, domain:"Pertuturan dan Bahasa", text:"Boleh menerangkan dua perkara tentang sesuatu objek dengan jelas (contoh: kereta ada empat tayar, kereta laju, kertas warna merah)."},
      {no:9, domain:"Pertuturan dan Bahasa", text:"Boleh bertanya soalan menggunakan 'Apa?', 'Kenapa?' atau 'Bagaimana?'."},
      {no:10, domain:"Kelakuan (Personal Sosial)", text:"Bermain dengan melakonkan semula sesuatu watak (contoh: berlakon watak cikgu, doktor atau polis)."},
      {no:11, domain:"Kelakuan (Personal Sosial)", text:"Membasuh atau mengeringkan tangan menggunakan kain atau tisu tanpa bantuan."},
      {no:12, domain:"Kelakuan (Personal Sosial)", text:"Boleh memberitahu nama sekurang-kurangnya dua orang kawan tidak termasuk adik-beradik."},
      {no:13, domain:"Kognitif", text:"Boleh menggunakan blok atau kiub untuk membina menara atau beberapa jambatan daripada 10 atau lebih blok atau kiub."},
      {no:14, domain:"Kognitif", text:"Boleh mengira lima objek yang dilihat satu persatu mengikut urutan."},
      {no:15, domain:"Kognitif", text:"Memahami konsep 'sama' dan 'berbeza'."},
    ],
  },
  5: {
    title: "PERKEMBANGAN KANAK-KANAK 5 TAHUN",
    subtitle: "(Untuk kegunaan kanak-kanak berumur 60 bulan hingga 71 bulan bagi tujuan pendidikan)",
    printedPage: 18,
    items: [
      {no:1, domain:"Motor Kasar", text:"Boleh berdiri dengan satu kaki selama 8-10 saat."},
      {no:2, domain:"Motor Kasar", text:"* Berskip (skipping) menggunakan dua kaki atau secara berselang seli."},
      {no:3, domain:"Motor Kasar", text:"Membaling dan menangkap bola menggunakan kedua-dua tangan."},
      {no:4, domain:"Motor Halus", text:"Boleh menggunting bentuk bulat atau segi empat tepat (petak)."},
      {no:5, domain:"Motor Halus", text:"Boleh membutang baju, membuka atau menutup zip pakaian sendiri."},
      {no:6, domain:"Motor Halus", text:"Boleh melukis orang dengan sempurna (contoh: kepala, badan, tangan dan kaki)."},
      {no:7, domain:"Pertuturan dan Bahasa", text:"Boleh memahami dan menggunakan konsep perbandingan."},
      {no:8, domain:"Pertuturan dan Bahasa", text:"Boleh mengulang ayat yang didengari sekurang-kurangnya lima patah perkataan."},
      {no:9, domain:"Pertuturan dan Bahasa", text:"Boleh bertutur menggunakan empat hingga lima perkataan dalam satu ayat dengan tatabahasa dan bunyi sebutan yang betul."},
      {no:10, domain:"Kelakuan (Personal Sosial)", text:"Boleh mengambil giliran dan berkongsi barang dengan kanak-kanak lain."},
      {no:11, domain:"Kelakuan (Personal Sosial)", text:"Mempamerkan sikap mengambil berat terhadap orang lain atau adik beradik yang lebih muda."},
      {no:12, domain:"Kelakuan (Personal Sosial)", text:"Boleh menggunakan tandas tanpa bantuan."},
      {no:13, domain:"Kognitif", text:"Boleh mengira satu hingga 15 mengikut turutan dengan betul."},
      {no:14, domain:"Kognitif", text:"Boleh menyebut sekurang-kurangnya empat huruf pada nama sendiri apabila ditunjuk."},
      {no:15, domain:"Kognitif", text:"Memahami konsep seperti masa (contoh: semalam, esok, sekarang dan lain-lain)."},
    ],
  },
  6: {
    title: "PERKEMBANGAN KANAK-KANAK 6 TAHUN",
    subtitle: "(Untuk kegunaan kanak-kanak berumur 72 bulan hingga 83 bulan bagi tujuan pendidikan)",
    printedPage: 19,
    items: [
      {no:1, domain:"Motor Kasar", text:"Boleh mengayuh dan menaiki basikal (dua roda)."},
      {no:2, domain:"Motor Kasar", text:"Boleh menangkap bola bersaiz lebih kecil (contoh: bola tenis, bola ping pong)."},
      {no:3, domain:"Motor Halus", text:"Boleh mewarna bentuk-bentuk mudah dengan kemas (tidak terkeluar dari garisan)."},
      {no:4, domain:"Motor Halus", text:"Boleh melukis bentuk asas tanpa melihat pada gambar bentuk."},
      {no:5, domain:"Motor Halus", text:"Membuat ikatan menggunakan tali."},
      {no:6, domain:"Pertuturan dan Bahasa", text:"Boleh menceritakan semula cerita yang ditonton, didengari atau dibaca oleh orang lain."},
      {no:7, domain:"Pertuturan dan Bahasa", text:"* Bercakap menggunakan bunyi sebutan yang jelas dan lancar (percakapan difahami oleh orang yang tidak dikenali)."},
      {no:8, domain:"Pertuturan dan Bahasa", text:"Memahami dan suka kepada lawak jenaka dan teka-teki."},
      {no:9, domain:"Kelakuan (Personal Sosial)", text:"* Cuba untuk berkawan dengan kanak-kanak sebaya."},
      {no:10, domain:"Kelakuan (Personal Sosial)", text:"Menggunakan perkataan untuk meluahkan perasaan sendiri."},
      {no:11, domain:"Kelakuan (Personal Sosial)", text:"Memakai kasut pada kaki yang betul."},
      {no:12, domain:"Kognitif", text:"Boleh menulis nombor, huruf besar atau kecil."},
      {no:13, domain:"Kognitif", text:"Membaca beberapa perkataan yang biasa dilihat."},
      {no:14, domain:"Kognitif", text:"Menulis nama sendiri tanpa bantuan."},
    ],
  },
};

const prettyDate = (value) => {
  if (!value) return "-";
  return window.kvDate(value, {}, value);
};

const hasReadingLanguage = (record, language) => {
  const value = record?.[`has_${language}`];
  return value === undefined || value === null ? true : Boolean(Number(value));
};

const wrapText = (text, max = 52) => {
  const words = String(text || "").split(" ");
  const lines = [];
  let current = "";
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
};

const DEV_NOTE_MAX = 60;

const getAgeGroupFromClass = (className) => {
  const normalized = String(className || "").trim().toLowerCase();
  if (normalized === "permata") return 4;
  if (normalized === "intelek") return 5;
  if (normalized === "ceria") return 6;
  const match = String(className || "").match(/\b([456])\b|tadika\s*([456])/i);
  const value = match ? (match[1] || match[2]) : "";
  return value ? parseInt(value, 10) : null;
};

const SegBtn = ({active, children, onClick}) => (
  <button
    type="button"
    onClick={onClick}
    className={`kv-seg-btn${active ? " is-active" : ""}`}
  >
    {children}
  </button>
);

const DevHistoryCard = ({devRecords, loadRecord, editRecord, deleteRecord, canUpdate = false, canDelete = false}) => (
  <Card className="no-print">
    <CardHead>
      <div><i className="ti ti-history" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("KPM Development Checklist History")}</div>
    </CardHead>
    {devRecords.length ? (
      <div className="kv-table-scroll" style={{overflowX:"auto"}}>
        <table className="kv-data-table" style={{width:"100%",minWidth:720,borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"var(--color-background-secondary)"}}>
              {["Student","Age","Assessment Date","Status","Action"].map(h => (
                <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,textTransform:"uppercase",letterSpacing:.5,color:"var(--color-text-tertiary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{window.kvT(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devRecords.map(record => (
              <tr key={record.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{fontWeight:600,color:"var(--color-text-primary)"}}>{record.student_name || "-"}</div>
                  <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{record.student_class || "-"}</div>
                  {record.is_legacy && record.legacy_summary ? <div style={{fontSize:10,color:"var(--color-text-secondary)",marginTop:2}}>{record.legacy_summary}</div> : null}
                </td>
                <td style={{padding:"8px 10px"}}>{record.age_group ? window.kvT("{age} years", {age: record.age_group}) : "-"}</td>
                <td style={{padding:"8px 10px"}}>{prettyDate(record.assessment_date)}</td>
                <td style={{padding:"8px 10px"}}>{statusBadge(record.status || "Saved")}</td>
                <td style={{padding:"8px 10px"}}>
                  {record.is_legacy ? (
                    <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{window.kvT("Legacy record")}</span>
                  ) : (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <Btn small variant="outline" onClick={() => loadRecord(record)}>{window.kvT("Open")}</Btn>
                      {canUpdate && <Btn small variant="outline" onClick={() => editRecord(record)}><i className="ti ti-edit" aria-hidden="true"/> {window.kvT("Edit")}</Btn>}
                      {canDelete && deleteRecord && <Btn small variant="danger" onClick={() => deleteRecord(record)} title={window.kvT("Delete KPM development checklist")}><i className="ti ti-trash" aria-hidden="true"/> {window.kvT("Delete")}</Btn>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <EmptyState icon="chart-line" text={window.kvT("No development records yet.")}/>} 
  </Card>
);

const ReadingHistoryCard = ({
  records,
  students = [],
  onAdd,
  onEdit,
  onDelete,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
}) => {
  const [search, setSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("");
  const [quarterFilter, setQuarterFilter] = React.useState("");
  const [sortBy, setSortBy] = React.useState("date");
  const [detailStudentId, setDetailStudentId] = React.useState("");

  const studentById = React.useMemo(
    () => Object.fromEntries(students.map(student => [String(student.id), student])),
    [students]
  );
  const classes = React.useMemo(
    () => [...new Set(records.map(record => record.student_class).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [records]
  );
  const quarters = React.useMemo(
    () => [...new Set(records.map(record => record.quarter).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [records]
  );
  const visibleRecords = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredRecords = records
      .filter(record => {
        const student = studentById[String(record.student_id)] || {};
        const searchable = [
          record.student_name,
          record.student_class,
          student.code,
          student.ic,
        ].map(value => String(value || "").toLowerCase());
        return (!query || searchable.some(value => value.includes(query)))
          && (!classFilter || record.student_class === classFilter)
          && (!quarterFilter || record.quarter === quarterFilter);
      });
    const latestByStudent = new Map();
    filteredRecords.forEach(record => {
      const studentId = String(record.student_id);
      const current = latestByStudent.get(studentId);
      const isNewer = !current
        || String(record.record_date || "").localeCompare(String(current.record_date || "")) > 0
        || (String(record.record_date || "") === String(current.record_date || "") && Number(record.id || 0) > Number(current.id || 0));
      if (isNewer) latestByStudent.set(studentId, record);
    });
    return [...latestByStudent.values()].sort((a, b) => {
        if (sortBy === "student") return String(a.student_name || "").localeCompare(String(b.student_name || ""), undefined, {sensitivity:"base"});
        if (sortBy === "class") {
          const byClass = String(a.student_class || "").localeCompare(String(b.student_class || ""), undefined, {sensitivity:"base"});
          return byClass || String(a.student_name || "").localeCompare(String(b.student_name || ""), undefined, {sensitivity:"base"});
        }
        return String(b.record_date || "").localeCompare(String(a.record_date || "")) || Number(b.id || 0) - Number(a.id || 0);
      });
  }, [records, studentById, search, classFilter, quarterFilter, sortBy]);
  const detailRecords = React.useMemo(
    () => records
      .filter(record => String(record.student_id) === String(detailStudentId))
      .sort((a, b) => String(b.record_date || "").localeCompare(String(a.record_date || "")) || Number(b.id || 0) - Number(a.id || 0)),
    [records, detailStudentId]
  );
  const detailStudent = detailRecords[0] || null;

  React.useEffect(() => {
    if (!detailStudentId) return undefined;
    const closeOnEscape = event => {
      if (event.key === "Escape") setDetailStudentId("");
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [detailStudentId]);

  const clearFilters = () => {
    setSearch("");
    setClassFilter("");
    setQuarterFilter("");
    setSortBy("date");
  };
  const hasFilters = Boolean(search || classFilter || quarterFilter || sortBy !== "date");
  const progressCell = (record, language) => (
    hasReadingLanguage(record, language) ? (
      <div className="kv-reading-progress-value">
        <strong>{window.kvT("Book {level}", {level: record[language + "_book_level"] || 1})}</strong>
        <span className="kv-reading-page-value">
          <span>{window.kvT("Page")}</span>
          <strong>{record[language + "_page"] || 0}</strong>
        </span>
      </div>
    ) : <span className="kv-reading-not-recorded">{window.kvT("Not recorded")}</span>
  );

  const printReadingRecords = () => {
    const previousTitle = document.title;
    const printedAt = window.kvDate(new Date(), {year:"numeric", month:"2-digit", day:"2-digit"}, "");
    document.title = `${window.kvT("Reading Records")} - ${printedAt}`;
    document.documentElement.classList.add("kv-printing-reading");
    document.body.classList.add("kv-printing-reading");
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        document.documentElement.classList.remove("kv-printing-reading");
        document.body.classList.remove("kv-printing-reading");
        document.title = previousTitle;
      }
    }, 100);
  };

  return (
    <>
    <Card className="kv-reading-history-card no-print">
      <div className="kv-reading-history-head">
        <div>
          <h3><i className="ti ti-books" aria-hidden="true"/> {window.kvT("Reading Records")}</h3>
          <p>{window.kvT("Review each student's latest and historical reading progress.")}</p>
        </div>
        <div className="kv-reading-history-actions">
          <span className="kv-reading-record-count">{window.kvT("{count} student(s)", {count: visibleRecords.length})}</span>
          <Btn small variant="outline" onClick={printReadingRecords}><i className="ti ti-printer" aria-hidden="true"/> {window.kvT("Print")}</Btn>
        </div>
      </div>

      <div className="kv-reading-toolbar">
        <div className="kv-reading-search">
          <i className="ti ti-search" aria-hidden="true"/>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={window.kvT("Search student or student code")}
            aria-label={window.kvT("Search student or student code")}
          />
        </div>
        <select value={classFilter} onChange={event => setClassFilter(event.target.value)} aria-label={window.kvT("All Classes")}>
          <option value="">{window.kvT("All Classes")}</option>
          {classes.map(className => <option key={className} value={className}>{className}</option>)}
        </select>
        <select value={quarterFilter} onChange={event => setQuarterFilter(event.target.value)} aria-label={window.kvT("All Quarters")}>
          <option value="">{window.kvT("All Quarters")}</option>
          {quarters.map(quarter => <option key={quarter} value={quarter}>{quarter}</option>)}
        </select>
        <select value={sortBy} onChange={event => setSortBy(event.target.value)} aria-label={window.kvT("Sort records")}>
          <option value="date">{window.kvT("Newest first")}</option>
          <option value="student">{window.kvT("Student name")}</option>
          <option value="class">{window.kvT("Class name")}</option>
        </select>
        {hasFilters && <button type="button" className="kv-reading-clear-filters" onClick={clearFilters}>{window.kvT("Clear")}</button>}
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon="book-2"
          text={window.kvT("No reading progress records yet.")}
          action={canCreate ? <Btn onClick={onAdd} style={{marginTop:12}}><i className="ti ti-plus" aria-hidden="true"/> {window.kvT("Add Reading Record")}</Btn> : null}
        />
      ) : visibleRecords.length === 0 ? (
        <div className="kv-reading-no-results">
          <i className="ti ti-search-off" aria-hidden="true"/>
          <strong>{window.kvT("No records match your search.")}</strong>
          <button type="button" onClick={clearFilters}>{window.kvT("Clear filters")}</button>
        </div>
      ) : (
        <div className="kv-table-scroll kv-reading-table-wrap">
          <table className="kv-data-table kv-reading-table">
            <thead>
              <tr>
                {["Student","Record Date","Quarter","Bahasa Melayu","English","Notes","Actions"].map(header => (
                  <th key={header}>{window.kvT(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map(record => (
                <tr key={record.id}>
                  <td data-label={window.kvT("Student")}>
                    <button type="button" className="kv-reading-student-link" onClick={() => setDetailStudentId(String(record.student_id))}>
                      {record.student_name || "-"}
                    </button>
                    <span className="kv-reading-student-class">{record.student_class || "-"}</span>
                  </td>
                  <td data-label={window.kvT("Record Date")} className="kv-reading-date">{prettyDate(record.record_date)}</td>
                  <td data-label={window.kvT("Quarter")} className="kv-reading-quarter">{record.quarter || "-"}</td>
                  <td data-label={window.kvT("Bahasa Melayu")}>{progressCell(record, "bm")}</td>
                  <td data-label={window.kvT("English")}>{progressCell(record, "bi")}</td>
                  <td data-label={window.kvT("Notes")} className="kv-reading-notes">
                    <span title={record.notes || ""}>{record.notes || "-"}</span>
                  </td>
                  <td data-label={window.kvT("Actions")}>
                    <div className="kv-reading-row-actions">
                      {canUpdate && <button type="button" onClick={() => onEdit(record)}><i className="ti ti-edit" aria-hidden="true"/> {window.kvT("Edit")}</button>}
                      {canDelete && <button type="button" className="is-delete" onClick={() => onDelete(record)}><i className="ti ti-trash" aria-hidden="true"/> {window.kvT("Delete")}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
    <div className="print-area kv-reading-list-print-area" aria-label={window.kvT("Reading Records")}>
      <div className="kv-reading-list-print-sheet">
        <header className="kv-list-print-header">
          <div>
            <h1>{window.kvT("Reading Records")}</h1>
            <p>{window.kvT("Latest reading progress by student")} · {visibleRecords.length}</p>
          </div>
          <span>{window.kvDate(new Date(), {day:"numeric", month:"short", year:"numeric"})}</span>
        </header>
        {visibleRecords.length ? (
          <table className="kv-list-print-table kv-reading-list-print-table">
            <thead><tr>
              {["Student", "Record Date", "Quarter", "Bahasa Melayu", "English", "Notes"].map(label => <th key={label}>{window.kvT(label)}</th>)}
            </tr></thead>
            <tbody>{visibleRecords.map(record => (
              <tr key={record.id}>
                <td><strong>{record.student_name || "-"}</strong><small>{record.student_class || "-"}</small></td>
                <td>{prettyDate(record.record_date)}</td>
                <td>{record.quarter || "-"}</td>
                <td>{hasReadingLanguage(record, "bm") ? `${window.kvT("Book {level}", {level:record.bm_book_level || 1})} · ${window.kvT("Page")} ${record.bm_page || 0}` : window.kvT("Not recorded")}</td>
                <td>{hasReadingLanguage(record, "bi") ? `${window.kvT("Book {level}", {level:record.bi_book_level || 1})} · ${window.kvT("Page")} ${record.bi_page || 0}` : window.kvT("Not recorded")}</td>
                <td>{record.notes || "-"}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="kv-list-print-empty">{window.kvT("No reading progress records yet.")}</p>}
      </div>
    </div>
    {detailStudent && (
      <div className="kv-reading-detail-backdrop" onMouseDown={event => event.target === event.currentTarget && setDetailStudentId("")}>
        <section className="kv-reading-detail-modal" role="dialog" aria-modal="true" aria-labelledby="reading-detail-title">
          <header className="kv-reading-detail-head">
            <div>
              <span>{window.kvT("Student Reading History")}</span>
              <h3 id="reading-detail-title">{detailStudent.student_name || "-"}</h3>
              <p>{detailStudent.student_class || "-"} · {window.kvT("{count} reading record(s)", {count:detailRecords.length})}</p>
            </div>
            <button type="button" onClick={() => setDetailStudentId("")} aria-label={window.kvT("Close")}><i className="ti ti-x" aria-hidden="true"/></button>
          </header>
          <div className="kv-reading-detail-body">
            <div className="kv-reading-detail-labels" aria-hidden="true">
              <span>{window.kvT("Record Date")}</span>
              <span>{window.kvT("Quarter")}</span>
              <span>{window.kvT("Bahasa Melayu")}</span>
              <span>{window.kvT("English")}</span>
              <span>{window.kvT("Notes")}</span>
            </div>
            {detailRecords.map(record => (
              <article className="kv-reading-detail-row" key={record.id}>
                <div data-label={window.kvT("Record Date")} className="kv-reading-detail-date">
                  <strong>{prettyDate(record.record_date)}</strong>
                </div>
                <div data-label={window.kvT("Quarter")} className="kv-reading-detail-quarter">{record.quarter || "-"}</div>
                <div data-label={window.kvT("Bahasa Melayu")}>{progressCell(record, "bm")}</div>
                <div data-label={window.kvT("English")}>{progressCell(record, "bi")}</div>
                <div data-label={window.kvT("Notes")} className="kv-reading-detail-notes">{record.notes || "-"}</div>
              </article>
            ))}
          </div>
          <footer className="kv-reading-detail-footer">
            <Btn variant="outline" onClick={() => setDetailStudentId("")}>{window.kvT("Close")}</Btn>
          </footer>
        </section>
      </div>
    )}
    </>
  );
};

const readingQuarterFromDate = value => {
  const parts = String(value || "").split("-");
  if (parts.length < 2) return "";
  const month = parseInt(parts[1], 10);
  if (!month || month < 1 || month > 12) return "";
  return parts[0] + "-Q" + Math.ceil(month / 3);
};

const ReadingRecordDrawer = ({
  form,
  students,
  readingRecords = [],
  canEdit,
  loading,
  onUpdate,
  onLanguageChange,
  onCancel,
  onSave,
}) => {
  const editing = Boolean(form.id);
  const quarter = form.quarter || readingQuarterFromDate(form.record_date);
  const carriedStudentRef = React.useRef("");
  const activeStudentOptions = React.useMemo(
    () => students
      .filter(student => student.status === "Active")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {sensitivity:"base"}))
      .map(student => ({value:student.id, label:student.name + " (" + student.class + ")"})),
    [students]
  );
  const latestStudentRecord = React.useMemo(() => {
    if (editing || !form.student_id) return null;
    return readingRecords
      .filter(record => String(record.student_id) === String(form.student_id))
      .sort((a, b) => String(b.record_date || "").localeCompare(String(a.record_date || "")) || Number(b.id || 0) - Number(a.id || 0))[0] || null;
  }, [editing, form.student_id, readingRecords]);

  React.useEffect(() => {
    if (editing || !form.student_id) {
      carriedStudentRef.current = "";
      return;
    }
    const studentId = String(form.student_id);
    if (carriedStudentRef.current === studentId) return;
    carriedStudentRef.current = studentId;
    if (!latestStudentRecord) return;
    onUpdate(previous => ({
      ...previous,
      has_bm: hasReadingLanguage(latestStudentRecord, "bm"),
      has_bi: hasReadingLanguage(latestStudentRecord, "bi"),
      bm_book_level: Number(latestStudentRecord.bm_book_level || 1),
      bm_page: Number(latestStudentRecord.bm_page || 0),
      bi_book_level: Number(latestStudentRecord.bi_book_level || 1),
      bi_page: Number(latestStudentRecord.bi_page || 0),
      notes: "",
    }));
  }, [editing, form.student_id, latestStudentRecord, onUpdate]);

  const changeStudent = studentId => {
    onUpdate(previous => editing ? {...previous, student_id:studentId} : {
      ...previous,
      student_id: studentId,
      has_bm: true,
      has_bi: true,
      bm_book_level: 1,
      bm_page: 0,
      bi_book_level: 1,
      bi_page: 0,
      notes: "",
    });
  };

  return (
    <div className="kv-reading-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <aside className="kv-reading-drawer" role="dialog" aria-modal="true" aria-labelledby="reading-drawer-title">
        <header className="kv-reading-drawer-head">
          <div>
            <span>{editing ? window.kvT("Edit Reading Record") : window.kvT("Add Reading Record")}</span>
            <h3 id="reading-drawer-title">{window.kvT("Reading Record Details")}</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label={window.kvT("Close")}><i className="ti ti-x" aria-hidden="true"/></button>
        </header>

        <div className="kv-reading-drawer-body">
          <section className="kv-reading-form-section">
            <h4>{window.kvT("Student Information")}</h4>
            <Select
              label={window.kvT("Student *")}
              value={form.student_id}
              onChange={event => changeStudent(event.target.value)}
              disabled={!canEdit}
              options={[{value:"", label:window.kvT("-- Select active student --")}, ...activeStudentOptions]}
            />
            {latestStudentRecord && (
              <div className="kv-reading-carry-forward">
                <i className="ti ti-history" aria-hidden="true"/>
                <span>{window.kvT("Previous progress from {date} was filled in automatically. Choose the new record date and update the book or page.", {date:prettyDate(latestStudentRecord.record_date)})}</span>
              </div>
            )}
          </section>

          <section className="kv-reading-form-section">
            <h4>{window.kvT("Record Information")}</h4>
            <div className="kv-reading-form-grid">
              <Input
                label={window.kvT("Record Date *")}
                type="date"
                value={form.record_date}
                disabled={!canEdit}
                onChange={event => {
                  const date = event.target.value;
                  onUpdate(previous => ({...previous, record_date:date, quarter:readingQuarterFromDate(date)}));
                }}
              />
              <Input label={window.kvT("Quarter")} value={quarter} readOnly disabled={!canEdit}/>
            </div>
            <div className="kv-reading-language-field">
              <div className="kv-field-label">{window.kvT("Languages to record")} <span>*</span></div>
              <div>
                <label>
                  <input type="checkbox" checked={Boolean(form.has_bm)} disabled={!canEdit} onChange={event => onLanguageChange("bm", event.target.checked)}/>
                  {window.kvT("Bahasa Melayu")}
                </label>
                <label>
                  <input type="checkbox" checked={Boolean(form.has_bi)} disabled={!canEdit} onChange={event => onLanguageChange("bi", event.target.checked)}/>
                  {window.kvT("English")}
                </label>
              </div>
            </div>
          </section>

          {form.has_bm && (
            <section className="kv-reading-form-section">
              <h4>{window.kvT("Bahasa Melayu")}</h4>
              <div className="kv-reading-form-grid">
                <Select label={window.kvT("Book Level")} value={String(form.bm_book_level || 1)} disabled={!canEdit} onChange={event => onUpdate(previous => ({...previous, bm_book_level:parseInt(event.target.value, 10)}))} options={[1,2,3,4,5,6,7,8].map(level => ({value:String(level), label:window.kvT("Book {level}", {level})}))}/>
                <Input label={window.kvT("Last Page")} type="number" min="0" step="1" value={form.bm_page ?? ""} disabled={!canEdit} onChange={event => onUpdate(previous => ({...previous, bm_page:event.target.value}))}/>
              </div>
            </section>
          )}

          {form.has_bi && (
            <section className="kv-reading-form-section">
              <h4>{window.kvT("English")}</h4>
              <div className="kv-reading-form-grid">
                <Select label={window.kvT("Book Level")} value={String(form.bi_book_level || 1)} disabled={!canEdit} onChange={event => onUpdate(previous => ({...previous, bi_book_level:parseInt(event.target.value, 10)}))} options={[1,2,3,4,5,6,7,8].map(level => ({value:String(level), label:window.kvT("Book {level}", {level})}))}/>
                <Input label={window.kvT("Last Page")} type="number" min="0" step="1" value={form.bi_page ?? ""} disabled={!canEdit} onChange={event => onUpdate(previous => ({...previous, bi_page:event.target.value}))}/>
              </div>
            </section>
          )}

          <section className="kv-reading-form-section">
            <h4>{window.kvT("Notes")}</h4>
            <textarea rows={5} value={form.notes || ""} disabled={!canEdit} onChange={event => onUpdate(previous => ({...previous, notes:event.target.value}))} placeholder={window.kvT("Add observations about the student's reading progress.")}/>
          </section>
        </div>

        <footer className="kv-reading-drawer-footer">
          <Btn variant="outline" onClick={onCancel}>{canEdit ? window.kvT("Cancel") : window.kvT("Close")}</Btn>
          {canEdit && (
            <Btn onClick={onSave} disabled={loading} style={{opacity:loading ? .7 : 1}}>
              {loading ? <><i className="ti ti-loader" aria-hidden="true"/> {window.kvT("Saving...")}</> : <><i className="ti ti-device-floppy" aria-hidden="true"/> {window.kvT("Save Record")}</>}
            </Btn>
          )}
        </footer>
      </aside>
    </div>
  );
};

const DevPage = ({students, devRecords, setDevRecords, readingRecords = [], setReadingRecords = () => {}, currentUser = {}, setFlash, navigationState = {}, navigationKey, navigate, replaceRouteState, permissions = [], isAdministrator = false}) => {
  const today = new Date().toISOString().split("T")[0];
  const canCreateDevelopment = canUsePermission(permissions, "development.create", isAdministrator);
  const canUpdateDevelopment = canUsePermission(permissions, "development.update", isAdministrator);
  const canDeleteDevelopment = canUsePermission(permissions, "development.delete", isAdministrator);
  const defaultAssessorName = currentUser?.full_name || "";
  const routeStudentId = navigationState?.studentId ? String(navigationState.studentId) : "";
  const historyStudent = routeStudentId
    ? students.find(student => String(student.id) === routeStudentId) || null
    : null;
  const blankForm = {
    id: null,
    student_id: "",
    assessment_date: today,
    assessment_place: SCHOOL,
    assessor_name: defaultAssessorName,
    checklist: {},
  };
  const blankReadingForm = {
    id: null,
    student_id: "",
    record_date: today,
    quarter: "",
    has_bm: true,
    has_bi: true,
    bm_book_level: 1,
    bm_page: 0,
    bi_book_level: 1,
    bi_page: 0,
    notes: "",
  };

  const [form, setForm] = React.useState(navigationState.form || blankForm);
  const [readingForm, setReadingForm] = React.useState(navigationState.readingForm || blankReadingForm);
  const [loading, setLoading] = React.useState(false);
  const [readingLoading, setReadingLoading] = React.useState(false);
  const [developmentDirty, setDevelopmentDirty] = React.useState(false);
  const [readingDirty, setReadingDirty] = React.useState(false);
  const [screen, setScreen] = React.useState(navigationState.screen || "history");
  const [viewMode, setViewMode] = React.useState(navigationState.viewMode || "fill");
  const [module, setModule] = React.useState(navigationState.module || "reading");
  const canEditCurrentBorang = form.id ? canUpdateDevelopment : canCreateDevelopment;
  const canEditCurrentReading = readingForm.id ? canUpdateDevelopment : canCreateDevelopment;
  const hasUnsavedChanges = screen === "workspace" && (
    module === "borang" ? (viewMode === "fill" && developmentDirty) : readingDirty
  );

  const developmentFormFromRecord = (record) => ({
    id: record.id,
    student_id: String(record.student_id),
    assessment_date: record.assessment_date || today,
    assessment_place: record.assessment_place || SCHOOL,
    assessor_name: record.assessor_name || "",
    checklist: record.checklist || {},
  });

  const readingFormFromRecord = (record) => ({
    id: record.id,
    student_id: String(record.student_id),
    record_date: record.record_date || today,
    quarter: record.quarter || "",
    has_bm: record.has_bm === undefined || record.has_bm === null ? true : Boolean(Number(record.has_bm)),
    has_bi: record.has_bi === undefined || record.has_bi === null ? true : Boolean(Number(record.has_bi)),
    bm_book_level: record.bm_book_level || 1,
    bm_page: record.bm_page || 0,
    bi_book_level: record.bi_book_level || 1,
    bi_page: record.bi_page || 0,
    notes: record.notes || "",
  });

  React.useEffect(() => {
    const state = navigationState || {};
    const nextModule = state.module || "reading";
    const nextScreen = state.screen || "history";
    const nextViewMode = state.viewMode || "fill";
    const developmentRecord = state.recordId
      ? devRecords.find(record => String(record.id) === String(state.recordId))
      : null;
    const readingRecord = state.readingRecordId
      ? readingRecords.find(record => String(record.id) === String(state.readingRecordId))
      : null;

    setModule(nextModule);
    setScreen(nextScreen);
    setViewMode(nextViewMode);
    if (nextModule === "borang" && developmentRecord) setForm(developmentFormFromRecord(developmentRecord));
    if (nextModule === "borang" && nextScreen === "workspace" && !developmentRecord) {
      setForm(state.form || {...blankForm, student_id:state.studentId ? String(state.studentId) : "", assessment_place:SCHOOL});
    }
    if (nextModule === "reading" && readingRecord) setReadingForm(readingFormFromRecord(readingRecord));
    if (nextModule === "reading" && nextScreen === "workspace" && !readingRecord) {
      setReadingForm(state.readingForm || {...blankReadingForm, student_id:state.studentId ? String(state.studentId) : ""});
    }
    setDevelopmentDirty(false);
    setReadingDirty(false);
  }, [navigationKey]);

  const eligibleStudents = React.useMemo(() => (
    students
      .filter(s => s.status === "Active")
      .map(s => ({...s, ageGroup: getAgeGroupFromClass(s.class)}))
      .filter(s => s.ageGroup)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {sensitivity:"base"}))
  ), [students]);

  const selectedStudent = students.find(student => String(student.id) === String(form.student_id));
  const ageGroup = selectedStudent ? getAgeGroupFromClass(selectedStudent.class) : null;
  const formConfig = ageGroup ? DEVELOPMENT_FORMS[ageGroup] : null;
  const scopedDevRecords = routeStudentId
    ? devRecords.filter(record => String(record.student_id) === routeStudentId)
    : devRecords;
  const scopedReadingRecords = routeStudentId
    ? readingRecords.filter(record => String(record.student_id) === routeStudentId)
    : readingRecords;

  const groupedItems = React.useMemo(() => {
    if (!formConfig) return [];
    const groups = [];
    formConfig.items.forEach(item => {
      const last = groups[groups.length - 1];
      if (!last || last.domain !== item.domain) groups.push({domain:item.domain, items:[item]});
      else last.items.push(item);
    });
    return groups;
  }, [formConfig]);

  const printGroups = React.useMemo(() => (
    groupedItems.map(group => ({
      ...group,
      items: group.items.map(item => ({...item, lines: wrapText(item.text, ageGroup === 6 ? 50 : 54)})),
    }))
  ), [groupedItems, ageGroup]);

  React.useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const confirmDiscardChanges = () => (
    !hasUnsavedChanges || window.confirm(window.kvT("You have unsaved changes. Discard them?"))
  );

  const updateDevelopmentForm = (updater) => {
    setDevelopmentDirty(true);
    setForm(updater);
  };

  const updateReadingForm = (updater) => {
    setReadingDirty(true);
    setReadingForm(updater);
  };

  const setReadingLanguage = (language, checked) => {
    const key = language === "bm" ? "has_bm" : "has_bi";
    const otherKey = language === "bm" ? "has_bi" : "has_bm";
    if (!checked && !readingForm[otherKey]) {
      setFlash({msg:window.kvT("Select at least one language to record reading progress."), type:"danger"});
      return;
    }
    updateReadingForm(prev => ({...prev, [key]:checked}));
  };

  const fillFromStudent = (studentId, assessmentDate = form.assessment_date) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) {
      updateDevelopmentForm(prev => ({
        ...blankForm,
        student_id: "",
        assessment_date: assessmentDate || today,
        assessment_place: prev.assessment_place || SCHOOL,
      }));
      return;
    }
    updateDevelopmentForm(prev => ({
      ...blankForm,
      student_id: String(student.id),
      assessment_date: assessmentDate,
      assessment_place: prev.assessment_place || SCHOOL,
      assessor_name: prev.assessor_name || defaultAssessorName,
    }));
  };

  const loadRecord = (record) => {
    if (record.is_legacy) return;
    if (!confirmDiscardChanges()) return;
    navigate({page:"development", state:{module:"borang", screen:"workspace", viewMode:"print", recordId:record.id, studentId:routeStudentId || null}});
  };

  const editRecord = (record) => {
    if (!canUpdateDevelopment) { setFlash({msg:window.kvT("Access Denied. You do not have permission to edit development records."),type:"danger"}); return; }
    if (!confirmDiscardChanges()) return;
    navigate({page:"development", state:{module:"borang", screen:"workspace", viewMode:"fill", recordId:record.id, studentId:routeStudentId || null}});
  };

  const editReadingRecord = (record) => {
    if (!canUpdateDevelopment) { setFlash({msg:window.kvT("Access Denied. You do not have permission to edit development records."),type:"danger"}); return; }
    if (!confirmDiscardChanges()) return;
    navigate({page:"development", state:{module:"reading", screen:"workspace", viewMode:"fill", readingRecordId:record.id, studentId:routeStudentId || null}});
  };

  const startNewKpmBorang = () => {
    if (!canCreateDevelopment) { setFlash({msg:window.kvT("Access Denied. You do not have permission to add development records."),type:"danger"}); return; }
    if (!confirmDiscardChanges()) return;
    navigate({page:"development", state:{module:"borang", screen:"workspace", viewMode:"fill", studentId:routeStudentId || null}});
  };

  const startNewReadingProgress = () => {
    if (!canCreateDevelopment) { setFlash({msg:window.kvT("Access Denied. You do not have permission to add development records."),type:"danger"}); return; }
    if (!confirmDiscardChanges()) return;
    navigate({page:"development", state:{module:"reading", screen:"workspace", viewMode:"fill", studentId:routeStudentId || null}});
  };

  const save = async () => {
    if ((form.id && !canUpdateDevelopment) || (!form.id && !canCreateDevelopment)) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to save this development record."),type:"danger"});
      return;
    }
    if (!selectedStudent || !ageGroup || !formConfig) {
      setFlash({msg:window.kvT("Please select a student aged 4 to 6 years old."), type:"danger"});
      return;
    }
    const payload = {
      id: form.id,
      student_id: Number(form.student_id),
      month: (form.assessment_date || today).slice(0, 7),
      assessment_date: form.assessment_date,
      assessment_place: form.assessment_place,
      assessor_name: form.assessor_name,
      age_group: ageGroup,
      checklist: form.checklist,
    };
    setLoading(true);
    try {
      const res = await api.post("api/development.php", payload);
      if (res.error) {
        setFlash({msg:res.error, type:"danger"});
        return;
      }
      const saved = res.record || {...payload, id:res.id};
      if (form.id) setDevRecords(prev => prev.map(r => String(r.id) === String(saved.id) ? saved : r));
      else setDevRecords(prev => [saved, ...prev]);
      setDevelopmentDirty(false);
      setFlash({msg:window.kvT(form.id ? "Development record updated." : "Development record saved."), type:"success"});
      navigate({page:"development", state:{module:"borang", screen:"workspace", viewMode:"print", recordId:saved.id, studentId:routeStudentId || null}}, {replace:true});
    } catch (e) {
      setFlash({msg:window.kvT("Network error. Please try again."), type:"danger"});
    } finally {
      setLoading(false);
    }
  };

  const saveReading = async () => {
    if ((readingForm.id && !canUpdateDevelopment) || (!readingForm.id && !canCreateDevelopment)) {
      setFlash({msg:window.kvT("Access Denied. You do not have permission to save this reading progress record."),type:"danger"});
      return;
    }
    if (!readingForm.student_id || !readingForm.record_date) {
      setFlash({msg:window.kvT("Please select a student and record date."), type:"danger"});
      return;
    }
    if (!readingForm.has_bm && !readingForm.has_bi) {
      setFlash({msg:window.kvT("Select at least one language to record reading progress."), type:"danger"});
      return;
    }
    const payload = {
      id: readingForm.id,
      student_id: Number(readingForm.student_id),
      record_date: readingForm.record_date,
      quarter: readingForm.quarter || "",
      has_bm: Boolean(readingForm.has_bm),
      has_bi: Boolean(readingForm.has_bi),
      bm_book_level: Number(readingForm.bm_book_level || 1),
      bm_page: Number(readingForm.bm_page || 0),
      bi_book_level: Number(readingForm.bi_book_level || 1),
      bi_page: Number(readingForm.bi_page || 0),
      notes: readingForm.notes || "",
    };
    setReadingLoading(true);
    try {
      const res = await api.post("api/reading_progress.php", payload);
      if (res.error) {
        setFlash({msg:res.error, type:"danger"});
        return;
      }
      const saved = res.record || {...payload, id:res.id};
      setReadingRecords(prev => readingForm.id ? prev.map(r => String(r.id) === String(saved.id) ? saved : r) : [saved, ...prev]);
      setReadingDirty(false);
      setFlash({msg:window.kvT(readingForm.id ? "Reading progress updated." : "Reading progress saved."), type:"success"});
      navigate({page:"development", state:{module:"reading", screen:"history", viewMode:"fill", studentId:routeStudentId || null}}, {replace:true});
    } catch (e) {
      setFlash({msg:window.kvT("Network error. Please try again."), type:"danger"});
    } finally {
      setReadingLoading(false);
    }
  };

  const deleteReadingRecord = async (record) => {
    if (!canDeleteDevelopment) { setFlash({msg:window.kvT("Access Denied. You do not have permission to delete development records."),type:"danger"}); return; }
    if (!window.confirm(window.kvT("Delete reading progress record for {student}?", {student: record.student_name || window.kvT("this student")}))) return;
    try {
      const res = await api.delete(`api/reading_progress.php?id=${record.id}`);
      if (res.error) {
        setFlash({msg:res.error, type:"danger"});
        return;
      }
      setReadingRecords(prev => prev.filter(r => String(r.id) !== String(record.id)));
      if (String(readingForm.id) === String(record.id)) {
        setReadingDirty(false);
        navigate({page:"development", state:{module:"reading", screen:"history", viewMode:"fill", studentId:routeStudentId || null}}, {replace:true});
      }
      setFlash({msg:window.kvT("Reading progress deleted."), type:"success"});
    } catch (e) {
      setFlash({msg:window.kvT("Failed to delete reading progress."), type:"danger"});
    }
  };

  const deleteDevelopmentRecord = async (record) => {
    if (record.is_legacy) return;
    if (!canDeleteDevelopment) { setFlash({msg:window.kvT("Access Denied. You do not have permission to delete development records."),type:"danger"}); return; }
    if (!window.confirm(window.kvT("Delete KPM development checklist for {student}?", {student: record.student_name || window.kvT("this student")}))) return;
    try {
      const res = await api.delete(`api/development.php?id=${record.id}`);
      if (res.error) {
        setFlash({msg:res.error, type:"danger"});
        return;
      }
      setDevRecords(prev => prev.filter(item => String(item.id) !== String(record.id)));
      if (String(form.id) === String(record.id)) {
        setDevelopmentDirty(false);
        navigate({page:"development", state:{module:"borang", screen:"history", viewMode:"fill", studentId:routeStudentId || null}}, {replace:true});
      }
      setFlash({msg:window.kvT("KPM development checklist deleted."), type:"success"});
    } catch (e) {
      setFlash({msg:window.kvT("Failed to delete KPM development checklist."), type:"danger"});
    }
  };

  const handlePrint = () => {
    const studentName = (selectedStudent?.name || "development_form").replace(/[^\w\s-]/gi, "").trim().replace(/\s+/g, "_");
    const assessmentDate = (form.assessment_date || today).replace(/[^\d-]/g, "");
    const originalTitle = document.title;
    document.title = `${assessmentDate}_${studentName}_development_borang`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  const setItemMark = (itemNo, mark) => updateDevelopmentForm(prev => ({...prev, checklist:{...prev.checklist, [itemNo]:mark}}));
  const setItemNote = (itemNo, note) => updateDevelopmentForm(prev => ({...prev, checklist:{...prev.checklist, [`note_${itemNo}`]:note}}));
  const clearItem = (itemNo) => updateDevelopmentForm(prev => {
    const next = {...(prev.checklist || {})};
    delete next[itemNo];
    return {...prev, checklist:next};
  });
  const historyState = (nextModule = module) => ({module:nextModule, screen:"history", viewMode:"fill", studentId:routeStudentId || null});
  const backToHistory = () => {
    if (!confirmDiscardChanges()) return;
    navigate({page:"development", state:historyState()}, {replace:true});
  };
  React.useEffect(() => {
    if (module !== "reading" || screen !== "workspace") return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === "Escape") backToHistory();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [module, screen, readingDirty]);
  const switchModule = (nextModule) => {
    if (nextModule === module) return;
    if (!confirmDiscardChanges()) return;
    setModule(nextModule);
    setScreen("history");
    setViewMode("fill");
    setDevelopmentDirty(false);
    setReadingDirty(false);
    replaceRouteState && replaceRouteState({...historyState(nextModule), recordId:null, readingRecordId:null});
  };
  const switchViewMode = (nextViewMode) => {
    setViewMode(nextViewMode);
    replaceRouteState && replaceRouteState({viewMode:nextViewMode});
  };
  const pageTitle = module === "reading"
    ? "Reading Progress"
    : (screen === "workspace" ? (form.id ? "KPM Development Checklist" : "New KPM Development Checklist") : "Student Development");
  const pageDescription = module === "reading"
    ? "View and manage student reading progress records."
    : (screen === "workspace" ? "Complete this record, then return to its history." : "Select a record type to view its history.");

  return (
    <div className="kv-page kv-page--development">
      <div className="kv-page-header no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:14,flexWrap:"wrap",marginBottom:16}}>
        <div>
          <h2 className="kv-page-title" style={{margin:"0 0 6px"}}>
            <i className={`ti ti-${module === "reading" ? "book-2" : "chart-line"}`} style={{marginRight:8}} aria-hidden="true"/>{window.kvT(pageTitle)}
          </h2>
          <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
            {window.kvT(pageDescription)}
          </div>
          {(screen === "history" || module === "reading") && (
            <div className="kv-development-module-switcher" style={{display:"flex",gap:6,marginTop:12}}>
              <SegBtn active={module==="reading"} onClick={()=>switchModule("reading")}>{window.kvT("Reading Progress")}</SegBtn>
              <SegBtn active={module==="borang"} onClick={()=>switchModule("borang")}>{window.kvT("KPM Development Checklist")}</SegBtn>
            </div>
          )}
        </div>
        <div className="kv-development-actions" style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {module === "borang" && screen === "workspace" && (
            <div style={{display:"flex",gap:6}}>
              {canEditCurrentBorang && <SegBtn active={viewMode==="fill"} onClick={()=>switchViewMode("fill")}>{window.kvT("Complete Checklist")}</SegBtn>}
              <SegBtn active={viewMode==="print"} onClick={()=>switchViewMode("print")}>{window.kvT("Print Output")}</SegBtn>
            </div>
          )}
          {module === "borang" && screen === "workspace" && viewMode==="print" && (
            <Btn variant="outline" onClick={handlePrint}><i className="ti ti-printer" aria-hidden="true"/>{window.kvT("Print / PDF")}</Btn>
          )}
          {module === "borang" && screen === "workspace" && <Btn variant="outline" onClick={backToHistory}><i className="ti ti-arrow-left" aria-hidden="true"/>{window.kvT("Back to History")}</Btn>}
          {screen === "history" && module === "borang" && canCreateDevelopment && <Btn onClick={startNewKpmBorang}><i className="ti ti-plus" aria-hidden="true"/>{window.kvT("New KPM Development Checklist")}</Btn>}
          {screen === "history" && module === "reading" && canCreateDevelopment && <Btn onClick={startNewReadingProgress}><i className="ti ti-plus" aria-hidden="true"/>{window.kvT("Add Reading Record")}</Btn>}
          {module === "borang" && screen === "workspace" && viewMode==="fill" && canEditCurrentBorang && (
            <Btn onClick={save} disabled={loading} style={{opacity:loading ? 0.7 : 1}}>
              {loading?<><i className="ti ti-loader" aria-hidden="true"/>{window.kvT("Saving...")}</>:<><i className="ti ti-device-floppy" aria-hidden="true"/>{window.kvT("Save Checklist")}</>}
            </Btn>
          )}
        </div>
      </div>

      {module === "reading" ? (
          <div className="kv-reading-page-content">
            {historyStudent && <div className="kv-reading-student-scope">{window.kvT("Showing reading records for {student}.", {student:historyStudent.name})}</div>}
            <ReadingHistoryCard
              records={scopedReadingRecords}
              students={students}
              onAdd={startNewReadingProgress}
              onEdit={editReadingRecord}
              onDelete={deleteReadingRecord}
              canCreate={canCreateDevelopment}
              canUpdate={canUpdateDevelopment}
              canDelete={canDeleteDevelopment}
            />
            {screen === "workspace" && (
              <ReadingRecordDrawer
                form={readingForm}
                students={students}
                readingRecords={readingRecords}
                canEdit={canEditCurrentReading}
                loading={readingLoading}
                onUpdate={updateReadingForm}
                onLanguageChange={setReadingLanguage}
                onCancel={backToHistory}
                onSave={saveReading}
              />
            )}
          </div>
      ) : screen === "history" ? (
        <div style={{display:"grid",gap:16}}>
          <Card className="no-print">
            <div style={{padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)",marginBottom:4}}>{historyStudent ? window.kvT("{student}'s KPM Development Checklist History", {student: historyStudent.name}) : window.kvT("Student Development History")}</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                  {window.kvT("One KPM development checklist is kept for each student and assessment month. Legacy score records remain read-only history.")}
                </div>
              </div>
            </div>
          </Card>
          <DevHistoryCard devRecords={scopedDevRecords} loadRecord={loadRecord} editRecord={editRecord} deleteRecord={deleteDevelopmentRecord} canUpdate={canUpdateDevelopment} canDelete={canDeleteDevelopment}/>
        </div>
      ) : viewMode === "fill" && canEditCurrentBorang ? (
        <div style={{display:"grid",gap:16}}>
          <div className="kv-dev-workspace" style={{display:"grid",gridTemplateColumns:"340px minmax(0,1fr)",gap:16,alignItems:"start"}}>
          <div style={{display:"grid",gap:16}}>
            <Card>
              <CardHead><i className="ti ti-filter" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Assessment Setup")}</CardHead>
              <div style={{padding:16}}>
                <Select
                  label={window.kvT("Student *")}
                  value={form.student_id}
                  onChange={e => fillFromStudent(e.target.value)}
                  options={[{value:"", label:window.kvT("-- Select student from Permata / Intelek / Ceria --")}, ...eligibleStudents.map(s => ({value:s.id, label:`${s.name} (${s.class}) - ${window.kvT("{age} years", {age:s.ageGroup})}`}))]}
                />
                <Input label={window.kvT("Assessment date *")} type="date" value={form.assessment_date} onChange={e=>updateDevelopmentForm(prev=>({...prev, assessment_date:e.target.value}))}/>
                <Input label={window.kvT("Assessment place")} value={form.assessment_place} onChange={e=>updateDevelopmentForm(prev=>({...prev, assessment_place:e.target.value}))}/>
                <Input label={window.kvT("Assessor name")} value={form.assessor_name} onChange={e=>updateDevelopmentForm(prev=>({...prev, assessor_name:e.target.value}))}/>
                {selectedStudent ? (
                  <div style={{fontSize:12,lineHeight:1.65,color:"var(--color-text-secondary)",padding:12,border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)"}}>
                    <div><strong style={{color:"var(--color-text-primary)"}}>{window.kvT("Form age:")}</strong> {window.kvT("{age} years", {age: ageGroup})}</div>
                    <div><strong style={{color:"var(--color-text-primary)"}}>{window.kvT("Date of birth:")}</strong> {selectedStudent.dob || "-"}</div>
                    <div><strong style={{color:"var(--color-text-primary)"}}>{window.kvT("Parent / guardian:")}</strong> {selectedStudent.parent || "-"}</div>
                    <div><strong style={{color:"var(--color-text-primary)"}}>{window.kvT("Phone:")}</strong> {selectedStudent.phone || "-"}</div>
                  </div>
                ) : (
                  <div style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{window.kvT("Select a student from Permata, Intelek or Ceria. The borang age now follows the class name.")}</div>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHead><i className="ti ti-list-check" style={{marginRight:6}} aria-hidden="true"/>{window.kvT("Complete KPM Development Checklist")}</CardHead>
            <div style={{padding:16}}>
              {groupedItems.length ? groupedItems.map(group => (
                <div key={group.domain} style={{marginBottom:18}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)",marginBottom:8,paddingBottom:6,borderBottom:"1px solid var(--color-border-tertiary)"}}>
                    {group.domain}
                  </div>
                  <div style={{display:"grid",gap:10}}>
                    {group.items.map(item => {
                      const value = form.checklist?.[item.no] || "";
                      const note = form.checklist?.[`note_${item.no}`] || "";
                      const remaining = DEV_NOTE_MAX - note.length;
                      return (
                        <div key={item.no} style={{border:"1px solid var(--color-border-tertiary)",borderRadius:8,padding:12}}>
                          <div style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr)",gap:10,alignItems:"start",marginBottom:10}}>
                            <div style={{width:28,height:28,borderRadius:7,background:C.blueBg,color:C.blueTx,fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.no}</div>
                            <div style={{fontSize:13,color:"var(--color-text-primary)",lineHeight:1.5}}>{item.text}</div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                            <SegBtn active={value==="/"} onClick={()=>setItemMark(item.no, "/")}>{window.kvT("/ Achieved")}</SegBtn>
                            <SegBtn active={value==="X"} onClick={()=>setItemMark(item.no, "X")}>{window.kvT("X Not achieved")}</SegBtn>
                            <Btn small variant="outline" onClick={()=>clearItem(item.no)}>{window.kvT("Clear")}</Btn>
                          </div>
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:4}}>
                              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>{window.kvT("Notes")}</div>
                              <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{remaining}/{DEV_NOTE_MAX}</div>
                            </div>
                            <textarea
                              rows={2}
                              value={note}
                              maxLength={DEV_NOTE_MAX}
                              onChange={e=>setItemNote(item.no, e.target.value.slice(0, DEV_NOTE_MAX))}
                              style={{width:"100%",height:64,padding:"8px 10px",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:7,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box",resize:"none",overflowY:"auto",overflowX:"hidden",wordBreak:"break-word",overflowWrap:"anywhere",whiteSpace:"pre-wrap"}}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <EmptyState icon="forms" text={window.kvT("Choose a student from Tadika 4, 5 or 6 to start filling the borang.")}/>
              )}
            </div>
          </Card>
          </div>
        </div>
      ) : (
        <div style={{display:"grid",gap:16}}>
          <div className="no-print">
            <Card>
              <div style={{padding:14,fontSize:12,color:"var(--color-text-secondary)"}}>
                {window.kvT("This page is the formal KPM checklist print output only. Use Complete Checklist to edit answers, then return here for print/PDF.")}
              </div>
            </Card>
          </div>

          <div className="print-area dev-print-sheet-wrap">
            <div className="dev-print-sheet">
              <div className="dev-print-title">SENARAI SEMAK PENGESANAN</div>
              <div className="dev-print-title">{formConfig?.title || "PERKEMBANGAN KANAK-KANAK"}</div>
              <div className="dev-print-subtitle">{formConfig?.subtitle || "Pilih murid 4-6 tahun untuk buka borang."}</div>

              <div className="dev-print-meta">
                <div className="dev-print-meta-col">
                  <div className="dev-print-meta-row"><span className="dev-print-label">Nama</span><span className="dev-print-line">{selectedStudent?.name || ""}</span></div>
                  <div className="dev-print-meta-row"><span className="dev-print-label">Tarikh lahir</span><span className="dev-print-line">{selectedStudent?.dob || ""}</span></div>
                  <div className="dev-print-meta-row"><span className="dev-print-label">No. K.P./ Sijil<br/>Kelahiran</span><span className="dev-print-line">{selectedStudent?.ic || ""}</span></div>
                  <div className="dev-print-meta-row"><span className="dev-print-label">Tempat penilaian</span><span className="dev-print-line">{form.assessment_place || ""}</span></div>
                </div>
                <div className="dev-print-meta-col">
                  <div className="dev-print-meta-row"><span className="dev-print-label">Nama ibu bapa/penjaga</span><span className="dev-print-line">{selectedStudent?.parent || ""}</span></div>
                  <div className="dev-print-meta-row"><span className="dev-print-label">Nombor telefon</span><span className="dev-print-line">{selectedStudent?.phone || ""}</span></div>
                  <div className="dev-print-meta-row"><span className="dev-print-label">Alamat</span><span className="dev-print-line dev-print-line-tall">{selectedStudent?.address || ""}</span></div>
                </div>
              </div>

              <div className="dev-print-instruction">
                <div>Arahan: Tandakan</div>
                <div className="dev-print-instruction-markers">
                  <span>( &nbsp; / &nbsp; ) untuk kemahiran yang tercapai, atau</span>
                  <span>( &nbsp; X &nbsp; ) untuk kemahiran yang tidak tercapai</span>
                </div>
              </div>

              <table className="dev-print-table">
                <thead>
                  <tr>
                    <th style={{width:"7%"}}>BIL.</th>
                    <th style={{width:"63%"}}>DOMAIN/ITEM</th>
                    <th style={{width:"11%"}}>TANDA</th>
                    <th style={{width:"19%"}}>CATATAN</th>
                  </tr>
                </thead>
                <tbody>
                  {printGroups.length ? printGroups.map(group => (
                    <React.Fragment key={group.domain}>
                      <tr><td colSpan={4} className="dev-print-domain">{group.domain}</td></tr>
                      {group.items.map(item => {
                        const value = form.checklist?.[item.no] || "";
                        const note = form.checklist?.[`note_${item.no}`] || "";
                        return (
                          <tr key={item.no}>
                            <td className="dev-print-cell dev-print-cell-no">{item.no}</td>
                            <td className="dev-print-cell">{item.lines.map((line, idx) => <div key={idx}>{line}</div>)}</td>
                            <td className="dev-print-cell dev-print-cell-mark">{value}</td>
                            <td className="dev-print-cell"><div className="dev-print-note">{note}</div></td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  )) : (
                    <tr><td colSpan={4} className="dev-print-cell" style={{textAlign:"center",padding:"18px 8px"}}>{window.kvT("Please choose an active student whose age falls within 4 to 6 years old.")}</td></tr>
                  )}
                </tbody>
              </table>

              {(ageGroup === 5 || ageGroup === 6) ? <div className="dev-print-footnote">* item perkembangan yang penting bagi umur tersebut</div> : null}

              <div className="dev-print-signoff">
                <div className="dev-print-sign-row"><span className="dev-print-sign-label">Tandatangan penilai</span><span className="dev-print-sign-line">{form.assessor_name || ""}</span></div>
                <div className="dev-print-sign-row"><span className="dev-print-sign-label">Nama</span><span className="dev-print-sign-line">{form.assessor_name || ""}</span></div>
                <div className="dev-print-sign-row"><span className="dev-print-sign-label">Tarikh penilaian</span><span className="dev-print-sign-line">{form.assessment_date || ""}</span></div>
              </div>

              <div className="dev-print-footer">
                <div className="dev-print-footer-left">© Bahagian Pendidikan Khas, Kementerian Pendidikan Malaysia</div>
                <div className="dev-print-footer-center">{formConfig?.printedPage || ""}</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
