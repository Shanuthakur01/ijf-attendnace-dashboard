"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PersonEntry {
  name: string;
  initials: string;
  login: string;
  logout: string;
  hours: string;
  hoursDecimal: number;
  present: boolean;
}

interface DashboardData {
  today: string;
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  staff: PersonEntry[];
  students: PersonEntry[];
  lastUpdated: string;
}

const STAFF_HALF_DAY_MAX_HOURS = 8.5;
const STUDENT_HALF_DAY_MAX_HOURS = 4;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [reportDate, setReportDate] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState<"staff" | "students">("staff");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [viewDate, setViewDate] = useState("");

  /* ---- Theme bootstrap ---- */
  useEffect(() => {
    const stored = (localStorage.getItem("ijf-theme") as "dark" | "light") || "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.body.classList.add("theme-transitioning");
    setTimeout(() => document.body.classList.remove("theme-transitioning"), 300);
    setTheme(next);
    localStorage.setItem("ijf-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  /* ---- Data fetch ---- */
  const load = useCallback(async () => {
    try {
      const url = viewDate ? `/api/attendance?date=${viewDate}` : "/api/attendance";
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Server error (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      if (!reportDate) setReportDate(json.today);
    } catch (e: any) {
      setError(e.message);
    }
  }, [reportDate, viewDate]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/report?date=${reportDate}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${reportDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setShowModal(false);
    } finally {
      setDownloading(false);
    }
  };

  const takeScreenshot = async () => {
    const el = document.getElementById("dashboard-content");
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { 
        scale: 2, 
        backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
        onclone: (clonedDoc) => {
          // Remove fade-up animations so cards don't stay invisible during the capture clone
          const fadeElements = clonedDoc.querySelectorAll(".fade-up");
          fadeElements.forEach((e) => {
            e.classList.remove("fade-up");
            (e as HTMLElement).style.animation = "none";
            (e as HTMLElement).style.opacity = "1";
            (e as HTMLElement).style.transform = "none";
          });
        }
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_screenshot_${data?.today || "date"}.png`;
      a.click();
    } catch (err) {
      console.error("Screenshot failed", err);
      alert("Failed to take screenshot.");
    }
  };

  const getLocalToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const changeDateBy = (days: number) => {
    const baseDateStr = viewDate || data?.today;
    if (!baseDateStr) return;
    const [y, m, d] = baseDateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, "0");
    const newD = String(dateObj.getDate()).padStart(2, "0");
    const newDateStr = `${newY}-${newM}-${newD}`;

    if (newDateStr > getLocalToday() && days > 0) return;
    setViewDate(newDateStr);
  };

  if (error) return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingSkeleton />;

  /* ---- Stats per tab ---- */
  const staffTotal   = data.staff.length;
  const staffPresent = data.staff.filter((p) => p.present).length;
  const staffAbsent  = staffTotal - staffPresent;
  const staffHalfDay = data.staff.filter(
    (p) => p.present && p.hoursDecimal > 0 && p.hoursDecimal < STAFF_HALF_DAY_MAX_HOURS
  ).length;

  const studentTotal   = data.students.length;
  const studentPresent = data.students.filter((p) => p.present).length;
  const studentAbsent  = studentTotal - studentPresent;
  const studentHalfDay = data.students.filter(
    (p) => p.present && p.hoursDecimal > 0 && p.hoursDecimal < STUDENT_HALF_DAY_MAX_HOURS
  ).length;

  const isStaff     = tab === "staff";
  const halfDayThreshold = isStaff ? STAFF_HALF_DAY_MAX_HOURS : STUDENT_HALF_DAY_MAX_HOURS;
  const statTotal   = isStaff ? staffTotal   : studentTotal;
  const statPresent = isStaff ? staffPresent : studentPresent;
  const statAbsent  = isStaff ? staffAbsent  : studentAbsent;
  const statHalfDay = isStaff ? staffHalfDay : studentHalfDay;

  /* ---- Chart data ---- */
  const pieData = [
    { name: "Absent",  value: data.totalAbsent,  color: "var(--accent-red)"   },
    { name: "Present", value: data.totalPresent, color: "var(--accent-green)" },
  ];

  const activeList = isStaff ? data.staff : data.students;
  const hoursChartData = activeList
    .filter((p) => p.present && p.hoursDecimal > 0)
    .sort((a, b) => b.hoursDecimal - a.hoursDecimal)
    .slice(0, 12)
    .map((p) => ({
      name: titleCase(p.name.replace(/\(.*?\)/g, "").trim()),
      originalName: p.name,
      hours: Math.round(p.hoursDecimal * 10) / 10,
    }));

  const sortedList = [...activeList].sort((a, b) => Number(a.present) - Number(b.present));

  return (
    <div id="dashboard-content" style={{ minHeight: "100vh", paddingBottom: 20 }}>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="topbar" style={styles.topbar}>

        {/* Left: brand + toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="topbar-logo" style={styles.logo}>
              <span className="logo-dot-el" style={styles.logoDot} />
              IJF Attendance
            </h1>
            <p className="topbar-subtitle" style={styles.subtitle}>
              Live tracking · refreshes every 30s
            </p>
          </div>

          {/* Staff / Students toggle */}
          <div style={styles.togglePill}>
            <button
              style={tab === "staff" ? styles.toggleActive : styles.toggleInactive}
              onClick={() => setTab("staff")}
            >
              Staff
            </button>
            <button
              style={tab === "students" ? styles.toggleActive : styles.toggleInactive}
              onClick={() => setTab("students")}
            >
              Students
            </button>
          </div>
        </div>

        {/* Right: actions */}
        <div className="top-actions" style={{...styles.topActions, flexWrap: "wrap"}}>
          <div className="date-pill-el" style={{ ...styles.datePill, display: "flex", alignItems: "center", padding: 0, overflow: "hidden" }}>
            <button 
              className="nav-btn-el"
              onClick={() => changeDateBy(-1)}
              style={{ background: "transparent", border: "none", padding: "6px 10px", color: "inherit", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              title="Previous Day"
            >
              ‹
            </button>
            <input
              type="date"
              value={viewDate || data.today}
              max={getLocalToday()}
              onChange={(e) => setViewDate(e.target.value)}
              style={{ background: "transparent", border: "none", color: "inherit", fontFamily: "inherit", outline: "none", cursor: "pointer", fontSize: "12px", padding: "6px 0" }}
              title="Select Date"
            />
            <button 
              className="nav-btn-el"
              onClick={() => changeDateBy(1)}
              disabled={(viewDate || data.today) >= getLocalToday()}
              style={{ 
                background: "transparent", 
                border: "none", 
                padding: "6px 10px", 
                color: "inherit", 
                cursor: (viewDate || data.today) >= getLocalToday() ? "default" : "pointer", 
                opacity: (viewDate || data.today) >= getLocalToday() ? 0.3 : 1, 
                fontSize: 16, 
                lineHeight: 1 
              }}
              title="Next Day"
            >
              ›
            </button>
          </div>
          <button className="nav-btn-el" style={styles.navBtn} onClick={takeScreenshot}>
            📷 Screenshot
          </button>
          <Link href="/monthly" className="nav-btn-el" style={styles.navBtn}>
            Monthly
          </Link>
          <button className="download-btn-el" style={styles.downloadBtn} onClick={() => setShowModal(true)}>
            ↓ Report
          </button>
          {/* Theme toggle */}
          <button
            className="theme-btn-el"
            style={styles.themeBtn}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="stats-row" style={styles.statsRow}>
        <StatCard label={isStaff ? "Total Staff" : "Total Students"} value={statTotal}   color="blue"  icon="👥" />
        <StatCard label="Present Today"                               value={statPresent} color="green" icon="✓"  />
        <StatCard label="Absent Today"                                value={statAbsent}  color="red"   icon="✕"  />
        <StatCard label="Half Day"                                    value={statHalfDay} color="amber" icon="½"  />
      </div>

      {/* ── Section Header ──────────────────────────────────── */}
      <div className="section-header" style={styles.sectionHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={styles.sectionTitle}>
            {isStaff ? "Staff Members" : "Students"}
          </h2>
          <span style={styles.countBadge}>{activeList.length}</span>
        </div>
        <span style={styles.sectionMeta}>
          <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{statPresent}</span>
          {" present · "}
          <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>{statAbsent}</span>
          {" absent"}
          {statHalfDay > 0 && (
            <> · <span style={{ color: "var(--accent-amber)", fontWeight: 600 }}>{statHalfDay}</span> half-day</>
          )}
        </span>
      </div>

      {/* ── Person Cards ────────────────────────────────────── */}
      <div className="card-grid" style={styles.cardGrid}>
        {sortedList.map((p, i) => {
          const isHalfDay = p.present && p.hoursDecimal > 0 && p.hoursDecimal < halfDayThreshold;
          
          return (
          <Link
            key={p.name}
            href={`/employee/${encodeURIComponent(p.name)}`}
            className="emp-card fade-up"
            style={{
              ...styles.empCard,
              borderLeftColor: p.present 
                ? (isHalfDay ? "var(--accent-amber)" : "var(--accent-green)") 
                : "var(--accent-red)",
              background: p.present
                ? "var(--bg-card)"
                : "var(--absent-tint, rgba(239,68,68,0.04))",
              animationDelay: `${i * 35}ms`,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                ...styles.avatar,
                background: p.present
                  ? (isHalfDay ? "linear-gradient(135deg, #d97706, #f59e0b)" : "linear-gradient(135deg, #16a34a, #22c55e)")
                  : "linear-gradient(135deg, #b91c1c, #ef4444)",
              }}
            >
              {p.initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.empName}>{titleCase(p.name)}</div>
              <div style={styles.empTime}>
                {p.present ? (
                  <>
                    <span style={styles.timeTag}>IN</span> <b>{p.login}</b>
                    {" · "}
                    <span style={styles.timeTag}>OUT</span> <b>{p.logout}</b>
                  </>
                ) : (
                  <span style={{ color: "var(--accent-red)", opacity: 0.7 }}>Not detected today</span>
                )}
              </div>
              {p.present && (
                <div style={styles.empHours}>{p.hours} worked</div>
              )}
            </div>

            {/* Status */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span
                style={{
                  ...styles.badge,
                  background: p.present 
                    ? (isHalfDay ? "var(--accent-amber-dim)" : "var(--accent-green-dim)") 
                    : "var(--accent-red-dim)",
                  color: p.present 
                    ? (isHalfDay ? "var(--accent-amber)" : "var(--accent-green)") 
                    : "var(--accent-red)",
                  border: `1px solid ${
                    p.present 
                      ? (isHalfDay ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)") 
                      : "rgba(239,68,68,0.25)"
                  }`,
                }}
              >
                {p.present ? (isHalfDay ? "HALF-DAY" : "PRESENT") : "ABSENT"}
              </span>
              <div style={styles.arrow}>›</div>
            </div>
          </Link>
        )})}
        {activeList.length === 0 && (
          <p style={{ color: "var(--text-muted)", padding: 40, textAlign: "center", gridColumn: "1/-1" }}>
            No {tab} enrolled
          </p>
        )}
      </div>

      {/* ── Charts Row ──────────────────────────────────────── */}
      <div className="charts-row" style={styles.chartsRow}>

        {/* Pie Chart */}
        <div className="chart-card" style={styles.chartCard}>
          <div style={styles.chartCardHeader}>
            <h3 style={styles.chartTitle}>Attendance Split</h3>
            <span style={styles.chartSubtitle}>All groups · today</span>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{value}</span>
                  )}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart — Hours worked */}
        <div className="chart-card chart-card-wide" style={{ ...styles.chartCard, flex: 2 }}>
          <div style={styles.chartCardHeader}>
            <h3 style={styles.chartTitle}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Hours Worked Today</span>
            </h3>
            <span style={styles.chartSubtitle}>{isStaff ? "Staff" : "Students"} · top 12</span>
          </div>
          {hoursChartData.length > 0 ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={hoursChartData} barSize={28}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit="h"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}h`, "Hours"]}
                  />
                  <Bar 
                    dataKey="hours" 
                    fill="var(--accent-blue)" 
                    radius={[6, 6, 0, 0]}
                    onClick={(data) => {
                      const name = data.payload?.originalName || data.name;
                      if (name) window.location.href = `/employee/${encodeURIComponent(name)}`;
                    }}
                    cursor="pointer"
                  >
                    <LabelList
                      dataKey="hours"
                      position="center"
                      formatter={(v: number) => `${v}h`}
                      style={{ fill: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>
              No hours recorded yet
            </p>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={styles.footer}>
        <span>IJF Attendance System</span>
        <span style={{ color: "var(--border-light)" }}>·</span>
        <span>Auto-refreshes every 30 seconds</span>
      </footer>

      {/* ── Download Modal ──────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" style={styles.overlay} onClick={() => setShowModal(false)}>
          <div className="modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Download Report</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Select a date to export the Excel report
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className="quick-btn-el" style={styles.quickBtn} onClick={() => setReportDate(data.today)}>
                Today
              </button>
              <button
                className="quick-btn-el"
                style={styles.quickBtn}
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setReportDate(y.toISOString().split("T")[0]);
                }}
              >
                Yesterday
              </button>
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Date
            </label>
            <input
              type="date"
              value={reportDate}
              max={data.today}
              onChange={(e) => setReportDate(e.target.value)}
              style={styles.dateInput}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button style={styles.dlBtn} onClick={downloadReport} disabled={downloading}>
                {downloading ? "Preparing…" : "↓ Download Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "red" | "amber" | "purple";
  icon: string;
}) {
  const colorMap = {
    blue:   { fg: "var(--accent-blue)",   bg: "var(--accent-blue-dim)"   },
    green:  { fg: "var(--accent-green)",  bg: "var(--accent-green-dim)"  },
    red:    { fg: "var(--accent-red)",    bg: "var(--accent-red-dim)"    },
    amber:  { fg: "var(--accent-amber)",  bg: "var(--accent-amber-dim)"  },
    purple: { fg: "var(--accent-purple, #a78bfa)", bg: "var(--accent-purple-dim, rgba(167,139,250,0.12))" },
  };
  const c = colorMap[color];

  return (
    <div className="stat-card" style={{ ...styles.statCard, borderTop: `3px solid ${c.fg}` }}>
      {/* Header: label + icon */}
      <div style={styles.statCardHeader}>
        <span style={styles.statLabel}>{label}</span>
        <div style={{ ...styles.statIcon, background: c.bg, color: c.fg }}>{icon}</div>
      </div>
      {/* Big number */}
      <div style={{ ...styles.statNum, color: c.fg }}>{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-pad" style={{ padding: 40 }}>
      <div className="skeleton" style={{ height: 64, marginBottom: 24, borderRadius: 16 }} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ flex: "1 1 160px", height: 100, borderRadius: 16 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 300, marginTop: 24, borderRadius: 16 }} />
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
        <h2 style={{ marginBottom: 8 }}>Connection Error</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>{message}</p>
        <button
          style={{ ...styles.navBtn, background: "var(--accent-blue)", color: "#fff", border: "none" }}
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Shared tooltip style                                               */
/* ------------------------------------------------------------------ */
const tooltipStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-light)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

/* ------------------------------------------------------------------ */
/*  Inline Styles                                                      */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  /* ---- Topbar ---- */
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 32px",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(16px)",
    gap: 12,
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 10,
    letterSpacing: "-0.02em",
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "var(--accent-green)",
    boxShadow: "0 0 8px var(--accent-green)",
    display: "inline-block",
    flexShrink: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 2,
  },
  topActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  datePill: {
    background: "var(--bg-elevated)",
    padding: "6px 14px",
    borderRadius: "var(--radius-full)",
    fontSize: 12,
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
    border: "1px solid var(--border-light)",
  },
  navBtn: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-light)",
    padding: "7px 16px",
    borderRadius: "var(--radius-full)",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    display: "inline-block",
    transition: "background 0.15s, color 0.15s",
  },
  downloadBtn: {
    background: "var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    border: "1px solid rgba(59,130,246,0.3)",
    padding: "7px 16px",
    borderRadius: "var(--radius-full)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    whiteSpace: "nowrap",
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid var(--border-light)",
    background: "var(--bg-elevated)",
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* ---- Staff/Students toggle pill ---- */
  togglePill: {
    display: "flex",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-full)",
    padding: 3,
    gap: 2,
  },
  toggleActive: {
    background: "var(--accent-blue)",
    color: "#fff",
    border: "none",
    padding: "5px 16px",
    borderRadius: "var(--radius-full)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "var(--font-sans)",
    transition: "background 0.2s, color 0.2s",
    whiteSpace: "nowrap",
  },
  toggleInactive: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "none",
    padding: "5px 16px",
    borderRadius: "var(--radius-full)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    transition: "background 0.2s, color 0.2s",
    whiteSpace: "nowrap",
  },

  /* ---- Stats Row ---- */
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    padding: "24px 32px 0",
  },
  statCard: {
    background: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
  },
  statCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  statNum: {
    fontSize: 34,
    fontWeight: 800,
    fontFamily: "var(--font-mono)",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },

  /* ---- Section header ---- */
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px 0",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  countBadge: {
    background: "var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    border: "1px solid rgba(59,130,246,0.2)",
    padding: "2px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
  },
  sectionMeta: {
    fontSize: 13,
    color: "var(--text-muted)",
  },

  /* ---- Card Grid ---- */
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: 12,
    padding: "14px 32px 24px",
  },
  empCard: {
    borderRadius: "var(--radius-lg)",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: "var(--shadow-card)",
    borderLeft: "4px solid transparent",
    cursor: "pointer",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  empName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  empTime: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginBottom: 2,
  },
  timeTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "var(--text-muted)",
  },
  empHours: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
  },
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  arrow: {
    fontSize: 20,
    color: "var(--text-muted)",
    marginTop: 4,
    textAlign: "right" as const,
  },

  /* ---- Charts ---- */
  chartsRow: {
    display: "flex",
    gap: 16,
    padding: "20px 32px 0",
    flexWrap: "wrap",
  },
  chartCard: {
    flex: 1,
    background: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
    boxShadow: "var(--shadow-card)",
    minWidth: 0,
  },
  chartCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  chartSubtitle: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontWeight: 400,
  },

  /* ---- Footer ---- */
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: "20px 32px",
    fontSize: 12,
    color: "var(--text-muted)",
    borderTop: "1px solid var(--border)",
    marginTop: 20,
  },

  /* ---- Modal ---- */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: "var(--bg-card)",
    borderRadius: "var(--radius-xl)",
    padding: "28px 32px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "var(--shadow-elevated)",
    border: "1px solid var(--border-light)",
  },
  quickBtn: {
    padding: "6px 16px",
    borderRadius: "var(--radius-full)",
    border: "1px solid rgba(59,130,246,0.3)",
    background: "var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    transition: "background 0.15s, color 0.15s",
  },
  dateInput: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "var(--font-sans)",
    outline: "none",
  },
  cancelBtn: {
    padding: "9px 20px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-light)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    transition: "background 0.15s",
  },
  dlBtn: {
    padding: "9px 22px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--accent-blue)",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "var(--font-sans)",
    transition: "opacity 0.15s",
  },
};
