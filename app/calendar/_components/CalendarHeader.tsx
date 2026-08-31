"use client";

import { ChevronLeft, ChevronRight, ArrowLeft, Calendar, ListTodo, GanttChart, Users } from "lucide-react";
import type { ViewType, CalendarData } from "../_lib/types";

interface CalendarHeaderProps {
  calendarDate: Date;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onNavigate: (direction: -1 | 0 | 1) => void;
  backHref: string;
  data: CalendarData | null;
  children?: React.ReactNode;
}

const VIEW_TABS: { value: ViewType; label: string; icon: typeof Calendar }[] = [
  { value: "month", label: "Mois", icon: Calendar },
  { value: "week", label: "Semaine", icon: ListTodo },
  { value: "timeline", label: "Timeline", icon: GanttChart },
  { value: "availability", label: "Équipe", icon: Users },
];

export function CalendarHeader({ calendarDate, view, onViewChange, onNavigate, backHref, data, children }: CalendarHeaderProps) {
  const title = view === "week"
    ? `Semaine du ${calendarDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
    : calendarDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const taskCount = data?.tasks.length || 0;
  const milestoneCount = data?.milestones.length || 0;
  const projectCount = data?.projects.length || 0;

  return (
    <header className="cal-header">
      <a href={backHref} className="cal-back" title="Retour à l'application">
        <ArrowLeft size={17} />
      </a>

      <div className="cal-nav">
        <button type="button" onClick={() => onNavigate(-1)} className="cal-nav-btn" aria-label="Précédent">
          <ChevronLeft size={15} />
        </button>
        <button type="button" onClick={() => onNavigate(0)} className="cal-nav-btn cal-today-btn">
          Aujourd'hui
        </button>
        <button type="button" onClick={() => onNavigate(1)} className="cal-nav-btn" aria-label="Suivant">
          <ChevronRight size={15} />
        </button>
      </div>

      <div>
        <h1 className="cal-title">{title}</h1>
        {data && (
          <p className="cal-title-sub">
            {taskCount} tâche{taskCount !== 1 ? "s" : ""} · {milestoneCount} jalon{milestoneCount !== 1 ? "s" : ""} · {projectCount} projet{projectCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="cal-spacer" />

      <div className="cal-stats">
        {data && data.tasks.length > 0 && (
          <>
            <div className="cal-stat">
              <span className="cal-stat-dot" style={{ background: "var(--elan-amber)" }} />
              <span className="cal-stat-val">{data.tasks.filter(t => t.status === "IN_PROGRESS").length}</span>
              en cours
            </div>
            <div className="cal-stat">
              <span className="cal-stat-dot" style={{ background: "var(--elan-danger)" }} />
              <span className="cal-stat-val">{data.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length}</span>
              en retard
            </div>
            <div className="cal-stat">
              <span className="cal-stat-dot" style={{ background: "var(--elan-success)" }} />
              <span className="cal-stat-val">{data.tasks.filter(t => t.status === "DONE").length}</span>
              terminé{data.tasks.filter(t => t.status === "DONE").length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>

      <div className="cal-tabs">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onViewChange(tab.value)}
              className={`cal-tab ${view === tab.value ? "cal-tab-active" : ""}`}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon size={13} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {children}
    </header>
  );
}
