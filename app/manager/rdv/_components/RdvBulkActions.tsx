"use client";

import type { Meeting } from "../_types";
import { downloadCSV } from "../_lib/csv-export";
import { Check, CheckSquare2, Download, Trash2, X, XCircle } from "lucide-react";

interface RdvBulkActionsProps {
  selectedMeetings: Meeting[];
  confirming: boolean;
  cancelling: boolean;
  onConfirm: () => void;
  onCancelMeetings: () => void;
  onDeleteRequest: () => void;
  onClearSelection: () => void;
}

export function RdvBulkActions({
  selectedMeetings,
  confirming,
  cancelling,
  onConfirm,
  onCancelMeetings,
  onDeleteRequest,
  onClearSelection,
}: RdvBulkActionsProps) {
  if (selectedMeetings.length === 0) return null;

  return (
    <div className="bulk-action-bar" role="toolbar" aria-label="Actions sur la sélection">
      <div className="rdv-bulk-summary">
        <span><CheckSquare2 size={16} /></span>
        <div>
          <strong>{selectedMeetings.length} sélectionné{selectedMeetings.length > 1 ? "s" : ""}</strong>
          <small>Appliquer une décision à ce lot</small>
        </div>
      </div>
      <div className="rdv-bulk-divider" />
      <div className="rdv-bulk-actions">
        <button className="rdv-btn rdv-btn-success" onClick={onConfirm} disabled={confirming}>
          <Check size={13} /> {confirming ? "Confirmation..." : "Confirmer"}
        </button>
        <button className="rdv-btn rdv-btn-danger-quiet" onClick={onCancelMeetings} disabled={cancelling}>
          <XCircle size={13} /> {cancelling ? "Annulation..." : "Annuler"}
        </button>
        <button className="rdv-btn rdv-btn-ghost" onClick={() => downloadCSV(selectedMeetings, "selection")}>
          <Download size={13} /> Exporter
        </button>
        <button className="rdv-btn rdv-bulk-delete" onClick={onDeleteRequest}>
          <Trash2 size={13} /> Supprimer
        </button>
      </div>
      <button className="rdv-icon-button rdv-bulk-close" onClick={onClearSelection} aria-label="Effacer la sélection">
        <X size={14} />
      </button>
    </div>
  );
}
