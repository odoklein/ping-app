"use client";

import type { Meeting } from "../../_types";
import { outcomeLabel, confirmationLabel } from "../../_lib/formatters";
import type { ConfirmationFilter } from "../../_types";

interface HistoryTabProps {
  meeting: Meeting;
}

function HistoryEntry({
  time,
  actor,
  description,
  color,
}: {
  time: string;
  actor: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rdv-history-entry">
      <div className="rdv-history-rail">
        <div style={{ background: color }} />
        <div />
      </div>
      <div className="rdv-history-content">
        <div>
          <strong style={{ color: "var(--ink)" }}>{actor}</strong> : {description}
        </div>
        <time>
          {new Date(time).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}

export function HistoryTab({ meeting }: HistoryTabProps) {
  const entries: { time: string; actor: string; description: string; color: string }[] = [];

  entries.push({
    time: meeting.createdAt,
    actor: meeting.sdr.name,
    description: "RDV créé",
    color: "var(--green)",
  });

  if (meeting.callbackDate) {
    entries.push({
      time: meeting.createdAt,
      actor: meeting.sdr.name,
      description: `Planifié le ${new Date(meeting.callbackDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      color: "var(--blue)",
    });
  }

  if (meeting.confirmationStatus === "CONFIRMED" && meeting.confirmedAt) {
    entries.push({
      time: meeting.confirmedAt,
      actor: meeting.confirmedById ? "Manager" : "Auto (24h)",
      description: `Confirmé : ${confirmationLabel(meeting.confirmationStatus as ConfirmationFilter)}`,
      color: "var(--green)",
    });
  }

  if (meeting.confirmationStatus === "CANCELLED" && meeting.confirmationUpdatedAt) {
    entries.push({
      time: meeting.confirmationUpdatedAt,
      actor: "Manager",
      description: "Confirmation annulée",
      color: "var(--red)",
    });
  }

  if (meeting.rdvFicheUpdatedAt) {
    entries.push({
      time: meeting.rdvFicheUpdatedAt,
      actor: "Manager",
      description: "Fiche RDV mise à jour",
      color: "var(--accent)",
    });
  }

  if (meeting.feedback) {
    entries.push({
      time: meeting.feedback.note ? meeting.createdAt : meeting.createdAt,
      actor: "Commercial / Client",
      description: `Feedback : ${outcomeLabel(meeting.feedback.outcome)}${meeting.feedback.recontact ? `, recontact : ${meeting.feedback.recontact}` : ""}`,
      color: "var(--amber)",
    });
  }

  if (meeting.result === "MEETING_CANCELLED") {
    entries.push({
      time: meeting.confirmationUpdatedAt || meeting.createdAt,
      actor: "Système",
      description: `Annulé${meeting.cancellationReason ? ` : ${meeting.cancellationReason}` : ""}`,
      color: "var(--red)",
    });
  }

  entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="rdv-history-tab">
      <div className="rdv-tab-section-header">
        <div>
          <strong>Chronologie du rendez-vous</strong>
          <span>Les changements qui expliquent son état actuel.</span>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="rdv-tab-empty">Aucun historique disponible.</div>
      ) : (
        entries.map((entry, i) => (
          <HistoryEntry key={`${entry.time}-${i}`} {...entry} />
        ))
      )}
    </div>
  );
}
