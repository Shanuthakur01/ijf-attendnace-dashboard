import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  calculateHours,
  parseHours,
  getMonthDates,
  isStudent,
  type AttendanceRecord,
} from "@/lib/helpers";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type"); // "staff" or "student"
    if (type !== "staff" && type !== "student") {
      return NextResponse.json({ error: "Invalid type. Must be 'staff' or 'student'." }, { status: 400 });
    }

    const db = await getDb();
    const dates = getMonthDates(); // current month dates up to today, returns YYYY-MM-DD strings

    if (dates.length === 0) {
      return NextResponse.json({ error: "No dates found for current month." }, { status: 404 });
    }

    const monthStr = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    // Enrolled list
    const enrolled: string[] = (
      await db
        .collection("staff_embeddings")
        .find({}, { projection: { name: 1, _id: 0 } })
        .toArray()
    ).map((d) => d.name as string);

    // Filter enrolled by requested type
    const targetEnrolled = enrolled.filter(name => type === "student" ? isStudent(name) : !isStudent(name));

    if (targetEnrolled.length === 0) {
      return NextResponse.json({ error: `No enrolled ${type}s found.` }, { status: 404 });
    }

    const allRecords = (await db
      .collection("attendance")
      .find({ date: { $in: dates } }, { projection: { _id: 0 } })
      .toArray()) as unknown as AttendanceRecord[];

    const byName = new Map<string, AttendanceRecord[]>();
    for (const r of allRecords) {
      const list = byName.get(r.name) || [];
      list.push(r);
      byName.set(r.name, list);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Monthly ${type === "staff" ? "Staff" : "Students"}`);

    const headerFillColor = type === "staff" ? "FF1565C0" : "FF2E7D32"; 
    const titleFillColor = type === "staff" ? "FF0D47A1" : "FF1B5E20";

    const headerFill = (color: string): ExcelJS.Fill => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color },
    });
    const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" };

    // Set title
    const endColIndex = 6 + dates.length; // 6 base columns + N dates
    ws.mergeCells(1, 1, 1, endColIndex);
    const mainTitle = ws.getCell(1, 1);
    mainTitle.value = `MONTHLY ${type.toUpperCase()} ATTENDANCE — ${monthStr.toUpperCase()}`;
    mainTitle.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
    mainTitle.fill = headerFill(titleFillColor);
    mainTitle.alignment = centerAlign;

    // Base headers
    const baseHeaders = ["S.No", "Name", "Total Present", "Total Absent", "Total Hours", "Performance %"];
    const headers = [...baseHeaders, ...dates.map(d => d.slice(5))]; // MM-DD for column headers

    const hFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    
    headers.forEach((h, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = h;
      cell.font = hFont;
      cell.fill = headerFill(headerFillColor);
      cell.alignment = centerAlign;
    });

    // Column widths
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 25;
    ws.getColumn(3).width = 15;
    ws.getColumn(4).width = 15;
    ws.getColumn(5).width = 15;
    ws.getColumn(6).width = 18;
    for (let i = 0; i < dates.length; i++) {
        ws.getColumn(7 + i).width = 10;
    }

    targetEnrolled.sort((a, b) => a.localeCompare(b)).forEach((name, idx) => {
      const records = byName.get(name) || [];
      const presentDays = records.length;
      const absentDays = dates.length - presentDays;
      let totalH = 0;
      let totalM = 0;
      
      const rowDayStatus: string[] = [];

      for (const d of dates) {
        const dRec = records.find(r => r.date === d);
        if (dRec) {
          const hrs = calculateHours(dRec.login_time || "", dRec.logout_time || "");
          rowDayStatus.push(`P\n(${hrs})`);
          const { h, m } = parseHours(hrs);
          totalH += h;
          totalM += m;
        } else {
          rowDayStatus.push("A");
        }
      }

      totalH += Math.floor(totalM / 60);
      totalM = totalM % 60;
      const pct = dates.length > 0 ? Math.round((presentDays / dates.length) * 100) : 0;

      const rowValues = [
        idx + 1,
        name,
        presentDays,
        absentDays,
        `${totalH}h ${totalM}m`,
        `${pct}%`,
        ...rowDayStatus
      ];

      const row = ws.getRow(idx + 3);
      row.values = rowValues;
      row.height = 30; // giving a bit more height for P \n (hrs)

      row.eachCell((cell, colNumber) => {
        cell.alignment = { ...centerAlign, wrapText: true };
        
        if (colNumber === 3) {
           cell.font = { bold: true, color: { argb: "FF2E7D32" } };
        } else if (colNumber === 4) {
           cell.font = { bold: true, color: { argb: "FFD32F2F" } };
        }

        if (colNumber > 6) {
          const val = cell.value as string;
          if (val && val.startsWith("P")) {
            cell.font = { color: { argb: "FF2E7D32" } }; // Green
          } else if (val === "A") {
            cell.font = { color: { argb: "FFD32F2F" }, bold: true }; // Red
          }
        }
      });
    });

    const buffer = await wb.xlsx.writeBuffer();

    const fileName = `monthly_${type}_attendance_${monthStr.replace(/\s+/g, "_").toLowerCase()}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
         "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
