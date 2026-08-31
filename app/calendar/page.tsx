"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CalendarHeader } from "./_components/CalendarHeader";
import { FilterBar } from "./_components/FilterBar";
import { MonthView } from "./_components/MonthView";
import { WeekView } from "./_components/WeekView";
import { TimelineView } from "./_components/TimelineView";
import { AvailabilityView } from "./_components/AvailabilityView";
import { DayDetailPanel } from "./_components/DayDetailPanel";
import { getDateRange, toLocalDateKey, groupTasksByDate, groupMilestonesByDate } from "./_lib/calendar-utils";
import type { ViewType, CalendarData, CalendarFilters } from "./_lib/types";

const ROLE_PATHS: Record<string, string> = {
  MANAGER: "/manager",
  SDR: "/sdr",
  DEVELOPER: "/developer",
  BUSINESS_DEVELOPER: "/bd",
  CLIENT: "/client",
  COMMERCIAL: "/commercial",
  BOOKER: "/sdr",
};

export default function CalendarPage() {
  const { data: session } = useSession();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [filters, setFilters] = useState<CalendarFilters>({ projectIds: [], memberIds: [], statuses: [] });
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const backHref = ROLE_PATHS[session?.user?.role || ""] || "/dashboard";
  const dateRange = useMemo(() => getDateRange(calendarDate, view), [calendarDate, view]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });
      if (filters.projectIds.length) params.set("projectIds", filters.projectIds.join(","));
      if (filters.memberIds.length) params.set("memberIds", filters.memberIds.join(","));
      if (filters.statuses.length) params.set("statuses", filters.statuses.join(","));

      const res = await fetch(`/api/calendar/events?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [dateRange, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close detail panel when switching views
  useEffect(() => { setSelectedDay(null); }, [view]);

  const navigate = (direction: -1 | 0 | 1) => {
    setSelectedDay(null);
    if (direction === 0) {
      setCalendarDate(new Date());
      return;
    }
    setCalendarDate((current) => {
      const next = new Date(current);
      if (view === "week") next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const handleDayClick = (date: Date) => {
    const clickedKey = toLocalDateKey(date);
    const selectedKey = selectedDay ? toLocalDateKey(selectedDay) : null;
    if (clickedKey === selectedKey) {
      setSelectedDay(null);
    } else {
      setSelectedDay(date);
    }
  };

  const selectedDayKey = selectedDay ? toLocalDateKey(selectedDay) : null;
  const tasksByDate = useMemo(() => data ? groupTasksByDate(data.tasks) : new Map(), [data]);
  const milestonesByDate = useMemo(() => data ? groupMilestonesByDate(data.milestones) : new Map(), [data]);
  const selectedDayTasks = selectedDayKey ? tasksByDate.get(selectedDayKey) || [] : [];
  const selectedDayMilestones = selectedDayKey ? milestonesByDate.get(selectedDayKey) || [] : [];

  return (
    <>
      <CalendarHeader
        calendarDate={calendarDate}
        view={view}
        onViewChange={setView}
        onNavigate={navigate}
        backHref={backHref}
        data={data}
      >
        <FilterBar
          projects={data?.projects || []}
          members={data?.members || []}
          filters={filters}
          onChange={setFilters}
        />
      </CalendarHeader>

      <div className="cal-body">
        {loading && !initialLoad && (
          <div className="cal-loading">
            <div className="cal-spinner" />
          </div>
        )}

        {initialLoad && (
          <div className="cal-loading" style={{ background: "var(--elan-paper-2)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div className="cal-spinner" />
              <div style={{ fontSize: 13, color: "var(--elan-slate)", fontFamily: "var(--font-elan-sans)", fontWeight: 500 }}>
                Chargement du calendrier...
              </div>
            </div>
          </div>
        )}

        {!initialLoad && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {view === "month" && data && (
              <MonthView
                calendarDate={calendarDate}
                tasks={data.tasks}
                milestones={data.milestones}
                selectedDay={selectedDay}
                onDayClick={handleDayClick}
              />
            )}
            {view === "week" && data && (
              <WeekView
                calendarDate={calendarDate}
                tasks={data.tasks}
                milestones={data.milestones}
                onDayClick={handleDayClick}
              />
            )}
            {view === "timeline" && data && (
              <TimelineView
                calendarDate={calendarDate}
                tasks={data.tasks}
                milestones={data.milestones}
                projects={data.projects}
                dateRange={dateRange}
              />
            )}
            {view === "availability" && data && (
              <AvailabilityView
                calendarDate={calendarDate}
                members={data.members}
                dateRange={dateRange}
              />
            )}
          </div>
        )}

        {selectedDay && !initialLoad && (
          <DayDetailPanel
            date={selectedDay}
            tasks={selectedDayTasks}
            milestones={selectedDayMilestones}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>
    </>
  );
}
