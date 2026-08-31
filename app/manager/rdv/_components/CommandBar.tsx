"use client";

import { memo, useState } from "react";
import type { Meeting, ViewMode, DatePreset } from "../_types";
import type { MeetingFiltersState } from "../_hooks/useMeetingFilters";
import { SearchInput } from "./shared/SearchInput";
import { downloadCSV } from "../_lib/csv-export";
import {
  CalendarDays,
  Download,
  List,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { AddRdvModal } from "./modals/AddRdvModal";
import { ImportRdvModal } from "./modals/ImportRdvModal";

interface CommandBarProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  filters: MeetingFiltersState;
  meetings: Meeting[];
  totalCount: number;
  onOpenFilters: () => void;
  onRefresh?: () => void;
  onOpenSyncAudios?: () => void;
}

const DATE_PRESETS: Array<[DatePreset, string]> = [
  ["today", "Aujourd’hui"],
  ["7days", "7 jours"],
  ["30days", "Ce mois"],
  ["3months", "3 mois"],
];

export const CommandBar = memo(function CommandBar({
  view,
  setView,
  filters,
  meetings,
  totalCount,
  onOpenFilters,
  onRefresh,
  onOpenSyncAudios,
}: CommandBarProps) {
  const {
    search,
    setSearch,
    datePreset,
    setDatePreset,
    filterSummary,
    activeFilterCount,
    clearAllFilters,
  } = filters;
  const [addRdvOpen, setAddRdvOpen] = useState(false);
  const [importRdvOpen, setImportRdvOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  return (
    <header className="rdv-command-shell">
      <div className="rdv-command-main">
        <div className="rdv-title-block">
          <h1>Rendez-vous</h1>
          <p>{totalCount.toLocaleString("fr-FR")} rendez-vous dans la période</p>
        </div>

        <SearchInput initialSearch={search} onDebouncedSearch={setSearch} />

        <div className="rdv-primary-actions">
          <button
            type="button"
            className="rdv-icon-button"
            onClick={onRefresh}
            title="Actualiser"
            aria-label="Actualiser les rendez-vous"
          >
            <RefreshCw size={16} />
          </button>
          <button type="button" className="rdv-btn rdv-btn-primary" onClick={() => setAddRdvOpen(true)}>
            <Plus size={16} />
            Nouveau RDV
          </button>
          <div className="rdv-action-menu-wrap">
            <button
              type="button"
              className="rdv-icon-button"
              aria-label="Plus d’actions"
              aria-expanded={actionMenuOpen}
              onClick={() => setActionMenuOpen((open) => !open)}
            >
              <MoreHorizontal size={18} />
            </button>
            {actionMenuOpen && (
              <div className="rdv-action-menu">
                <button type="button" onClick={() => { setImportRdvOpen(true); setActionMenuOpen(false); }}>
                  <Upload size={15} /> Importer des RDV
                </button>
                <button type="button" onClick={() => { onOpenSyncAudios?.(); setActionMenuOpen(false); }}>
                  <Mic size={15} /> Synchroniser les audios
                </button>
                <button type="button" onClick={() => { downloadCSV(meetings, filterSummary); setActionMenuOpen(false); }}>
                  <Download size={15} /> Exporter la sélection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rdv-command-toolbar">
        <div className="rdv-segmented" aria-label="Mode d’affichage">
          <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")}>
            <List size={15} /> Agenda
          </button>
          <button type="button" className={view === "calendar" ? "is-active" : ""} onClick={() => setView("calendar")}>
            <CalendarDays size={15} /> Calendrier
          </button>
        </div>

        <div className="rdv-date-presets" aria-label="Période">
          {DATE_PRESETS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={datePreset === key ? "is-active" : ""}
              onClick={() => setDatePreset(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rdv-toolbar-spacer" />

        {activeFilterCount > 0 && (
          <button type="button" className="rdv-clear-filter" onClick={clearAllFilters}>
            <X size={13} /> Réinitialiser
          </button>
        )}
        <button type="button" className="rdv-filter-trigger" onClick={onOpenFilters}>
          <SlidersHorizontal size={15} />
          Filtres
          {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        </button>
      </div>

      <AddRdvModal
        isOpen={addRdvOpen}
        onClose={() => setAddRdvOpen(false)}
        onSuccess={() => onRefresh?.()}
      />
      <ImportRdvModal
        isOpen={importRdvOpen}
        onClose={() => setImportRdvOpen(false)}
        onSuccess={() => onRefresh?.()}
      />
    </header>
  );
});
