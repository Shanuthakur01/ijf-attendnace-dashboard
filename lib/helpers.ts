export interface AttendanceRecord {
  name: string;
  date: string;
  login_time?: string;
  logout_time?: string;
  status?: string;
}

export function calculateHours(login: string, logout: string): string {
  try {
    const parseTime = (t: string) => {
      const parts = t.split(":");
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2] || "0");
    };
    let diff = parseTime(logout) - parseTime(login);
    if (diff < 0) diff += 86400;
    if (diff < 60) return "--";
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}h ${minutes}m`;
  } catch {
    return "--";
  }
}

export function parseHours(hrsStr: string): { h: number; m: number } {
  try {
    const parts = hrsStr.replace("h", "").replace("m", "").trim().split(/\s+/);
    return { h: parseInt(parts[0]) || 0, m: parseInt(parts[1]) || 0 };
  } catch {
    return { h: 0, m: 0 };
  }
}

const FULL_DAY_MINUTES = 8 * 60 + 30;

export function getDayType(totalHoursStr: string): string {
  if (totalHoursStr === "--") return "--";
  const { h, m } = parseHours(totalHoursStr);
  const worked = h * 60 + m;
  if (worked === 0) return "--";
  return worked >= FULL_DAY_MINUTES ? "Full Day" : "Half Day";
}

export function getMonthDates(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let d = 1; d <= today.getDate(); d++) {
    const dt = new Date(today.getFullYear(), today.getMonth(), d);
    dates.push(dt.toISOString().split("T")[0]);
  }
  return dates;
}

export function isStudent(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("(student)") ||
    (lower.includes("(yellow zone)") && !lower.includes("staff"))
  );
}

export function getInitials(name: string): string {
  return name
    .replace(/\(student\)/gi, "")
    .replace(/\(yellow zone\)/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
