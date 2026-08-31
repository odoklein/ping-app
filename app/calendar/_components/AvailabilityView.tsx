"use client";

import { useMemo, useState } from "react";
import { Users, CalendarCog } from "lucide-react";
import { toLocalDateKey, getDaysInRange, getLoadLevel, LOAD_COLORS } from "../_lib/calendar-utils";
import type { CalendarMember } from "../_lib/types";
import { AvailabilityEditor } from "@/components/availability/AvailabilityEditor";

interface AvailabilityViewProps {
  calendarDate: Date;
  members: CalendarMember[];
  dateRange: { from: Date; to: Date };
}

const LEGEND: { level: "available" | "moderate" | "full" | "overloaded"; label: string }[] = [
  { level: "available", label: "Libre" },
  { level: "moderate", label: "< 6h" },
  { level: "full", label: "6-8h" },
  { level: "overloaded", label: "> 8h" },
];

export function AvailabilityView({ calendarDate, members, dateRange }: AvailabilityViewProps) {
  const days = useMemo(() => getDaysInRange(dateRange.from, dateRange.to), [dateRange]);
  const todayKey = toLocalDateKey(new Date());
  const month = calendarDate.getMonth();
  const [editorOpen, setEditorOpen] = useState(false);

  const dayWidth = 38;
  const labelWidth = 200;
  const totalWidth = labelWidth + days.length * dayWidth;

  const availabilityBtn = (
    <button
      onClick={() => setEditorOpen(true)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 600, fontFamily: "var(--font-elan-sans)",
        color: "var(--elan-petrol)", background: "var(--elan-eucalyptus)",
        border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer",
      }}
    >
      <CalendarCog size={14} /> Mes disponibilités
    </button>
  );

  if (members.length === 0) {
    return (
      <div className="cal-avail" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div className="cal-empty">
          <div className="cal-empty-icon"><Users size={26} /></div>
          <div className="cal-empty-title">Aucun membre</div>
          <div className="cal-empty-text">Ajoutez des membres à vos projets pour voir leur disponibilité</div>
        </div>
        {availabilityBtn}
        <AvailabilityEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} />
      </div>
    );
  }

  // Summary stats
  const totalHoursThisMonth = members.reduce((acc, m) => {
    return acc + Object.entries(m.dailyLoad)
      .filter(([key]) => { const d = new Date(key); return d.getMonth() === month; })
      .reduce((sum, [, v]) => sum + v.hours, 0);
  }, 0);

  return (
    <div className="cal-avail">
      <div style={{ minWidth: totalWidth }}>
        {/* Day headers */}
        <div className="cal-tl-header">
          <div className="cal-tl-label-col" style={{ width: labelWidth }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span>Membre</span>
              <span style={{ fontFamily: "var(--font-elan-mono)", fontSize: 10, color: "var(--elan-ink-soft)", fontWeight: 700 }}>
                {Math.round(totalHoursThisMonth)}h total
              </span>
            </div>
          </div>
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

        {/* Legend */}
        <div className="cal-avail-legend" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="cal-avail-legend-label">Charge :</span>
            {LEGEND.map(({ level, label }) => (
              <div key={level} className="cal-avail-legend-item">
                <span className="cal-avail-legend-dot" style={{ background: LOAD_COLORS[level], opacity: level === "available" ? 0.4 : 0.75 }} />
                <span className="cal-avail-legend-text">{label}</span>
              </div>
            ))}
          </div>
          {availabilityBtn}
        </div>

        {/* Member rows */}
        {members.map((member) => {
          const memberTotal = Object.values(member.dailyLoad).reduce((s, v) => s + v.hours, 0);
          return (
            <div key={member.id} className="cal-avail-member">
              <div className="cal-tl-label" style={{ width: labelWidth, background: "var(--elan-surface)", gap: 10 }}>
                <span className="cal-avail-avatar">
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cal-avail-name">{member.name}</div>
                  <div style={{ fontSize: 10, color: "var(--elan-slate)", fontFamily: "var(--font-elan-mono)", fontWeight: 600 }}>
                    {Math.round(memberTotal)}h planifiées
                  </div>
                </div>
              </div>
              <div style={{ display: "flex" }}>
                {days.map((d) => {
                  const key = toLocalDateKey(d);
                  const isToday = key === todayKey;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const load = member.dailyLoad[key];
                  const hours = load?.hours || 0;
                  const taskCount = load?.taskCount || 0;
                  const level = isWeekend ? "available" as const : getLoadLevel(hours);

                  return (
                    <div
                      key={key}
                      className="cal-avail-cell"
                      title={isWeekend ? "Week-end" : `${member.name}\n${hours.toFixed(1)}h · ${taskCount} tâche${taskCount !== 1 ? "s" : ""}`}
                      style={{
                        width: dayWidth, height: 48,
                        background: isWeekend ? "rgba(0,0,0,0.025)" : LOAD_COLORS[level],
                        opacity: isWeekend ? 0.5 : (level === "available" ? 0.3 : 0.65),
                        borderRight: d.getDay() === 0 ? "1px solid var(--elan-line)" : "none",
                        borderLeft: isToday ? "2px solid var(--elan-petrol)" : "none",
                        color: level === "overloaded" ? "#fff" : "var(--elan-ink-soft)",
                      }}
                    >
                      {!isWeekend && hours > 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{hours < 10 ? hours.toFixed(1) : Math.round(hours)}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AvailabilityEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
