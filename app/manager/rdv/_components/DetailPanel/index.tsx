"use client";

import type { Meeting, PanelTab, ConfirmationFilter } from "../../_types";
import {
  statusBg,
  statusColor,
  statusLabel,
  meetingStatus,
  confirmationBg,
  confirmationColor,
  confirmationLabel,
  meetingTypeLabel,
  categoryBg,
  categoryColor,
  categoryLabel,
  downloadICS,
  proximityLabel,
  contactName,
} from "../../_lib/formatters";
import { Avatar } from "../shared/Avatar";
import {
  X,
  Check,
  Mail,
  Phone,
  Linkedin,
  FileText,
  ThumbsUp,
  Mic,
  History,
  CalendarPlus,
  CalendarClock,
  MapPin,
  Video,
} from "lucide-react";
import { DetailTab } from "./DetailTab";
import { FicheTab } from "./FicheTab";
import { FeedbackTab } from "./FeedbackTab";
import { AudioTab } from "./AudioTab";
import { HistoryTab } from "./HistoryTab";
import type { UseDetailPanelReturn } from "../../_hooks/useDetailPanel";
import type { UseFicheRdvReturn } from "../../_hooks/useFicheRdv";
import type { UseFeedbackReturn } from "../../_hooks/useFeedback";

interface DetailPanelProps {
  panelState: UseDetailPanelReturn;
  ficheState: UseFicheRdvReturn;
  feedbackState: UseFeedbackReturn;
  updateMeeting: (id: string, data: Record<string, unknown>) => Promise<void>;
  onOpenEditContact: () => void;
  onOpenEditCompany: () => void;
  onOpenLinkContact: () => void;
  updateLocalMeeting: (id: string, patch: Partial<Meeting>) => void;
}

const TABS: { key: PanelTab; label: string; shortLabel: string; Icon: typeof FileText }[] = [
  { key: "detail", label: "Vue d'ensemble", shortLabel: "Détail", Icon: FileText },
  { key: "fiche", label: "Fiche RDV", shortLabel: "Fiche", Icon: FileText },
  { key: "feedback", label: "Feedback", shortLabel: "Feedback", Icon: ThumbsUp },
  { key: "audio", label: "Audio et transcription", shortLabel: "Audio", Icon: Mic },
  { key: "history", label: "Historique", shortLabel: "Historique", Icon: History },
];

