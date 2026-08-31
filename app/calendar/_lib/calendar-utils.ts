import type { CalendarTask, CalendarMilestone, CalendarMember, MemberDailyLoad } from "./types";

export { buildCalendarDays, buildWeekDays } from "@/app/manager/rdv/_lib/calendar-utils";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupTasksByDate(tasks: CalendarTask[]): Map<string, CalendarTask[]> {
  const map = new Map<string, CalendarTask[]>();
  for (const t of tasks) {
    const dateStr = t.dueDate || t.startDate;
    if (!dateStr) continue;
    const key = toLocalDateKey(new Date(dateStr));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

export function groupMilestonesByDate(milestones: CalendarMilestone[]): Map<string, CalendarMilestone[]> {
  const map = new Map<string, CalendarMilestone[]>();
  for (const m of milestones) {
    if (!m.dueDate) continue;
    const key = toLocalDateKey(new Date(m.dueDate));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return map;
}

export function getDateRange(calendarDate: Date, view: "month" | "week" | "timeline" | "availability"): { from: Date; to: Date } {
  if (view === "week") {
    const weekStart = new Date(calendarDate);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - ((day + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { from: weekStart, to: weekEnd };
  }
  // month, timeline, availability: show full month with padding
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const from = new Date(year, month, 1);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = new Date(year, month + 1, 0);
  const remaining = 6 - ((to.getDay() + 6) % 7);
  to.setDate(to.getDate() + remaining);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function getDaysInRange(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function getLoadLevel(hours: number): "available" | "moderate" | "full" | "overloaded" {
  if (hours === 0) return "available";
  if (hours < 6) return "moderate";
  if (hours <= 8) return "full";
  return "overloaded";
}

export const LOAD_COLORS: Record<ReturnType<typeof getLoadLevel>, string> = {
  available: "var(--elan-eucalyptus)",
  moderate: "var(--elan-success)",
  full: "var(--elan-amber)",
  overloaded: "var(--elan-danger)",
};

export const STATUS_LABELS: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  DONE: "Terminé",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "var(--elan-slate)",
  MEDIUM: "var(--elan-amber)",
  HIGH: "var(--elan-amber-deep)",
  URGENT: "var(--elan-danger)",
};
