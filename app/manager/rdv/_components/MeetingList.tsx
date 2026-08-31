"use client";

import { memo, useEffect } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  FileText,
  MessageSquareText,
  Mic,
  RefreshCw,
  X,
} from "lucide-react";
import type { Meeting, SortDir, SortField } from "../_types";
import { confirmationBg, confirmationColor, confirmationLabel, contactName, meetingStatus } from "../_lib/formatters";
import { Skeleton } from "./shared/Skeleton";
import { EmptyState } from "./shared/EmptyState";
import { Avatar } from "./shared/Avatar";

interface MeetingListProps {
  meetings: Meeting[];
  loading: boolean;
  loadingMore: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpen: (meeting: Meeting) => void;
  onLoadMore: () => void;
  updateMeeting: (id: string, data: Record<string, unknown>) => Promise<void>;
  updateLocalMeeting: (id: string, patch: Partial<Meeting>) => void;
  sortBy?: SortField;
  sortDir?: SortDir;
  onSort?: (field: SortField) => void;
}

const SORT_LABELS: Array<{ value: SortField; label: string }> = [
  { value: "callbackDate", label: "Date du RDV" },
  { value: "createdAt", label: "Date de création" },
  { value: "contactName", label: "Contact" },
  { value: "companyName", label: "Entreprise" },
  { value: "sdrName", label: "SDR" },
  { value: "duration", label: "Durée" },
];

function agendaDate(value: string | null) {
  if (!value) return { label: "Date à définir", time: "", proximity: "Planification requise", isNear: false };

  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startDate.getTime() - startToday.getTime()) / 86_400_000);
  const label = dayDiff === 0
    ? "Aujourd’hui"
    : dayDiff === 1
      ? "Demain"
      : dayDiff === -1
        ? "Hier"
        : date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return {
    label,
    time: date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    proximity: dayDiff < 0 ? "Passé" : dayDiff <= 1 ? "Bientôt" : "Planifié",
    isNear: dayDiff >= 0 && dayDiff <= 1,
  };
}

const MeetingRow = memo(function MeetingRow({
  meeting,
  selected,
  onToggleSelect,
  onOpen,
  updateMeeting,
  updateLocalMeeting,
}: {
  meeting: Meeting;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (meeting: Meeting) => void;
  updateMeeting: (id: string, data: Record<string, unknown>) => Promise<void>;
  updateLocalMeeting: (id: string, patch: Partial<Meeting>) => void;
}) {
  const schedule = agendaDate(meeting.callbackDate);
  const name = meeting.contact ? contactName(meeting.contact) : meeting.company?.name ?? "Contact à renseigner";
  const isPending = meeting.confirmationStatus === "PENDING";
  const status = meetingStatus(meeting);

  const confirm = (event: React.MouseEvent) => {
    event.stopPropagation();
    void updateMeeting(meeting.id, { confirmationStatus: "CONFIRMED" });
    updateLocalMeeting(meeting.id, { confirmationStatus: "CONFIRMED", confirmedAt: new Date().toISOString() });
  };

  const cancel = (event: React.MouseEvent) => {
    event.stopPropagation();
    void updateMeeting(meeting.id, { confirmationStatus: "CANCELLED" });
    updateLocalMeeting(meeting.id, { confirmationStatus: "CANCELLED", confirmedAt: null, confirmedById: null });
  };

  return (
    <article
      className={`rdv-agenda-row ${selected ? "is-selected" : ""} ${status === "cancelled" ? "is-cancelled" : ""}`}
      onClick={() => onOpen(meeting)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(meeting);
      }}
      tabIndex={0}
    >
      <div className="rdv-agenda-select" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          className="rdv-checkbox"
          checked={selected}
          aria-label={`Sélectionner le rendez-vous avec ${name}`}
          onChange={() => onToggleSelect(meeting.id)}
        />
      </div>

      <div className="rdv-agenda-time">
        <strong>{schedule.time || schedule.label}</strong>
        <span>{schedule.time ? schedule.label : schedule.proximity}</span>
        {schedule.isNear && <small>{schedule.proximity}</small>}
      </div>

      <div className="rdv-agenda-person">
        <Avatar name={name} size={40} />
        <div>
          <strong>{name}</strong>
          <span>{meeting.contact?.title || meeting.company?.name || "Coordonnées à compléter"}</span>
        </div>
      </div>

      <div className="rdv-agenda-context">
        <strong>{meeting.company?.name || "Entreprise non liée"}</strong>
        <span>{meeting.client?.name || "Sans client"} / {meeting.mission.name}</span>
      </div>

      <div className="rdv-agenda-team">
        <Avatar name={meeting.sdr.name} size={28} />
        <div>
          <strong>{meeting.sdr.name}</strong>
          <span>
            {meeting.interlocuteur
              ? [meeting.interlocuteur.firstName, meeting.interlocuteur.lastName].filter(Boolean).join(" ") || "Commercial assigné"
              : "Commercial à assigner"}
          </span>
        </div>
      </div>

      <div className="rdv-readiness" aria-label="Préparation du rendez-vous">
        <span className={meeting.rdvFiche ? "is-ready" : ""} title={meeting.rdvFiche ? "Fiche RDV prête" : "Fiche RDV à compléter"}>
          <FileText size={15} />
        </span>
        <span className={meeting.callRecordingUrl?.trim() ? "is-ready" : ""} title={meeting.callRecordingUrl?.trim() ? "Audio lié" : "Audio manquant"}>
          <Mic size={15} />
        </span>
        <span className={meeting.feedback ? "is-ready" : ""} title={meeting.feedback ? "Feedback renseigné" : "Feedback manquant"}>
          <MessageSquareText size={15} />
        </span>
      </div>

      <div className="rdv-agenda-status">
        {isPending ? (
          <div className="rdv-inline-decision">
            <span>À confirmer</span>
            <button type="button" onClick={confirm} title="Confirmer" aria-label={`Confirmer le rendez-vous avec ${name}`}>
              <Check size={14} />
            </button>
            <button type="button" className="is-danger" onClick={cancel} title="Annuler" aria-label={`Annuler le rendez-vous avec ${name}`}>
              <X size={14} />
            </button>
          </div>
        ) : meeting.confirmationStatus ? (
          <span
            className="status-badge"
            style={{
              background: confirmationBg(meeting.confirmationStatus),
              color: confirmationColor(meeting.confirmationStatus),
            }}
          >
            {confirmationLabel(meeting.confirmationStatus)}
          </span>
        ) : (
          <span className="rdv-muted-status">Non renseigné</span>
        )}
      </div>

      <ChevronRight className="rdv-row-chevron" size={18} aria-hidden />
    </article>
  );
});

