"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, X, Check } from "lucide-react";
import type { CalendarProject, CalendarMember, CalendarFilters } from "../_lib/types";
import { STATUS_LABELS } from "../_lib/calendar-utils";

interface FilterBarProps {
  projects: CalendarProject[];
  members: CalendarMember[];
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
}

export function FilterBar({ projects, members, filters, onChange }: FilterBarProps) {
  const activeCount = filters.projectIds.length + filters.memberIds.length + filters.statuses.length;

  return (
    <div className="cal-filters">
      <MultiSelect
        label="Projets"
        options={projects.map((p) => ({ value: p.id, label: p.name, color: p.color }))}
        selected={filters.projectIds}
        onSelectedChange={(v) => onChange({ ...filters, projectIds: v })}
      />
      <MultiSelect
        label="Membres"
        options={members.map((m) => ({ value: m.id, label: m.name }))}
        selected={filters.memberIds}
        onSelectedChange={(v) => onChange({ ...filters, memberIds: v })}
      />
      <MultiSelect
        label="Statut"
        options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        selected={filters.statuses}
        onSelectedChange={(v) => onChange({ ...filters, statuses: v })}
      />
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onChange({ projectIds: [], memberIds: [], statuses: [] })}
          className="cal-filter-clear"
        >
          <X size={13} /> Effacer ({activeCount})
        </button>
      )}
    </div>
  );
}

interface MultiSelectProps {
  label: string;
  options: { value: string; label: string; color?: string }[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}

function MultiSelect({ label, options, selected, onSelectedChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value: string) => {
    onSelectedChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`cal-filter-btn ${selected.length > 0 ? "cal-filter-btn-active" : ""}`}
      >
        <Filter size={12} />
        {label}
        {selected.length > 0 && (
          <span className="cal-filter-badge">{selected.length}</span>
        )}
      </button>
      {open && (
        <div className="cal-dropdown">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`cal-dropdown-item ${isChecked ? "cal-dropdown-item-active" : ""}`}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                  border: isChecked ? "none" : "1.5px solid var(--elan-line-strong)",
                  background: isChecked ? "var(--elan-petrol)" : "transparent",
                  color: "#fff", flexShrink: 0, transition: "all 0.15s",
                }}>
                  {isChecked && <Check size={11} strokeWidth={3} />}
                </span>
                {opt.color && <span className="cal-color-dot" style={{ background: opt.color }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <div style={{ padding: "12px 10px", fontSize: 13, color: "var(--elan-slate)" }}>Aucun élément</div>
          )}
        </div>
      )}
    </div>
  );
}
