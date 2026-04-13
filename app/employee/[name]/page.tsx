"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

interface DayRecord {
  date: string;
  login: string;
  logout: string;
  hours: string;
  present: boolean;
}

interface ProfileData {
  name: string;
  initials: string;
  presentDays: number;
  absentDays: number;
  totalHours: string;
  days: DayRecord[];
  weeklyHours: { week: string; hours: number }[];
  dailyHours: { date: string; hours: number }[];
  month: string;
}

export default function EmployeePage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/staff?name=${encodeURIComponent(name)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [name]);

  if (error)
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--accent-red)" }}>
        Error: {error}
      </div>
    );
  if (!data)
    return (
      <div className="loading-pad" style={{ padding: 40 }}>
        <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );

  const attendancePct =
    data.presentDays + data.absentDays > 0
      ? Math.round((data.presentDays / (data.presentDays + data.absentDays)) * 100)
      : 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Top Bar */}
      <header className="topbar" style={s.topbar}>
        <h1 style={s.title}>Employee Profile · {titleCase(data.name)}</h1>
        <Link href="/" className="back-btn-el" style={s.backBtn}>
          ← Dashboard
        </Link>
      </header>

      {/* Profile Card */}
      <div className="profile-card" style={s.profileCard}>
        <div style={s.bigAvatar}>{data.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{titleCase(data.name)}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Monthly Report · {data.month}
          </p>
        </div>
        <div className="mini-stats" style={s.miniStats}>
          <MiniStat label="Present" value={data.presentDays} color="var(--accent-green)" />
          <MiniStat label="Absent" value={data.absentDays} color="var(--accent-red)" />
          <MiniStat label="Hours" value={data.totalHours} color="var(--accent-blue)" />
          <MiniStat label="Attendance" value={`${attendancePct}%`} color="var(--accent-amber)" />
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row" style={s.chartsRow}>
        <div className="chart-card" style={s.chartCard}>
          <h3 style={s.chartTitle}>Daily Hours</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={data.dailyHours} barSize={16}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.dailyHours.length / 10))}
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
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={s.chartCard}>
          <h3 style={s.chartTitle}>Weekly Trend</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={data.weeklyHours}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v}h`, "Total"]}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--accent-green)"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="table-container" style={s.tableContainer}>
        <div style={s.tableHeader}>Attendance Details · {data.month}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {["#", "Date", "Login", "Logout", "Hours", "Status"].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((d, i) => (
                <tr key={d.date} style={i % 2 === 0 ? {} : { background: "var(--bg-elevated)" }}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    {d.date}
                  </td>
                  <td style={{ ...s.td, color: "var(--accent-blue)", fontWeight: 600 }}>
                    {d.login}
                  </td>
                  <td style={{ ...s.td, color: "var(--accent-red)", fontWeight: 600 }}>
                    {d.logout}
                  </td>
                  <td style={{ ...s.td, fontFamily: "var(--font-mono)" }}>{d.hours}</td>
                  <td style={s.td}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "var(--radius-full)",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        background: d.present ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
                        color: d.present ? "var(--accent-green)" : "var(--accent-red)",
                      }}
                    >
                      {d.present ? "PRESENT" : "ABSENT"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div style={s.miniStat}>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-light)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

const s: Record<string, React.CSSProperties> = {
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 32px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(12px)",
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  backBtn: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-light)",
    padding: "7px 16px",
    borderRadius: "var(--radius-full)",
    fontSize: 13,
    fontWeight: 500,
    transition: "background 0.15s, color 0.15s",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  profileCard: {
    margin: "24px 32px",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-xl)",
    padding: "28px 32px",
    display: "flex",
    alignItems: "center",
    gap: 20,
    boxShadow: "var(--shadow-card)",
    flexWrap: "wrap" as const,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  miniStats: {
    display: "flex",
    gap: 12,
    marginLeft: "auto",
    flexWrap: "wrap" as const,
  },
  miniStat: {
    textAlign: "center" as const,
    background: "var(--bg-elevated)",
    padding: "12px 18px",
    borderRadius: "var(--radius-md)",
    minWidth: 72,
  },
  chartsRow: {
    display: "flex",
    gap: 16,
    padding: "0 32px 20px",
    flexWrap: "wrap" as const,
  },
  chartCard: {
    flex: 1,
    minWidth: 0,
    background: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
    boxShadow: "var(--shadow-card)",
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 14,
    color: "var(--text-secondary)",
  },
  tableContainer: {
    margin: "0 32px 40px",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
  },
  tableHeader: {
    padding: "16px 22px",
    borderBottom: "1px solid var(--border)",
    fontSize: 15,
    fontWeight: 600,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    padding: "11px 18px",
    textAlign: "left" as const,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  td: {
    padding: "11px 18px",
    borderBottom: "1px solid var(--border)",
    fontSize: 13,
  },
};
