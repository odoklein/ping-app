"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Meeting } from "../_types";
import { WeekView } from "./WeekView";
import { buildCalendarDays, buildCalendarMeetings } from "../_lib/calendar-utils";
import { contactName, meetingStatus } from "../_lib/formatters";

interface CalendarViewProps {
  meetings: Meeting[];
  openPanel: (meeting: Meeting) => void;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarView({ meetings, openPanel }: CalendarViewProps) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const calendarMeetings = useMemo(() => buildCalendarMeetings(meetings), [meetings]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarDate), [calendarDate]);
  const today = toLocalDateKey(new Date());

  const move = (direction: -1 | 1) => {
    setCalendarDate((current) => {
      const next = new Date(current);
      if (calendarView === "week") next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  return (
    <section className="rdv-calendar rdv-scrollbar">
      <header className="rdv-calendar-header">
        <div className="rdv-calendar-heading">
          <div><CalendarDays size={18} /></div>
          <div>
            <h2>{calendarDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
            <p>{meetings.length} rendez-vous visibles</p>
          </div>
        </div>

        <div className="rdv-calendar-nav">
          <button type="button" onClick={() => move(-1)} aria-label="Période précédente"><ChevronLeft size={16} /></button>
          <button type="button" className="rdv-calendar-today" onClick={() => setCalendarDate(new Date())}>Aujourd’hui</button>
          <button type="button" onClick={() => move(1)} aria-label="Période suivante"><ChevronRight size={16} /></button>
        </div>

        <div className="rdv-segmented" aria-label="Échelle du calendrier">
          <button type="button" className={calendarView === "month" ? "is-active" : ""} onClick={() => setCalendarView("month")}>Mois</button>
          <button type="button" className={calendarView === "week" ? "is-active" : ""} onClick={() => setCalendarView("week")}>Semaine</button>
        </div>
      </header>

      {calendarView === "month" ? (
        <div className="rdv-month-shell">
          <div className="rdv-month-weekdays" aria-hidden>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="rdv-month-grid">
            {calendarDays.map(({ date, inMonth }) => {
              const key = toLocalDateKey(date);
              const dayMeetings = calendarMeetings.get(key) || [];
              const isToday = key === today;
              return (
                <div key={key} className={`rdv-month-day ${!inMonth ? "is-outside" : ""} ${isToday ? "is-today" : ""}`}>
                  <div className="rdv-month-day-number">
                    <span>{date.getDate()}</span>
                    {dayMeetings.length > 0 && <small>{dayMeetings.length}</small>}
                  </div>
                  <div className="rdv-month-events">
                    {dayMeetings.slice(0, 3).map((meeting) => (
                      <button
                        type="button"
                        key={meeting.id}
                        className={`is-${meetingStatus(meeting)}`}
                        onClick={() => openPanel(meeting)}
                        title={`${contactName(meeting.contact)} ${meeting.company?.name || ""}`}
                      >
                        <time>{meeting.callbackDate ? new Date(meeting.callbackDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}</time>
                        <span>{contactName(meeting.contact)}</span>
                      </button>
                    ))}
                    {dayMeetings.length > 3 && <small className="rdv-more-events">+ {dayMeetings.length - 3} autre{dayMeetings.length - 3 > 1 ? "s" : ""}</small>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rdv-week-shell rdv-scrollbar">
          <WeekView calendarDate={calendarDate} calendarMeetings={calendarMeetings} openPanel={openPanel} />
        </div>
      )}
    </section>
  );
}
