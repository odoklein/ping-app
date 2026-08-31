"use client";

import { useMemo } from "react";
import { Diamond, CalendarX } from "lucide-react";
import { buildWeekDays, toLocalDateKey, groupTasksByDate, groupMilestonesByDate } from "../_lib/calendar-utils";
import type { CalendarTask, CalendarMilestone } from "../_lib/types";

interface WeekViewProps {
  calendarDate: Date;
  tasks: CalendarTask[];
  milestones: CalendarMilestone[];
  onDayClick: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export function WeekView({ calendarDate, tasks, milestones, onDayClick }: WeekViewProps) {
  const days = useMemo(() => buildWeekDays(calendarDate), [calendarDate]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const milestonesByDate = useMemo(() => groupMilestonesByDate(milestones), [milestones]);
  const todayKey = toLocalDateKey(new Date());

  if (tasks.length === 0 && milestones.length === 0) {
    return (
      <div className="cal-week" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="cal-empty">
          <div className="cal-empty-icon"><CalendarX size={26} /></div>
          <div className="cal-empty-title">Semaine libre</div>
          <div className="cal-empty-text">Aucune tâche prévue cette semaine</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-week">
      {/* All-day row */}
      <div className="cal-week-allday">
        <div className="cal-week-allday-label">Journée</div>
        {days.map((d) => {
          const key = toLocalDateKey(d);
          const dayTasks = (tasksByDate.get(key) || []).filter((t) => !hasTime(t));
          const dayMilestones = milestonesByDate.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              onClick={() => onDayClick(d)}
              style={{
                flex: 1, minWidth: 120, borderLeft: "1px solid var(--elan-line)",
                padding: "4px 6px", minHeight: 36, cursor: "pointer",
                background: isToday ? "rgba(12, 59, 56, 0.04)" : "transparent",
              }}
            >
              {dayMilestones.map((m) => (
                <div key={m.id} className="cal-milestone-pill" style={{ background: `${m.project.color}14`, color: m.project.color, marginBottom: 2, fontSize: 10 }}>
                  <Diamond size={8} style={{ flexShrink: 0 }} /> <span className="cal-pill-text">{m.title}</span>
                </div>
              ))}
              {dayTasks.slice(0, 2).map((t) => (
                <div key={t.id} className="cal-pill" style={{ borderLeftColor: t.project.color, fontSize: 10, marginBottom: 1 }}>
                  <span className="cal-pill-text">{t.title}</span>
                </div>
              ))}
              {dayTasks.length > 2 && <div className="cal-more" style={{ fontSize: 9 }}>+{dayTasks.length - 2}</div>}
            </div>
          );
        })}
      </div>

      {/* Day headers */}
      <div className="cal-week-headers">
        <div className="cal-week-header-spacer" />
        {days.map((d) => {
          const key = toLocalDateKey(d);
          const isToday = key === todayKey;
          return (
            <div key={key} className={`cal-week-header-day ${isToday ? "cal-week-header-today" : ""}`}
              style={{ fontWeight: isToday ? 700 : 400, color: isToday ? "var(--elan-petrol)" : "var(--elan-ink-soft)" }}
            >
              {d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="cal-week-grid">
        <div className="cal-week-hours">
          {HOURS.map((h) => (
            <div key={h} className="cal-week-hour-label">{h}:00</div>
          ))}
        </div>
        {days.map((d) => {
          const key = toLocalDateKey(d);
          const dayTasks = (tasksByDate.get(key) || []).filter((t) => hasTime(t));
          const isToday = key === todayKey;
          return (
            <div key={key} className={`cal-week-col ${isToday ? "cal-week-col-today" : ""}`}>
              {HOURS.map((h) => <div key={h} className="cal-week-hour-row" />)}

              {/* Now line */}
              {isToday && (() => {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                if (h < 8 || h >= 20) return null;
                const top = (h - 8) * 64 + Math.round((m * 64) / 60);
                return (
                  <div style={{
                    position: "absolute", left: 0, right: 0, top,
                    height: 2, background: "var(--elan-amber)", zIndex: 4, opacity: 0.7,
                    boxShadow: "0 0 6px rgba(255, 158, 27, 0.3)",
                  }}>
                    <div style={{
                      position: "absolute", left: -3, top: -3, width: 8, height: 8,
                      borderRadius: "50%", background: "var(--elan-amber)",
                    }} />
                  </div>
                );
              })()}

              {dayTasks.map((t) => {
                const pos = getTaskPosition(t);
                if (!pos) return null;
                return (
                  <div
                    key={t.id}
                    className="cal-week-event"
                    onClick={() => onDayClick(d)}
                    style={{
                      top: pos.top, height: Math.max(pos.height, 28),
                      background: `${t.project.color}14`,
                      borderLeftColor: t.project.color,
                    }}
                  >
                    <div className="cal-week-event-title">{t.title}</div>
                    {t.assignee && <div className="cal-week-event-assignee">{t.assignee.name}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasTime(task: CalendarTask): boolean {
  const d = task.startDate || task.dueDate;
  if (!d) return false;
  const date = new Date(d);
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

function getTaskPosition(task: CalendarTask): { top: number; height: number } | null {
  const startStr = task.startDate || task.dueDate;
  if (!startStr) return null;
  const start = new Date(startStr);
  const hour = start.getHours();
  const min = start.getMinutes();
  if (hour < 8 || hour >= 20) return null;
  const top = (hour - 8) * 64 + Math.round((min * 64) / 60);
  const duration = task.estimatedHours ? task.estimatedHours * 64 : 56;
  return { top, height: Math.min(duration, (20 - hour) * 64) };
}
