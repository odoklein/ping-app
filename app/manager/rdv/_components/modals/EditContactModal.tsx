"use client";

import { useState } from "react";
import type { Meeting } from "../../_types";
import { Loader2, Mail, Save, UserRound } from "lucide-react";
import { RdvDialog, RdvDialogFooter, RdvField, RdvFormSection } from "../shared/RdvFormKit";

interface EditContactModalProps {
  meeting: Meeting;
  onClose: () => void;
  onSaved: (patch: { firstName: string | null; lastName: string | null; title: string | null; email: string | null; phone: string | null; linkedin: string | null }) => void;
}

export function EditContactModal({ meeting, onClose, onSaved }: EditContactModalProps) {
  const contact = meeting.contact!;
  const [form, setForm] = useState({
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    title: contact.title || "",
    email: contact.email || "",
    phone: contact.phone || "",
    linkedin: contact.linkedin || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          title: form.title || null,
          email: form.email || null,
          phone: form.phone || null,
          linkedin: form.linkedin || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        const u = json.data;
        onSaved({
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          title: u.title ?? null,
          email: u.email ?? null,
          phone: u.phone ?? null,
          linkedin: u.linkedin ?? null,
        });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const fields: [keyof typeof form, string, string][] = [
    ["firstName", "Prénom", "Prénom"],
    ["lastName", "Nom", "Nom"],
    ["title", "Poste", "Poste"],
    ["email", "Email", "email@exemple.fr"],
    ["phone", "Téléphone", "+33 6 12 34 56 78"],
    ["linkedin", "LinkedIn", "https://linkedin.com/in/..."],
  ];

  return (
    <RdvDialog
      isOpen
      onClose={() => !saving && onClose()}
      title="Modifier le contact"
      description="Gardez uniquement les informations utiles pour préparer et joindre le prospect."
      size="sm"
      className="rdv-edit-dialog"
    >
      <div className="rdv-dialog-stack">
        <RdvFormSection title="Identité" description="Ce qui permet à l'équipe de reconnaître le bon interlocuteur." icon={UserRound}>
          <div className="rdv-form-grid two-columns">
            {fields.slice(0, 3).map(([key, label, placeholder]) => (
              <RdvField key={key} label={label} htmlFor={`contact-${key}`} className={key === "title" ? "span-two" : undefined}>
                <input
                  id={`contact-${key}`}
                  className="rdv-input"
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </RdvField>
            ))}
          </div>
        </RdvFormSection>

        <RdvFormSection title="Coordonnées" description="Utilisées par les actions rapides du rendez-vous." icon={Mail}>
          <div className="rdv-form-grid">
            {fields.slice(3).map(([key, label, placeholder]) => (
              <RdvField key={key} label={label} htmlFor={`contact-${key}`}>
            <input
              id={`contact-${key}`}
              className="rdv-input"
              value={form[key]}
              placeholder={placeholder}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
              </RdvField>
            ))}
          </div>
        </RdvFormSection>
      </div>
      <RdvDialogFooter>
        <button onClick={onClose} disabled={saving} className="rdv-btn rdv-btn-ghost">
          Annuler
        </button>
        <button disabled={saving} onClick={handleSave} className="rdv-btn rdv-btn-primary">
          {saving ? <Loader2 size={14} className="rdv-spin" /> : <Save size={14} />}
          {saving ? "Enregistrement..." : "Enregistrer le contact"}
        </button>
      </RdvDialogFooter>
    </RdvDialog>
  );
}
