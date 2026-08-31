"use client";

import { useMemo } from "react";
import { Diamond, CalendarX } from "lucide-react";
import { buildCalendarDays, toLocalDateKey, groupTasksByDate, groupMilestonesByDate } from "../_lib/calendar-utils";
import type { CalendarTask, CalendarMilestone } from "../_lib/types";

interface MonthViewProps {
  calendarDate: Date;
  tasks: CalendarTask[];
  milestones: CalendarMilestone[];
  selectedDay: Date | null;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STATUS_DOT: Record<string, string> = {
  TODO: "var(--elan-paper-3)",
  IN_PROGRESS: "var(--elan-amber)",
  IN_REVIEW: "var(--elan-petrol)",
  DONE: "var(--elan-success)",
};

export function MonthView({ calendarDate, tasks, milestones, selectedDay, onDayClick }: MonthViewProps) {
  const calendarDays = useMemo(() => buildCalendarDays(calendarDate), [calendarDate]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const milestonesByDate = useMemo(() => groupMilestonesByDate(milestones), [milestones]);
  const todayKey = toLocalDateKey(new Date());
  const selectedKey = selectedDay ? toLocalDateKey(selectedDay) : null;

  if (tasks.length === 0 && milestones.length === 0) {
    return (
      <div className="cal-month">
        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="cal-empty">
            <div className="cal-empty-icon"><CalendarX size={26} /></div>
            <div className="cal-empty-title">Aucune tâche ce mois</div>
            <div className="cal-empty-text">Créez des tâches avec des dates dans vos projets pour les voir ici</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-month">
      <div className="cal-weekdays">
        {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
      </div>
      <div className="cal-grid">
        {calendarDays.map(({ date, inMonth }) => {
          const key = toLocalDateKey(date);
          const dayTasks = tasksByDate.get(key) || [];
          const dayMilestones = milestonesByDate.get(key) || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const total = dayTasks.length + dayMilestones.length;

          let cls = "cal-day";
          if (!inMonth) cls += " cal-day-outside";
          if (isToday) cls += " cal-day-today";
          if (isSelected) cls += " cal-day-selected";

          return (
            <div key={key} className={cls} onClick={() => onDayClick(date)}>
              <div className="cal-day-num">
                <span className="cal-day-num-text">{date.getDate()}</span>
                {total > 3 && <span className="cal-day-count">{total}</span>}
              </div>
              <div className="cal-day-events">
                {dayMilestones.slice(0, 1).map((m) => (
                  <div key={m.id} className="cal-milestone-pill" style={{ background: `${m.project.color}14`, color: m.project.color }}>
                    <Diamond size={9} style={{ flexShrink: 0 }} />
                    <span className="cal-pill-text">{m.title}</span>
                  </div>
                ))}
                {dayTasks.slice(0, 3 - Math.min(dayMilestones.length, 1)).map((t) => (
                  <div key={t.id} className="cal-pill" style={{ borderLeftColor: t.project.color }}>
                    <span className="cal-pill-status" style={{ background: STATUS_DOT[t.status] || STATUS_DOT.TODO }} />
                    <span className="cal-pill-text">{t.title}</span>
                  </div>
                ))}
                {total > 3 && (
                  <div className="cal-more">+ {total - 3} autre{total - 3 > 1 ? "s" : ""}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
