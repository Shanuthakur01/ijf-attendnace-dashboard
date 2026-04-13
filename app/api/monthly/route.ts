import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  calculateHours,
  parseHours,
  getMonthDates,
  getInitials,
  isStudent,
  type AttendanceRecord,
} from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const dates = getMonthDates();

    const enrolled: string[] = (
      await db
        .collection("staff_embeddings")
        .find({}, { projection: { name: 1, _id: 0 } })
        .toArray()
    ).map((d) => d.name as string);

    const allRecords = (await db
      .collection("attendance")
      .find({ date: { $in: dates } }, { projection: { _id: 0 } })
      .toArray()) as unknown as AttendanceRecord[];

    // Group records by name
    const byName = new Map<string, AttendanceRecord[]>();
    for (const r of allRecords) {
      const list = byName.get(r.name) || [];
      list.push(r);
      byName.set(r.name, list);
    }

    const staffList: any[] = [];
    const studentList: any[] = [];

    // For department-level chart data
    let totalStaffPresent = 0;
    let totalStudentPresent = 0;

    for (const name of enrolled) {
      const records = byName.get(name) || [];
      const present = records.length;
      const absent = dates.length - present;
      let totalH = 0;
      let totalM = 0;

      for (const r of records) {
        const hrs = calculateHours(r.login_time || "", r.logout_time || "");
        const { h, m } = parseHours(hrs);
        totalH += h;
        totalM += m;
      }

      totalH += Math.floor(totalM / 60);
      totalM = totalM % 60;

      const pct = dates.length > 0 ? Math.round((present / dates.length) * 100) : 0;

      const entry = {
        name,
        initials: getInitials(name),
        present,
        absent,
        hours: `${totalH}h ${totalM}m`,
        hoursDecimal: totalH + totalM / 60,
        pct,
      };

      if (isStudent(name)) {
        studentList.push(entry);
        totalStudentPresent += present;
      } else {
        staffList.push(entry);
        totalStaffPresent += present;
      }
    }

    // Attendance trend per day
    const dailyTrend = dates.map((date) => {
      const dayRecords = allRecords.filter((r) => r.date === date);
      const staffPresent = dayRecords.filter((r) => !isStudent(r.name)).length;
      const studentPresent = dayRecords.filter((r) => isStudent(r.name)).length;
      return { date: date.slice(5), staff: staffPresent, students: studentPresent };
    });

    const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    return NextResponse.json({
      month,
      totalDays: dates.length,
      staff: staffList,
      students: studentList,
      dailyTrend,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
