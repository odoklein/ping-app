import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import {
  DEFAULT_TASK_REMINDER_TEMPLATE_HTML,
  DEFAULT_TASK_REMINDER_TEMPLATE_SUBJECT,
} from "@/lib/email/templates/task-reminder";

type ReminderTask = {
  id: string;
  title: string;
  dueDate: Date;
  priority: string;
  project: { id: string; name: string };
};

function parisDateKey(value: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function isParisTaskReminderSlot(value: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  return weekday !== "Sat" && weekday !== "Sun" && hour === "08";
}

function addDays(key: string, count: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + count));
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character] || character));
}

function replaceVariables(value: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (result, [key, replacement]) => result.replaceAll(`{{${key}}}`, replacement),
    value,
  );
}

function taskRow(task: ReminderTask, label: string, tasksUrl: string): string {
  const priority = task.priority === "URGENT" ? "Urgente" : task.priority === "HIGH" ? "Haute priorité" : "";
  return `<tr><td style="padding:12px 0;border-bottom:1px solid #e7eeeb"><a href="${tasksUrl}" style="color:#1F4D47;font-weight:700;text-decoration:none">${escapeHtml(task.title)}</a><br><span style="font-size:12px;color:#65736f">${escapeHtml(task.project.name)} · ${label}${priority ? ` · ${priority}` : ""}</span></td></tr>`;
}

/** Sends at most one daily digest per user. Safe to call repeatedly from a cron job. */
export async function sendTaskReminderDigests(now = new Date()) {
  const today = parisDateKey(now);
  const upcomingLimit = addDays(today, 3);
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { not: null, lte: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) },
      status: { not: "DONE" },
      assignee: { is: { isActive: true } },
      project: { is: { status: "ACTIVE" } },
    },
    select: {
      id: true, title: true, dueDate: true, priority: true,
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const template = await prisma.systemEmailTemplate.findUnique({ where: { key: "task_reminder_digest" } });
  const subjectTemplate = template?.subject || DEFAULT_TASK_REMINDER_TEMPLATE_SUBJECT;
  const bodyTemplate = template?.bodyHtml || DEFAULT_TASK_REMINDER_TEMPLATE_HTML;
  const appUrl = (process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
  const grouped = new Map<string, { id: string; name: string; email: string; tasks: ReminderTask[] }>();

  for (const task of tasks) {
    if (!task.assignee || !task.dueDate) continue;
    const dueKey = parisDateKey(task.dueDate);
    if (dueKey > upcomingLimit) continue;
    const user = grouped.get(task.assignee.id) || { ...task.assignee, tasks: [] };
    user.tasks.push({ ...task, dueDate: task.dueDate });
    grouped.set(task.assignee.id, user);
  }

  let sent = 0;
  let skipped = 0;
  for (const user of grouped.values()) {
    const overdue = user.tasks.filter((task) => parisDateKey(task.dueDate) < today);
    const dueToday = user.tasks.filter((task) => parisDateKey(task.dueDate) === today);
    const upcoming = user.tasks.filter((task) => {
      const key = parisDateKey(task.dueDate);
      return key > today && key <= upcomingLimit;
    });
    if (!overdue.length && !dueToday.length && !upcoming.length) continue;

    const reminderKey = `task-digest:${user.id}:${today}`;
    try {
      await prisma.taskReminderDelivery.create({ data: { userId: user.id, reminderKey, kind: "DAILY_DIGEST" } });
    } catch {
      skipped++;
      continue;
    }

    const tasksUrl = `${appUrl}/manager/projects`;
    const rows = [
      ...overdue.map((task) => taskRow(task, `En retard depuis le ${parisDateKey(task.dueDate)}`, tasksUrl)),
      ...dueToday.map((task) => taskRow(task, "À faire aujourd'hui", tasksUrl)),
      ...upcoming.map((task) => taskRow(task, `Prévue le ${parisDateKey(task.dueDate)}`, tasksUrl)),
    ].join("");
    const variables = {
      userName: escapeHtml(user.name), digestDate: today, overdueCount: String(overdue.length),
      dueTodayCount: String(dueToday.length), upcomingCount: String(upcoming.length), taskRows: `<table role="presentation" style="width:100%;border-collapse:collapse">${rows}</table>`, tasksUrl,
    };
    const ok = await sendTransactionalEmail({
      to: user.email,
      subject: replaceVariables(subjectTemplate, variables),
      html: replaceVariables(bodyTemplate, variables),
    });
    if (ok) {
      await prisma.taskReminderDelivery.update({ where: { reminderKey }, data: { status: "SENT", sentAt: new Date() } });
      sent++;
    } else {
      await prisma.taskReminderDelivery.delete({ where: { reminderKey } });
    }
  }
  return { checked: tasks.length, recipients: grouped.size, sent, skipped };
}
