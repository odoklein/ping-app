"use client";

import { useState } from "react";
import type { Meeting } from "../../_types";
import { Building2, Loader2, Save } from "lucide-react";
import { RdvDialog, RdvDialogFooter, RdvField, RdvFormSection } from "../shared/RdvFormKit";

interface EditCompanyModalProps {
  meeting: Meeting;
  onClose: () => void;
  onSaved: (patch: { name: string; industry: string | null; country: string | null; size: string | null; website: string | null; phone: string | null }) => void;
}

export function EditCompanyModal({ meeting, onClose, onSaved }: EditCompanyModalProps) {
  const company = meeting.company!;
  const [form, setForm] = useState({
    name: company.name || "",
    industry: company.industry || "",
    country: company.country || "",
    website: company.website || "",
    size: company.size || "",
    phone: company.phone || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          industry: form.industry || null,
          country: form.country || null,
          website: form.website || null,
          size: form.size || null,
          phone: form.phone || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        const u = json.data;
        onSaved({
          name: u.name,
          industry: u.industry ?? null,
          country: u.country ?? null,
          size: u.size ?? null,
          website: u.website ?? null,
          phone: u.phone ?? null,
        });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const fields: [keyof typeof form, string, string][] = [
    ["name", "Nom", "Nom de l'entreprise"],
    ["industry", "Secteur", "Secteur d'activité"],
    ["country", "Pays", "Pays"],
    ["website", "Site web", "https://..."],
    ["size", "Taille / Effectif", "ex: 50-200"],
    ["phone", "Téléphone", "+33 1 23 45 67 89"],
  ];

  return (
    <RdvDialog
      isOpen
      onClose={() => !saving && onClose()}
      title="Modifier l'entreprise"
      description="Ces données donnent du contexte au manager avant l'échange."
      size="sm"
      className="rdv-edit-dialog"
    >
      <RdvFormSection title="Profil entreprise" description="Identité, taille et moyens de contact." icon={Building2}>
        <div className="rdv-form-grid two-columns">
          {fields.map(([key, label, placeholder]) => (
            <RdvField
              key={key}
              label={label}
              required={key === "name"}
              htmlFor={`company-${key}`}
              className={key === "name" || key === "website" ? "span-two" : undefined}
            >
            <input
              id={`company-${key}`}
              className="rdv-input"
              value={form[key]}
              placeholder={placeholder}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
            </RdvField>
          ))}
        </div>
      </RdvFormSection>
      <RdvDialogFooter>
        <button onClick={onClose} disabled={saving} className="rdv-btn rdv-btn-ghost">
          Annuler
        </button>
        <button
          disabled={saving || !form.name.trim()}
          onClick={handleSave}
          className="rdv-btn rdv-btn-primary"
        >
          {saving ? <Loader2 size={14} className="rdv-spin" /> : <Save size={14} />}
          {saving ? "Enregistrement..." : "Enregistrer l'entreprise"}
        </button>
      </RdvDialogFooter>
    </RdvDialog>
  );
}
