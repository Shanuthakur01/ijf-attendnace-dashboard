import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { calculateHours, getDayType, todayStr, type AttendanceRecord } from "@/lib/helpers";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayStr();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const db = await getDb();
  const records = (await db
    .collection("attendance")
    .find({ date }, { projection: { _id: 0 } })
    .toArray()) as unknown as AttendanceRecord[];

  if (records.length === 0) {
    return NextResponse.json({ error: `No records found for ${date}` }, { status: 404 });
  }

  const staffRecords = records.filter((r) => r.name?.toLowerCase().includes("staff"));
  const studentRecords = records.filter((r) => !r.name?.toLowerCase().includes("staff"));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Attendance Report");

  const headers = ["S.No", "Name", "Date", "Login Time", "Logout Time", "Total Hours", "Day Type", "Status"];

  const headerFill = (color: string): ExcelJS.Fill => ({
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color },
  });

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" };

  // Title row
  ws.mergeCells("A1:H1");
  const staffTitle = ws.getCell("A1");
  staffTitle.value = `STAFF ATTENDANCE — ${date}`;
  staffTitle.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  staffTitle.fill = headerFill("FF0D47A1");
  staffTitle.alignment = centerAlign;

  ws.mergeCells("J1:Q1");
  const studentTitle = ws.getCell("J1");
  studentTitle.value = `STUDENT ATTENDANCE — ${date}`;
  studentTitle.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  studentTitle.fill = headerFill("FF1B5E20");
  studentTitle.alignment = centerAlign;

  // Header row
  const staffHeaderFill = headerFill("FF1565C0");
  const studentHeaderFill = headerFill("FF2E7D32");
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };

  headers.forEach((h, i) => {
    const staffCell = ws.getCell(2, i + 1);
    staffCell.value = h;
    staffCell.font = headerFont;
    staffCell.fill = staffHeaderFill;
    staffCell.alignment = centerAlign;

    const studentCell = ws.getCell(2, i + 10);
    studentCell.value = h;
    studentCell.font = headerFont;
    studentCell.fill = studentHeaderFill;
    studentCell.alignment = centerAlign;
  });

  // Column widths
  const widths = [6, 25, 15, 15, 15, 15, 12, 12];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
    ws.getColumn(i + 10).width = w;
  });
  ws.getColumn(9).width = 5;

  function writeRows(list: AttendanceRecord[], startCol: number) {
    list.forEach((rec, idx) => {
      const total = calculateHours(rec.login_time || "", rec.logout_time || "");
      const dayType = getDayType(total);
      const row = [
        idx + 1,
        rec.name || "-",
        rec.date || "-",
        rec.login_time || "-",
        rec.logout_time || "-",
        total,
        dayType,
        (rec.status || "-").toUpperCase(),
      ];
      row.forEach((val, ci) => {
        const cell = ws.getCell(idx + 3, startCol + ci);
        cell.value = val;
        cell.alignment = centerAlign;

        if (ci === 7 && val === "PRESENT") {
          cell.font = { bold: true, color: { argb: "FF2E7D32" } };
        }
        if (ci === 6) {
          if (val === "Half Day") cell.font = { bold: true, color: { argb: "FFE65100" } };
          else if (val === "Full Day") cell.font = { bold: true, color: { argb: "FF1565C0" } };
        }
      });
    });
  }

  writeRows(staffRecords, 1);
  writeRows(studentRecords, 10);

  // Summary
  const summaryRow = Math.max(staffRecords.length, studentRecords.length) + 3;
  ws.getCell(summaryRow, 1).value = `Total Staff Present: ${staffRecords.length}`;
  ws.getCell(summaryRow, 1).font = { bold: true, color: { argb: "FF1565C0" } };
  ws.getCell(summaryRow, 10).value = `Total Students Present: ${studentRecords.length}`;
  ws.getCell(summaryRow, 10).font = { bold: true, color: { argb: "FF2E7D32" } };

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance_${date}.xlsx"`,
    },
  });
}
