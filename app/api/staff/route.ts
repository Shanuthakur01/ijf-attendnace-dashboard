import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  calculateHours,
  parseHours,
  getMonthDates,
  getInitials,
  type AttendanceRecord,
} from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = await getDb();
  const dates = getMonthDates();

  const monthRecords = (await db
    .collection("attendance")
    .find({ name }, { projection: { _id: 0 } })
    .toArray()) as unknown as AttendanceRecord[];

  const recordMap = new Map(monthRecords.map((r) => [r.date, r]));

  let totalH = 0;
  let totalM = 0;
  const days: any[] = [];

  for (const date of [...dates].reverse()) {
    const rec = recordMap.get(date);
    if (rec) {
      const login = rec.login_time || "--";
      const logout = rec.logout_time || "--";
      const hrs = calculateHours(login, logout);
      const { h, m } = parseHours(hrs);
      totalH += h;
      totalM += m;
      days.push({ date, login, logout, hours: hrs, present: true });
    } else {
      days.push({ date, login: "--", logout: "--", hours: "--", present: false });
    }
  }

  totalH += Math.floor(totalM / 60);
  totalM = totalM % 60;

  const presentDays = monthRecords.length;
  const absentDays = dates.length - presentDays;

  // Weekly hours for chart
  const weeklyMap = new Map<string, number>();
  for (const date of dates) {
    const rec = recordMap.get(date);
    if (rec) {
      const hrs = calculateHours(rec.login_time || "", rec.logout_time || "");
      const { h, m } = parseHours(hrs);
      const weekStart = getWeekStart(date);
      weeklyMap.set(weekStart, (weeklyMap.get(weekStart) || 0) + h + m / 60);
    }
  }

  const weeklyHours = Array.from(weeklyMap.entries())
    .map(([week, hours]) => ({ week: formatWeekLabel(week), hours: Math.round(hours * 10) / 10 }))
    .sort();

  // Daily hours for bar chart
  const dailyHours = dates.map((date) => {
    const rec = recordMap.get(date);
    if (rec) {
      const hrs = calculateHours(rec.login_time || "", rec.logout_time || "");
      const { h, m } = parseHours(hrs);
      return { date: date.slice(5), hours: Math.round((h + m / 60) * 10) / 10 };
    }
    return { date: date.slice(5), hours: 0 };
  });

  return NextResponse.json({
    name,
    initials: getInitials(name),
    presentDays,
    absentDays,
    totalHours: `${totalH}h ${totalM}m`,
    days,
    weeklyHours,
    dailyHours,
    month: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  });
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
