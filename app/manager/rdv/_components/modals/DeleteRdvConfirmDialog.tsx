"use client";

import { useMemo, useState } from "react";
import type { Meeting } from "../../_types";
import { AlertTriangle, Trash2 } from "lucide-react";
import { RdvDialog, RdvDialogFooter, RdvField, RdvNotice } from "../shared/RdvFormKit";

interface DeleteRdvConfirmDialogProps {
  isOpen: boolean;
  selectedMeetings: Meeting[];
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

function meetingLabel(meeting: Meeting) {
  const contact = [meeting.contact?.firstName, meeting.contact?.lastName].filter(Boolean).join(" ");
  const primary = contact || meeting.company?.name || "Rendez-vous sans contact";
  return `${primary} · ${meeting.company?.name || "Sans entreprise"}`;
}

export function DeleteRdvConfirmDialog({
  isOpen,
  selectedMeetings,
  deleting = false,
  onClose,
  onConfirm,
}: DeleteRdvConfirmDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const selectedCount = selectedMeetings.length;
  const requiresGuard = selectedCount > 5;
  const guardToken = useMemo(() => `DELETE ${selectedCount}`, [selectedCount]);
  const deleteAllowed = !requiresGuard || confirmInput.trim().toUpperCase() === guardToken;

  const close = () => {
    if (deleting) return;
    setConfirmInput("");
    onClose();
  };

  const confirm = async () => {
    await onConfirm();
    setConfirmInput("");
  };

  return (
    <RdvDialog
      isOpen={isOpen}
      onClose={close}
      title="Supprimer les rendez-vous"
      description="Cette opération retire définitivement les éléments sélectionnés."
      size="sm"
      closeOnOverlay={!deleting}
      closeOnEscape={!deleting}
      className="rdv-delete-dialog"
    >
      <div className="rdv-delete-summary">
        <span><AlertTriangle size={18} /></span>
        <div>
          <strong>{selectedCount} rendez-vous seront supprimés</strong>
          <p>Vérifiez la sélection ci-dessous avant de continuer.</p>
        </div>
      </div>

      <div className="rdv-delete-list rdv-scrollbar" aria-label="Rendez-vous sélectionnés">
        {selectedMeetings.slice(0, 20).map((meeting) => (
          <div key={meeting.id}>{meetingLabel(meeting)}</div>
        ))}
        {selectedMeetings.length > 20 && <div>+{selectedMeetings.length - 20} autres rendez-vous</div>}
      </div>

      {requiresGuard ? (
        <RdvField label={`Tapez ${guardToken} pour confirmer`} htmlFor="rdv-delete-guard">
          <input
            id="rdv-delete-guard"
            className="rdv-input"
            value={confirmInput}
            onChange={(event) => setConfirmInput(event.target.value)}
            placeholder={guardToken}
            autoFocus
          />
        </RdvField>
      ) : (
        <RdvNotice tone="danger">La suppression est définitive et ne peut pas être annulée.</RdvNotice>
      )}

      <RdvDialogFooter>
        <button className="rdv-btn rdv-btn-ghost" onClick={close} disabled={deleting}>Conserver</button>
        <button className="rdv-btn rdv-btn-danger" onClick={confirm} disabled={!deleteAllowed || deleting}>
          <Trash2 size={14} /> {deleting ? "Suppression..." : "Supprimer définitivement"}
        </button>
      </RdvDialogFooter>
    </RdvDialog>
  );
}
