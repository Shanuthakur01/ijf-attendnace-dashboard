import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  calculateHours,
  parseHours,
  isStudent,
  getInitials,
  todayStr,
  type AttendanceRecord,
} from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const today = todayStr();

    const enrolled: string[] = (
      await db
        .collection("staff_embeddings")
        .find({}, { projection: { name: 1, _id: 0 } })
        .toArray()
    ).map((d) => d.name as string);

    const records = (await db
      .collection("attendance")
      .find({ date: today }, { projection: { _id: 0 } })
      .toArray()) as unknown as AttendanceRecord[];

    const recordMap = new Map(records.map((r) => [r.name, r]));

    const staff: any[] = [];
    const students: any[] = [];

    for (const name of enrolled) {
      const rec = recordMap.get(name);
      const login = rec?.login_time?.trim() || "";
      const isPresent = login !== "" && login !== "--";
      const logout = rec?.logout_time?.trim() || "";
      const hours = isPresent ? calculateHours(login, logout) : "--";
      const { h, m } = parseHours(hours);

      const entry = {
        name,
        initials: getInitials(name),
        login: isPresent ? login : "--",
        logout: isPresent ? (logout || "--") : "--",
        hours,
        hoursDecimal: h + m / 60,
        present: isPresent,
      };

      if (isStudent(name)) students.push(entry);
      else staff.push(entry);
    }

    const totalPresent = [...staff, ...students].filter((e) => e.present).length;
    const totalAbsent = enrolled.length - totalPresent;

    return NextResponse.json({
      today,
      totalEnrolled: enrolled.length,
      totalPresent,
      totalAbsent,
      staff,
      students,
      lastUpdated: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
