"use client";

import { useMemo } from "react";
import { Diamond, GanttChart } from "lucide-react";
import { toLocalDateKey, getDaysInRange } from "../_lib/calendar-utils";
import type { CalendarTask, CalendarMilestone, CalendarProject } from "../_lib/types";

interface TimelineViewProps {
  calendarDate: Date;
  tasks: CalendarTask[];
  milestones: CalendarMilestone[];
  projects: CalendarProject[];
  dateRange: { from: Date; to: Date };
}

export function TimelineView({ calendarDate, tasks, milestones, projects, dateRange }: TimelineViewProps) {
  const days = useMemo(() => getDaysInRange(dateRange.from, dateRange.to), [dateRange]);
  const todayKey = toLocalDateKey(new Date());
  const month = calendarDate.getMonth();

  const grouped = useMemo(() => {
    const map = new Map<string, { project: CalendarProject; tasks: CalendarTask[]; milestones: CalendarMilestone[] }>();
    for (const p of projects) map.set(p.id, { project: p, tasks: [], milestones: [] });
    for (const t of tasks) map.get(t.project.id)?.tasks.push(t);
    for (const m of milestones) map.get(m.project.id)?.milestones.push(m);
    return Array.from(map.values()).filter((g) => g.tasks.length > 0 || g.milestones.length > 0);
  }, [tasks, milestones, projects]);

  const dayWidth = 38;
  const labelWidth = 240;
  const totalWidth = labelWidth + days.length * dayWidth;

  const dateToCol = (dateStr: string): number => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const fromNorm = new Date(dateRange.from);
    fromNorm.setHours(0, 0, 0, 0);
    return Math.max(0, Math.min(days.length - 1, Math.round((d.getTime() - fromNorm.getTime()) / 86400000)));
  };

  const todayCol = days.findIndex(d => toLocalDateKey(d) === todayKey);

  if (grouped.length === 0) {
    return (
      <div className="cal-timeline" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="cal-empty">
          <div className="cal-empty-icon"><GanttChart size={26} /></div>
          <div className="cal-empty-title">Aucune tâche à afficher</div>
          <div className="cal-empty-text">Les tâches avec des dates apparaîtront ici sous forme de barres horizontales</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-timeline">
      <div style={{ minWidth: totalWidth, position: "relative" }}>
        {/* Today line */}
        {todayCol >= 0 && (
          <div className="cal-tl-today-line" style={{ left: labelWidth + todayCol * dayWidth + dayWidth / 2 }} />
        )}

        {/* Day headers */}
        <div className="cal-tl-header">
          <div className="cal-tl-label-col" style={{ width: labelWidth }}>Projet / Tâche</div>
          <div style={{ display: "flex" }}>
            {days.map((d) => {
              const key = toLocalDateKey(d);
              const isToday = key === todayKey;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isInMonth = d.getMonth() === month;
              return (
                <div key={key} className={`cal-tl-day-header ${isToday ? "cal-tl-day-header-today" : ""} ${isWeekend ? "cal-tl-day-header-weekend" : ""}`}
                  style={{
                    width: dayWidth, opacity: isInMonth ? 1 : 0.35,
                    color: isToday ? "var(--elan-petrol)" : isWeekend ? "var(--elan-slate)" : "var(--elan-ink-soft)",
                    fontWeight: isToday ? 700 : 400,
                    borderRight: d.getDay() === 0 ? "1px solid var(--elan-line)" : "none",
                  }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-elan-mono)" }}>
                    {d.toLocaleDateString("fr-FR", { weekday: "narrow" })}
                  </div>
                  <div style={{ fontWeight: isToday ? 700 : 500, fontSize: 11 }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project groups */}
        {grouped.map(({ project, tasks: pTasks, milestones: pMilestones }) => (
          <div key={project.id}>
            {/* Project header */}
            <div className="cal-tl-project-row">
              <div className="cal-tl-label cal-tl-label-project" style={{ width: labelWidth }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: project.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-elan-display)", color: "var(--elan-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
                  {project.name}
                </span>
                <span style={{ fontSize: 10, color: "var(--elan-slate)", fontFamily: "var(--font-elan-mono)", background: "var(--elan-paper-2)", padding: "0 5px", borderRadius: 4, lineHeight: "18px", fontWeight: 600, flexShrink: 0 }}>
                  {pTasks.length}
                </span>
              </div>
              <div style={{ display: "flex", position: "relative", height: 38 }}>
                {days.map((d) => {
                  const key = toLocalDateKey(d);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return <div key={key} className={`cal-tl-day-cell ${isWeekend ? "cal-tl-day-weekend" : ""}`} style={{ width: dayWidth, borderRight: d.getDay() === 0 ? "1px solid var(--elan-line)" : "none" }} />;
                })}
                {project.startDate && project.endDate && (() => {
                  const s = dateToCol(project.startDate);
                  const e = dateToCol(project.endDate);
                  return <div style={{ position: "absolute", top: 15, height: 8, borderRadius: 4, background: `${project.color}25`, left: s * dayWidth, width: (e - s + 1) * dayWidth }} />;
                })()}
              </div>
            </div>

            {/* Task rows */}
            {pTasks.map((t) => {
              const startStr = t.startDate || t.dueDate;
              const endStr = t.dueDate || t.startDate;
              const isDone = t.status === "DONE";
              return (
                <div key={t.id} className="cal-tl-task-row">
                  <div className="cal-tl-label cal-tl-label-task" style={{ width: labelWidth }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: isDone ? "var(--elan-success)" : t.status === "IN_PROGRESS" ? "var(--elan-amber)" : "var(--elan-paper-3)",
                    }} />
                    <span style={{ fontSize: 12, fontFamily: "var(--font-elan-sans)", color: isDone ? "var(--elan-slate)" : "var(--elan-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: isDone ? "line-through" : "none" }}>
                      {t.title}
                    </span>
                    {t.assignee && (
                      <span style={{
                        width: 22, height: 22, borderRadius: 7, background: project.color,
                        color: "#fff", fontSize: 10, fontWeight: 700, display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-elan-sans)",
                      }}>
                        {t.assignee.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", position: "relative", height: 34 }}>
                    {days.map((d) => {
                      const key = toLocalDateKey(d);
                      const isToday = key === todayKey;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return <div key={key} className={`cal-tl-day-cell ${isToday ? "cal-tl-day-today" : ""} ${isWeekend ? "cal-tl-day-weekend" : ""}`} style={{ width: dayWidth, borderRight: d.getDay() === 0 ? "1px solid var(--elan-line)" : "none" }} />;
                    })}
                    {startStr && endStr && (() => {
                      const s = dateToCol(startStr);
                      const e = dateToCol(endStr);
                      const w = Math.max((e - s + 1) * dayWidth, dayWidth);
                      return (
                        <div className="cal-tl-bar" style={{
                          top: 9, height: 16,
                          background: project.color, opacity: isDone ? 0.45 : 0.85,
                          left: s * dayWidth + 2, width: w - 4,
                        }}>
                          {w > 90 ? t.title : ""}
                        </div>
                      );
                    })()}
                    {startStr && !endStr && (() => {
                      const col = dateToCol(startStr);
                      return <div style={{ position: "absolute", top: 12, left: col * dayWidth + dayWidth / 2 - 5, width: 10, height: 10, borderRadius: "50%", background: project.color, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />;
                    })()}
                  </div>
                </div>
              );
            })}

            {/* Milestone rows */}
            {pMilestones.map((m) => (
              <div key={m.id} className="cal-tl-task-row">
                <div className="cal-tl-label cal-tl-label-task" style={{ width: labelWidth }}>
                  <Diamond size={10} style={{ color: project.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-elan-sans)", color: project.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.title}
                  </span>
                </div>
                <div style={{ display: "flex", position: "relative", height: 34 }}>
                  {days.map((d) => {
                    const key = toLocalDateKey(d);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return <div key={key} className={`cal-tl-day-cell ${isWeekend ? "cal-tl-day-weekend" : ""}`} style={{ width: dayWidth, borderRight: d.getDay() === 0 ? "1px solid var(--elan-line)" : "none" }} />;
                  })}
                  {m.dueDate && (() => {
                    const col = dateToCol(m.dueDate);
                    return <div className="cal-tl-diamond" style={{
                      top: 9, left: col * dayWidth + dayWidth / 2 - 8, width: 16, height: 16,
                      background: m.completedAt ? "var(--elan-success)" : project.color,
                    }} />;
                  })()}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
