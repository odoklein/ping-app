"use client";

import { X, Diamond, Flag, Clock, ArrowRight, CalendarX } from "lucide-react";
import type { CalendarTask, CalendarMilestone } from "../_lib/types";
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "../_lib/calendar-utils";

interface DayDetailPanelProps {
  date: Date;
  tasks: CalendarTask[];
  milestones: CalendarMilestone[];
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "var(--elan-paper-3)",
  IN_PROGRESS: "var(--elan-amber)",
  IN_REVIEW: "var(--elan-petrol)",
  DONE: "var(--elan-success)",
};

export function DayDetailPanel({ date, tasks, milestones, onClose }: DayDetailPanelProps) {
  const dateLabel = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="cal-detail">
      <div className="cal-detail-header">
        <div>
          <h3 className="cal-detail-title">
            {isToday && <span style={{ color: "var(--elan-amber)", marginRight: 6 }}>●</span>}
            {dateLabel}
          </h3>
          <p className="cal-detail-sub">
            {tasks.length} tâche{tasks.length !== 1 ? "s" : ""} · {milestones.length} jalon{milestones.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} className="cal-detail-close">
          <X size={15} />
        </button>
      </div>

      <div className="cal-detail-body">
        {milestones.length > 0 && (
          <div className="cal-detail-section">
            <div className="cal-detail-label">Jalons</div>
            {milestones.map((m) => (
              <div key={m.id} className="cal-detail-milestone">
                <Diamond size={14} style={{ color: m.project.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cal-detail-task-title">{m.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="cal-color-dot" style={{ background: m.project.color, width: 7, height: 7 }} />
                    <span style={{ fontSize: 11, color: "var(--elan-slate)", fontFamily: "var(--font-elan-sans)" }}>
                      {m.project.name}
                    </span>
                  </div>
                </div>
                {m.completedAt && (
                  <span className="cal-detail-tag" style={{ background: "rgba(37, 116, 95, 0.12)", color: "var(--elan-success)" }}>
                    ✓ Terminé
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <div className="cal-detail-section">
            <div className="cal-detail-label">Tâches</div>
            {tasks.map((t) => (
              <div
                key={t.id}
                className="cal-detail-task"
                style={{ borderLeftColor: t.project.color }}
              >
                <div className="cal-detail-task-title">{t.title}</div>
                <div className="cal-detail-task-meta">
                  <span className="cal-detail-tag" style={{
                    background: `${STATUS_COLORS[t.status]}18`,
                    color: STATUS_COLORS[t.status] === "var(--elan-paper-3)" ? "var(--elan-ink-soft)" : STATUS_COLORS[t.status],
                  }}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: PRIORITY_COLORS[t.priority], fontFamily: "var(--font-elan-sans)" }}>
                    <Flag size={9} /> {PRIORITY_LABELS[t.priority]}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="cal-color-dot" style={{ background: t.project.color, width: 7, height: 7 }} />
                    <span style={{ fontSize: 11, color: "var(--elan-slate)", fontFamily: "var(--font-elan-sans)" }}>
                      {t.project.name}
                    </span>
                  </span>
                  {t.assignee && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--elan-ink-soft)", fontFamily: "var(--font-elan-sans)" }}>
                      <ArrowRight size={9} /> {t.assignee.name}
                    </span>
                  )}
                  {t.estimatedHours && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--elan-slate)", fontFamily: "var(--font-elan-mono)" }}>
                      <Clock size={9} /> {t.estimatedHours}h
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && milestones.length === 0 && (
          <div className="cal-empty">
            <div className="cal-empty-icon">
              <CalendarX size={24} />
            </div>
            <div className="cal-empty-title">Journée libre</div>
            <div className="cal-empty-text">Aucune tâche ou jalon prévu pour cette journée</div>
          </div>
        )}
      </div>
    </div>
  );
}
