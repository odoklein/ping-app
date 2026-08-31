"use client";

import type { Meeting } from "../../_types";
import type { UseNoteAutosaveReturn } from "../../_hooks/useNoteAutosave";

interface NoteTabProps {
  meeting: Meeting;
  noteState: UseNoteAutosaveReturn;
  updateMeeting: (id: string, data: Record<string, unknown>) => Promise<void>;
}

export function NoteTab({ meeting, noteState, updateMeeting }: NoteTabProps) {
  const { managerNote, setManagerNote, noteStatus, triggerSave } = noteState;

  return (
    <div className="rdv-note-tab">
      <div className="rdv-tab-section-header">
        <div>
          <strong>Note interne manager</strong>
          <span>Visible uniquement par l&apos;équipe interne.</span>
        </div>
        {noteStatus === "saving" && (
          <span className="rdv-save-state">Enregistrement...</span>
        )}
        {noteStatus === "saved" && (
          <span className="rdv-save-state is-saved">Sauvegardé</span>
        )}
        {noteStatus === "error" && (
          <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500 }}>Erreur de sauvegarde</span>
        )}
      </div>
      <textarea
        className="rdv-input"
        style={{ width: "100%", minHeight: 240, resize: "vertical" }}
        value={managerNote}
        onChange={(e) => {
          setManagerNote(e.target.value);
          triggerSave(meeting.id, e.target.value, updateMeeting);
        }}
        placeholder="Ajouter une note interne (non visible par le client)…"
      />
    </div>
  );
}
