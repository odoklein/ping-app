"use client";

import type { Meeting } from "../../_types";
import type { UseFicheRdvReturn } from "../../_hooks/useFicheRdv";
import { FileText, Check, RefreshCw } from "lucide-react";

interface FicheTabProps {
  meeting: Meeting;
  setSelectedMeeting: React.Dispatch<React.SetStateAction<Meeting | null>>;
  ficheState: UseFicheRdvReturn;
}

const FICHE_FIELDS = [
  ["contexte", "Contexte"],
  ["besoinsProblemes", "Besoins / Problèmes identifiés"],
  ["solutionsEnPlace", "Solutions en place"],
  ["objectionsFreins", "Objections / Freins"],
  ["notesImportantes", "Notes importantes"],
] as const;

export function FicheTab({ meeting, setSelectedMeeting, ficheState }: FicheTabProps) {
  const {
    ficheForm,
    setFicheForm,
    ficheLoading,
    ficheError,
    ficheSaving,
    ficheSaved,
    ficheManualTranscript,
    setFicheManualTranscript,
    ficheAutoSaveStatus,
    generateWithAI,
    saveFiche,
    triggerAutoSave,
  } = ficheState;

  return (
    <div className="rdv-fiche-tab">
      <div className="rdv-tab-section-header">
        <div>
          <strong>Mémoire du rendez-vous</strong>
          <span>Structurez les signaux utiles pour la suite.</span>
        </div>
        <div className="rdv-tab-actions">
          {ficheAutoSaveStatus === "saving" && <span className="rdv-save-state">Enregistrement...</span>}
          {ficheAutoSaveStatus === "saved" && <span className="rdv-save-state is-saved">Sauvegardé</span>}
          {ficheAutoSaveStatus === "error" && <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 500 }}>Erreur</span>}
          {ficheSaved && ficheAutoSaveStatus === "idle" && <span className="rdv-save-state is-saved">Sauvegardé</span>}
          <button
            className="rdv-btn rdv-btn-ghost"
            style={{ fontSize: 12, padding: "6px 12px" }}
            disabled={ficheLoading}
            onClick={() => generateWithAI(meeting, (updated) => setSelectedMeeting(updated))}
          >
            {ficheLoading ? (
              <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <FileText size={13} />
            )}
            Générer IA
          </button>
          <button
            className="rdv-btn rdv-btn-primary"
            style={{ fontSize: 12, padding: "6px 12px" }}
            disabled={ficheSaving}
            onClick={() => saveFiche(meeting, (updated) => setSelectedMeeting(updated))}
          >
            <Check size={13} /> {ficheSaving ? "Enregistrement…" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {meeting.rdvFicheUpdatedAt && (
        <div style={{ fontSize: 12, color: "var(--ink3)" }}>
          Dernière mise à jour : {new Date(meeting.rdvFicheUpdatedAt).toLocaleString("fr-FR")}
        </div>
      )}

      {ficheError && (
        <div style={{ background: "var(--redLight)", border: "1px solid rgba(220,38,38,0.18)", color: "var(--red)", padding: "10px 12px", borderRadius: 12, fontSize: 12 }}>
          {ficheError}
        </div>
      )}

      <div className="rdv-transcript-field">
        <div>
          <strong>Source de génération</strong>
          <span>Collez une transcription brute. Elle reste modifiable avant génération.</span>
        </div>
        <textarea
          className="rdv-input"
          style={{ width: "100%", minHeight: 100, resize: "vertical" }}
          value={ficheManualTranscript}
          onChange={(e) => setFicheManualTranscript(e.target.value)}
          onKeyDown={(e) => {
            // Keep paste shortcut local to this field and avoid global hotkey interception.
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
              e.stopPropagation();
            }
          }}
          onPaste={(e) => {
            // Some global listeners can interfere with paste; prevent bubbling from this textarea.
            e.stopPropagation();
          }}
          placeholder="Collez ici la transcription complète (Agent/Prospect)…"
        />
      </div>

      <div className="rdv-fiche-grid">
        {FICHE_FIELDS.map(([field, label]) => (
          <div key={field} className="rdv-fiche-field">
            <div>{label}</div>
            <textarea
              className="rdv-input"
              style={{ width: "100%", minHeight: 80, resize: "vertical" }}
              value={ficheForm[field]}
              onChange={(e) => {
                const updated = { ...ficheForm, [field]: e.target.value };
                setFicheForm(updated);
                triggerAutoSave(meeting.id, updated);
              }}
              placeholder={`Saisir ${label.toLowerCase()}…`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
