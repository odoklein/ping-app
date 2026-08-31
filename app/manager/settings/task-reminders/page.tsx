"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, KeyRound, RotateCcw, Save } from "lucide-react";
import { TASK_REMINDER_TEMPLATE_VARIABLES } from "@/lib/email/templates/task-reminder";

type Template = { subject: string; bodyHtml: string; isCustomized: boolean; defaultSubject: string; defaultBodyHtml: string };

export default function TaskReminderSettingsPage() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const json = await fetch("/api/system-templates/task_reminder_digest").then((r) => r.json());
    if (json.success) {
      setTemplate(json.data);
      setSubject(json.data.subject);
      setBodyHtml(json.data.bodyHtml);
    } else setMessage(json.error || "Impossible de charger le template");
  };
  useEffect(() => { void load(); }, []);

  async function save() {
    setSaving(true); setMessage(null);
    try {
      const json = await fetch("/api/system-templates/task_reminder_digest", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, bodyHtml }),
      }).then((r) => r.json());
      if (json.success) { setTemplate((current) => current ? { ...current, isCustomized: true } : current); setMessage("Template enregistré"); }
      else setMessage(json.error || "Impossible d'enregistrer le template");
    } catch { setMessage("Erreur de connexion"); }
    finally { setSaving(false); }
  }

  async function reset() {
    if (!template || !window.confirm("Restaurer le template par défaut ?")) return;
    setSaving(true); setMessage(null);
    try {
      const json = await fetch("/api/system-templates/task_reminder_digest", { method: "DELETE" }).then((r) => r.json());
      if (json.success) { setSubject(template.defaultSubject); setBodyHtml(template.defaultBodyHtml); setTemplate({ ...template, isCustomized: false }); setMessage("Template par défaut restauré"); }
      else setMessage(json.error || "Impossible de réinitialiser le template");
    } catch { setMessage("Erreur de connexion"); }
    finally { setSaving(false); }
  }

  return <div className="elan-page mx-auto max-w-5xl">
    <Link href="/manager/settings" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#1F4D47]"><ArrowLeft className="w-4 h-4" />Retour aux paramètres</Link>
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-[#1F4D47]" /><h1 className="text-xl font-semibold text-slate-900">Rappels email des tâches</h1></div>
      <p className="mt-2 text-sm text-slate-500">Un email groupé est envoyé chaque jour ouvré aux utilisateurs ayant des tâches en retard, à faire aujourd&apos;hui ou prévues dans les 3 jours.</p>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex flex-wrap gap-2">{TASK_REMINDER_TEMPLATE_VARIABLES.map((variable) => <span key={variable.name} title={variable.description} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"><KeyRound className="w-3 h-3" />{variable.name}</span>)}</div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Sujet</label>
      <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono" />
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">HTML</label>
      <textarea value={bodyHtml} onChange={(event) => setBodyHtml(event.target.value)} className="min-h-[380px] w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs" />
      <div className="flex flex-wrap items-center gap-3"><button onClick={save} disabled={saving || !subject.trim() || !bodyHtml.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#1F4D47] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="w-4 h-4" />{saving ? "Enregistrement…" : "Enregistrer"}</button><button onClick={reset} disabled={saving || !template?.isCustomized} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"><RotateCcw className="w-4 h-4" />Restaurer le défaut</button>{message && <span className="text-sm text-slate-600">{message}</span>}</div>
    </div>
  </div>;
}
