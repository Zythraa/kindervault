const ClassRosterModal = ({
  classInfo,
  students,
  onClose
}) => {
  React.useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return React.createElement("div", {
    className: "kv-modal-backdrop",
    onClick: event => event.target === event.currentTarget && onClose()
  }, React.createElement("div", {
    className: "kv-modal kv-class-roster-modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "class-roster-title"
  }, React.createElement("div", {
    className: "kv-class-roster-head"
  }, React.createElement("div", null, React.createElement("div", {
    className: "kv-class-roster-eyebrow"
  }, React.createElement("i", {
    className: "ti ti-users",
    "aria-hidden": "true"
  }), window.kvT("Students in this class")), React.createElement("h3", {
    id: "class-roster-title"
  }, classInfo.name), React.createElement("p", null, window.kvT(classInfo.age || `${classInfo.age_group} years old`), " ", React.createElement("span", null, window.kvT("{count} student(s) enrolled", {
    count: students.length
  })))), React.createElement("button", {
    type: "button",
    className: "kv-icon-btn",
    onClick: onClose,
    "aria-label": window.kvT("Close student list"),
    title: window.kvT("Close")
  }, React.createElement("i", {
    className: "ti ti-x",
    "aria-hidden": "true"
  }))), React.createElement("div", {
    className: "kv-class-roster-body"
  }, students.length ? React.createElement("div", {
    className: "kv-table-scroll"
  }, React.createElement("table", {
    className: "kv-data-table kv-class-roster-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, window.kvT("Student")), React.createElement("th", null, window.kvT("Gender")), React.createElement("th", null, window.kvT("Status")))), React.createElement("tbody", null, students.map(student => React.createElement("tr", {
    key: student.id
  }, React.createElement("td", null, React.createElement("div", {
    className: "kv-class-roster-student-name"
  }, student.name), React.createElement("code", null, student.code || "-")), React.createElement("td", null, student.gender === "M" ? window.kvT("Male") : student.gender === "F" ? window.kvT("Female") : "-"), React.createElement("td", null, React.createElement("span", {
    className: `kv-badge kv-badge--${student.status === "Active" ? "green" : "gray"}`
  }, window.kvT(student.status || "Active")))))))) : React.createElement(EmptyState, {
    icon: "users",
    text: window.kvT("No students are enrolled in this class yet.")
  })), React.createElement("div", {
    className: "kv-class-roster-footer"
  }, React.createElement(Btn, {
    variant: "outline",
    onClick: onClose
  }, window.kvT("Close")))));
};
const ClassesPage = ({
  classesList,
  students = []
}) => {
  const fixedClasses = (classesList || []).length ? [...classesList].sort((left, right) => Number(left.age_group || 99) - Number(right.age_group || 99) || String(left.name).localeCompare(String(right.name))) : [{
    name: "Permata",
    age_group: 4,
    age: "4 years old"
  }, {
    name: "Intelek",
    age_group: 5,
    age: "5 years old"
  }, {
    name: "Ceria",
    age_group: 6,
    age: "6 years old"
  }];
  const [rosterClass, setRosterClass] = React.useState(null);
  const studentsInClass = className => students.filter(student => student.class === className).slice().sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  const rosterStudents = rosterClass ? studentsInClass(rosterClass.name) : [];
  return React.createElement("div", {
    className: "kv-page kv-page--classes"
  }, React.createElement("div", {
    className: "kv-page-header"
  }, React.createElement("h2", {
    className: "kv-page-title"
  }, React.createElement("i", {
    className: "ti ti-chalkboard",
    style: {
      marginRight: 8
    },
    "aria-hidden": "true"
  }), window.kvT('Manage Classes'))), React.createElement(Card, {
    className: "kv-info-card",
    style: {
      maxWidth: 760,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)",
      lineHeight: 1.6
    }
  }, window.kvT("One class is used for each age year. Administrators can rename these class labels from Settings > General while the age grouping remains unchanged.")))), React.createElement(Card, {
    className: "kv-table-card",
    style: {
      maxWidth: 760
    }
  }, React.createElement(CardHead, null, React.createElement("i", {
    className: "ti ti-list",
    style: {
      marginRight: 6
    },
    "aria-hidden": "true"
  }), window.kvT('Class List'), " ", React.createElement("span", {
    style: {
      background: "var(--color-background-secondary)",
      color: "var(--color-text-secondary)",
      fontSize: 11,
      padding: "1px 7px",
      borderRadius: 10,
      marginLeft: 4
    }
  }, fixedClasses.length)), React.createElement("div", {
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
  }, React.createElement("th", {
    style: {
      padding: "8px 16px",
      textAlign: "left",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, "#"), React.createElement("th", {
    style: {
      padding: "8px 16px",
      textAlign: "left",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, window.kvT('Class Name')), React.createElement("th", {
    style: {
      padding: "8px 16px",
      textAlign: "left",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, window.kvT("Age Group")), React.createElement("th", {
    style: {
      padding: "8px 16px",
      textAlign: "left",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, window.kvT('Students Enrolled')), React.createElement("th", {
    style: {
      padding: "8px 16px",
      textAlign: "right",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: .5,
      color: "var(--color-text-tertiary)",
      fontWeight: 500,
      borderBottom: "0.5px solid var(--color-border-tertiary)"
    }
  }, window.kvT("Roster")))), React.createElement("tbody", null, fixedClasses.map((c, i) => {
    const enrolledStudents = studentsInClass(c.name);
    const count = enrolledStudents.length;
    return React.createElement("tr", {
      key: c.name,
      style: {
        borderBottom: "0.5px solid var(--color-border-tertiary)"
      }
    }, React.createElement("td", {
      style: {
        padding: "12px 16px",
        color: "var(--color-text-tertiary)",
        fontSize: 11
      }
    }, i + 1), React.createElement("td", {
      style: {
        padding: "12px 16px",
        fontWeight: 600,
        color: "var(--color-text-primary)"
      }
    }, c.name), React.createElement("td", {
      style: {
        padding: "12px 16px",
        color: "var(--color-text-secondary)"
      }
    }, window.kvT(c.age || `${c.age_group} years old`)), React.createElement("td", {
      style: {
        padding: "12px 16px",
        color: "var(--color-text-secondary)"
      }
    }, count > 0 ? React.createElement("span", {
      style: {
        background: C.blueBg,
        color: C.blueTx,
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 10
      }
    }, window.kvT("{count} student(s)", {
      count
    })) : React.createElement("span", {
      style: {
        color: "var(--color-text-tertiary)",
        fontSize: 11
      }
    }, window.kvT('None'))), React.createElement("td", {
      style: {
        padding: "10px 16px",
        textAlign: "right"
      }
    }, React.createElement(Btn, {
      small: true,
      variant: "outline",
      onClick: () => setRosterClass(c),
      title: window.kvT("View students enrolled in {className}", {
        className: c.name
      })
    }, React.createElement("i", {
      className: "ti ti-users",
      "aria-hidden": "true"
    }), " ", window.kvT("View students"))));
  }))))), rosterClass && React.createElement(ClassRosterModal, {
    classInfo: rosterClass,
    students: rosterStudents,
    onClose: () => setRosterClass(null)
  }));
};
