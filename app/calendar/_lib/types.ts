export type ViewType = "month" | "week" | "timeline" | "availability";

export interface CalendarTask {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  loggedHours: number | null;
  assignee: { id: string; name: string } | null;
  project: { id: string; name: string; color: string };
  milestone: { id: string; title: string } | null;
  labels: string[];
}

export interface CalendarMilestone {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  project: { id: string; name: string; color: string };
}

export interface CalendarProject {
  id: string;
  name: string;
  color: string;
  startDate: string | null;
  endDate: string | null;
}

export interface MemberDailyLoad {
  hours: number;
  taskCount: number;
}

export interface CalendarMember {
  id: string;
  name: string;
  dailyLoad: Record<string, MemberDailyLoad>;
}

export interface CalendarData {
  tasks: CalendarTask[];
  milestones: CalendarMilestone[];
  projects: CalendarProject[];
  members: CalendarMember[];
}

export interface CalendarFilters {
  projectIds: string[];
  memberIds: string[];
  statuses: string[];
}
