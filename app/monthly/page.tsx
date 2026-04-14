"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface PersonSummary {
  name: string;
  initials: string;
  present: number;
  absent: number;
  hours: string;
  hoursDecimal: number;
  pct: number;
}

interface MonthlyData {
  month: string;
  totalDays: number;
  staff: PersonSummary[];
  students: PersonSummary[];
  dailyTrend: { date: string; staff: number; students: number }[];
}

export default function MonthlyPage() {
  const [data, setData] = useState<MonthlyData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/monthly")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

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
        <div className="skeleton" style={{ height: 300, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );

  const topHours = [...data.staff, ...data.students]
    .sort((a, b) => b.hoursDecimal - a.hoursDecimal)
    .slice(0, 10)
    .map((p) => ({
      name: titleCase(p.name.replace(/\(.*?\)/g, "").trim()),
      originalName: p.name,
      hours: Math.round(p.hoursDecimal * 10) / 10,
    }));

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="topbar" style={s.topbar}>
        <h1 style={s.title}>Monthly Overview · {data.month}</h1>
        <Link href="/" className="back-btn-el" style={s.backBtn}>
          ← Dashboard
        </Link>
      </header>

      {/* Trend Chart */}
      <div className="charts-row" style={s.chartsRow}>
        <div className="chart-card chart-card-wide" style={{ ...s.chartCard, flex: 2 }}>
          <h3 style={s.chartTitle}>Daily Attendance Trend</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.dailyTrend.length / 12))}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="staff"
                  stroke="var(--accent-blue)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={600}
                />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="var(--accent-green)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={s.chartCard}>
          <h3 style={s.chartTitle}>Top Hours This Month</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={topHours} layout="vertical" barSize={16}>
                <XAxis
                  type="number"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={150}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v}h`, "Hours"]}
                />
                <Bar
                  dataKey="hours"
                  fill="var(--accent-purple)"
                  radius={[0, 6, 6, 0]}
                  animationDuration={600}
                  onClick={(data) => {
                    const name = data.payload?.originalName || data.name;
                    if (name) window.location.href = `/employee/${encodeURIComponent(name)}`;
                  }}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="split-container" style={s.splitContainer}>
        <div className="split-column" style={s.splitColumn}>
          <SummaryTable title="Staff" data={data.staff} totalDays={data.totalDays} />
        </div>
        <div className="split-column" style={s.splitColumn}>
          <SummaryTable title="Students" data={data.students} totalDays={data.totalDays} />
        </div>
      </div>
    </div>
  );
}

function SummaryTable({
  title,
  data,
}: {
  title: string;
  data: PersonSummary[];
  totalDays: number;
}) {
  return (
    <div className="table-container" style={s.tableContainer}>
      <div style={s.tableHeader}>{title} Attendance</div>
      <div style={{ overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              {["#", "Name", "Present", "Absent", "Hours", "%"].map((h) => (
                <th key={h} style={s.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => {
              const barColor =
                p.pct >= 75
                  ? "var(--accent-green)"
                  : p.pct >= 50
                    ? "var(--accent-amber)"
                    : "var(--accent-red)";
              return (
                <tr
                  key={p.name}
                  className="hoverable-row"
                  style={i % 2 !== 0 ? { background: "var(--bg-elevated)" } : {}}
                  onClick={() =>
                    (window.location.href = `/employee/${encodeURIComponent(p.name)}`)
                  }
                >
                  <td style={s.td}>{i + 1}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {p.initials}
                      </div>
                      <span style={{ fontWeight: 600, color: "var(--accent-blue)" }}>
                        {titleCase(p.name)}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: "var(--accent-green)", fontWeight: 600 }}>
                    {p.present}
                  </td>
                  <td style={{ ...s.td, color: "var(--accent-red)", fontWeight: 600 }}>
                    {p.absent}
                  </td>
                  <td
                    style={{
                      ...s.td,
                      color: "var(--accent-blue)",
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                    }}
                  >
                    {p.hours}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          background: "var(--bg-primary)",
                          borderRadius: 10,
                          height: 6,
                          width: 70,
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            background: barColor,
                            width: `${p.pct}%`,
                            height: "100%",
                            borderRadius: 10,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: barColor, fontWeight: 700, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                        {p.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: "center", color: "var(--text-muted)", padding: 32 }}>
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  title: { fontSize: 18, fontWeight: 700 },
  backBtn: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-light)",
    padding: "7px 16px",
    borderRadius: "var(--radius-full)",
    fontSize: 13,
    fontWeight: 500,
    transition: "background 0.15s, color 0.15s",
    whiteSpace: "nowrap",
  },
  chartsRow: {
    display: "flex",
    gap: 16,
    padding: "24px 32px 0",
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
  splitContainer: {
    display: "flex",
    gap: 20,
    padding: "20px 32px 40px",
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
  },
  splitColumn: { flex: 1, minWidth: 320 },
  tableContainer: {
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
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    padding: "11px 16px",
    textAlign: "left" as const,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  td: {
    padding: "11px 16px",
    borderBottom: "1px solid var(--border)",
    fontSize: 13,
  },
};