export function MeetingList({
  meetings,
  loading,
  loadingMore,
  listRef,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpen,
  onLoadMore,
  updateMeeting,
  updateLocalMeeting,
  sortBy = "createdAt",
  sortDir = "desc",
  onSort,
}: MeetingListProps) {
  const scrollContainerRef = listRef as React.RefObject<HTMLDivElement>;

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    const onScroll = () => {
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 200) onLoadMore();
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef, onLoadMore]);

  const allSelected = meetings.length > 0 && selectedIds.size === meetings.length;

  return (
    <section className="rdv-agenda">
      <div className="rdv-agenda-toolbar">
        <label className="rdv-select-all">
          <input type="checkbox" className="rdv-checkbox" checked={allSelected} onChange={onToggleSelectAll} />
          <span>{meetings.length} affiché{meetings.length > 1 ? "s" : ""}</span>
        </label>
        <div className="rdv-agenda-legend" aria-hidden>
          <span>Horaire</span>
          <span>Contact</span>
          <span>Contexte</span>
          <span>Équipe</span>
          <span>Préparation</span>
          <span>Décision</span>
        </div>
        <div className="rdv-sort-control">
          <label htmlFor="rdv-sort">Trier par</label>
          <select id="rdv-sort" value={sortBy} onChange={(event) => onSort?.(event.target.value as SortField)}>
            {SORT_LABELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" onClick={() => onSort?.(sortBy)} title="Inverser le tri" aria-label="Inverser le tri">
            {sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="rdv-agenda-scroll rdv-scrollbar">
        {loading ? (
          Array.from({ length: 7 }).map((_, index) => (
            <div className="rdv-agenda-skeleton" key={index}>
              <Skeleton w={18} h={18} r={5} />
              <Skeleton w={100} h={42} r={8} />
              <Skeleton w="100%" h={42} r={10} />
              <Skeleton w="100%" h={42} r={10} />
              <Skeleton w={110} h={32} r={10} />
            </div>
          ))
        ) : meetings.length === 0 ? (
          <EmptyState />
        ) : (
          meetings.map((meeting) => (
            <MeetingRow
              key={meeting.id}
              meeting={meeting}
              selected={selectedIds.has(meeting.id)}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              updateMeeting={updateMeeting}
              updateLocalMeeting={updateLocalMeeting}
            />
          ))
        )}
        {loadingMore && (
          <div className="rdv-loading-more"><RefreshCw size={16} /> Chargement</div>
        )}
      </div>
    </section>
  );
}