function formatAppointment(date: string | null | undefined) {
  if (!date) return { day: "Date à définir", time: "Non planifié" };
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return { day: "Date à vérifier", time: "Horaire invalide" };
  return {
    day: parsed.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    time: parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function DetailPanel({
  panelState,
  ficheState,
  feedbackState,
  updateMeeting,
  onOpenEditContact,
  onOpenEditCompany,
  onOpenLinkContact,
  updateLocalMeeting,
}: DetailPanelProps) {
  const { selectedMeeting, setSelectedMeeting, panelOpen, panelTab, setPanelTab, closePanel } = panelState;

  if (!selectedMeeting) return null;

  const status = meetingStatus(selectedMeeting);
  const appointment = formatAppointment(selectedMeeting.callbackDate);
  const confirmation = selectedMeeting.confirmationStatus as ConfirmationFilter | null;
  const isConfirmed = confirmation === "CONFIRMED";
  const isCancelled = confirmation === "CANCELLED";

  const handleConfirm = () => {
    updateMeeting(selectedMeeting.id, { confirmationStatus: "CONFIRMED" });
    const confirmedAt = new Date().toISOString();
    updateLocalMeeting(selectedMeeting.id, { confirmationStatus: "CONFIRMED", confirmedAt });
    setSelectedMeeting({ ...selectedMeeting, confirmationStatus: "CONFIRMED", confirmedAt });
  };

  const handleCancel = () => {
    updateMeeting(selectedMeeting.id, { confirmationStatus: "CANCELLED" });
    updateLocalMeeting(selectedMeeting.id, {
      confirmationStatus: "CANCELLED",
      confirmedAt: null,
      confirmedById: null,
    });
    setSelectedMeeting({ ...selectedMeeting, confirmationStatus: "CANCELLED", confirmedAt: null, confirmedById: null });
  };

  return (
    <aside
      className={`rdv-panel rdv-scrollbar ${panelOpen ? "open" : ""}`}
      aria-label={`Détail du rendez-vous avec ${contactName(selectedMeeting.contact)}`}
      aria-hidden={!panelOpen}
    >
      <header className="rdv-detail-header">
        <div className="rdv-detail-kicker">
          <span>Dossier rendez-vous</span>
          {selectedMeeting.callbackDate && (() => {
            const proximity = proximityLabel(selectedMeeting.callbackDate);
            return <small style={{ color: proximity.color }}>{proximity.text}</small>;
          })()}
          <button type="button" className="rdv-icon-button" onClick={closePanel} aria-label="Fermer le panneau">
            <X size={17} />
          </button>
        </div>

        <div className="rdv-detail-identity">
          <Avatar name={contactName(selectedMeeting.contact)} size={56} />
          <div className="rdv-detail-person">
            <h2>{contactName(selectedMeeting.contact)}</h2>
            <p>
              {selectedMeeting.contact?.title || "Fonction non renseignée"}
              <span aria-hidden="true"> · </span>
              {selectedMeeting.company?.name || "Entreprise non renseignée"}
            </p>
          </div>
          <div className="rdv-appointment-card">
            <CalendarClock size={16} />
            <div>
              <strong>{appointment.day}</strong>
              <span>{appointment.time}</span>
            </div>
          </div>
        </div>

        <div className="rdv-detail-metadata" aria-label="Statuts du rendez-vous">
          <span className="status-badge" style={{ background: statusBg(status), color: statusColor(status) }}>
            {statusLabel(status)}
          </span>
          {confirmation && (
            <span className="status-badge" style={{ background: confirmationBg(confirmation), color: confirmationColor(confirmation) }}>
              {confirmationLabel(confirmation)}
            </span>
          )}
          <span className="rdv-pill is-neutral">
            {selectedMeeting.meetingType === "PHYSIQUE" ? <MapPin size={11} /> : selectedMeeting.meetingType === "TELEPHONIQUE" ? <Phone size={11} /> : <Video size={11} />}
            {meetingTypeLabel(selectedMeeting.meetingType)}
          </span>
          {selectedMeeting.meetingCategory ? (
            <span className="rdv-pill" style={{ background: categoryBg(selectedMeeting.meetingCategory), color: categoryColor(selectedMeeting.meetingCategory) }}>
              {categoryLabel(selectedMeeting.meetingCategory)}
            </span>
          ) : (
            <span className="rdv-pill is-muted">Non classé</span>
          )}
        </div>

        <div className={`rdv-decision-card ${isConfirmed ? "is-confirmed" : isCancelled ? "is-cancelled" : "is-pending"}`}>
          <div>
            <span>Décision manager</span>
            <strong>{isConfirmed ? "Rendez-vous confirmé" : isCancelled ? "Rendez-vous annulé" : "Confirmation attendue"}</strong>
            <small>{isConfirmed ? "L'équipe peut préparer l'échange." : isCancelled ? "Le créneau ne doit plus être traité." : "Validez le créneau ou signalez son annulation."}</small>
          </div>
          <div className="rdv-decision-actions">
            {!isConfirmed && (
              <button type="button" className="rdv-btn rdv-btn-success" onClick={handleConfirm}>
                <Check size={14} /> Confirmer
              </button>
            )}
            {!isCancelled && (
              <button type="button" className="rdv-btn rdv-btn-danger-quiet" onClick={handleCancel}>
                <X size={14} /> Annuler
              </button>
            )}
          </div>
        </div>

        <div className="rdv-contact-actions" aria-label="Actions rapides">
          {selectedMeeting.contact?.email && <a href={`mailto:${selectedMeeting.contact.email}`}><Mail size={14} /> Email</a>}
          {selectedMeeting.contact?.phone && <a href={`tel:${selectedMeeting.contact.phone}`}><Phone size={14} /> Appeler</a>}
          {selectedMeeting.contact?.linkedin && <a href={selectedMeeting.contact.linkedin} target="_blank" rel="noreferrer"><Linkedin size={14} /> LinkedIn</a>}
          {selectedMeeting.callbackDate && <button type="button" onClick={() => downloadICS(selectedMeeting)} aria-label="Ajouter au calendrier" title="Ajouter au calendrier"><CalendarPlus size={14} /> Calendrier</button>}
        </div>

        <nav className="rdv-detail-tabs" aria-label="Sections du rendez-vous" role="tablist">
          {TABS.map(({ key, label, shortLabel, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={panelTab === key}
              className={panelTab === key ? "is-active" : ""}
              onClick={() => setPanelTab(key)}
              title={label}
            >
              <Icon size={14} />
              <span>{shortLabel}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="rdv-detail-content" role="tabpanel">
        {panelTab === "detail" && (
          <DetailTab
            meeting={selectedMeeting}
            setSelectedMeeting={setSelectedMeeting}
            editMode={panelState.detailEditMode}
            setEditMode={panelState.setDetailEditMode}
            detailForm={panelState.detailForm}
            setDetailForm={panelState.setDetailForm}
            detailSaving={panelState.detailSaving}
            setDetailSaving={panelState.setDetailSaving}
            updateMeeting={updateMeeting}
            updateLocalMeeting={updateLocalMeeting}
            onOpenEditContact={onOpenEditContact}
            onOpenEditCompany={onOpenEditCompany}
            onOpenLinkContact={onOpenLinkContact}
          />
        )}
        {panelTab === "fiche" && <FicheTab meeting={selectedMeeting} setSelectedMeeting={setSelectedMeeting} ficheState={ficheState} />}
        {panelTab === "feedback" && <FeedbackTab meeting={selectedMeeting} feedbackState={feedbackState} updateMeeting={updateMeeting} />}
        {panelTab === "audio" && <AudioTab meeting={selectedMeeting} updateMeeting={updateMeeting} setSelectedMeeting={setSelectedMeeting} ficheState={ficheState} />}
        {panelTab === "history" && <HistoryTab meeting={selectedMeeting} />}
      </div>
    </aside>
  );
}
