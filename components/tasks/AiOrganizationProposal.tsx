"use client";

import { Check, Pencil, Sparkles, X } from "lucide-react";

export interface OrganizationChild {
    title: string;
    description?: string;
    priority?: string;
    estimatedHours?: number;
    tasks?: OrganizationChild[];
    children?: OrganizationChild[];
}

export interface OrganizationProposal {
    summary?: string;
    item?: { title?: string; description?: string; priority?: string; labels?: string[]; estimatedHours?: number };
    children?: OrganizationChild[];
}

export function AiOrganizationProposal({ proposal, childLabel = "Sous-tâches", onAccept, onEdit, onReject, accepting = false }: {
    proposal: OrganizationProposal;
    childLabel?: string;
    onAccept: () => void;
    onEdit: () => void;
    onReject: () => void;
    accepting?: boolean;
}) {
    return <section className="rounded-xl border border-[#B9D4CE] bg-[#F5FAF8] p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#0B5A51]">
            <Sparkles className="h-4 w-4" /> Proposition d&apos;organisation par Mistral
        </div>
        {proposal.summary && <p className="mt-2 text-sm text-slate-600">{proposal.summary}</p>}
        {proposal.item && <div className="mt-3 rounded-lg border border-[#D8E9E4] bg-white px-3 py-2 text-sm">
            <p className="font-semibold text-slate-800">{proposal.item.title}</p>
            {proposal.item.description && <p className="mt-1 whitespace-pre-wrap text-slate-600">{proposal.item.description}</p>}
        </div>}
        {(proposal.children?.length ?? 0) > 0 && <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{childLabel} ({proposal.children!.length})</p>
            <ul className="mt-1.5 space-y-1.5">
                {proposal.children!.map((child, index) => <li key={`${child.title}-${index}`} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium">{child.title}</span>
                    {child.estimatedHours != null && <span className="ml-2 text-xs text-slate-400">{child.estimatedHours} h</span>}
                    {child.description && <p className="mt-0.5 text-xs text-slate-500">{child.description}</p>}
                    {(child.tasks?.length ?? 0) > 0 && <div className="mt-1.5 border-l-2 border-[#C9DED8] pl-2 text-xs text-slate-600">
                        {child.tasks!.map((task, taskIndex) => <p key={`${task.title}-${taskIndex}`}>• {task.title}</p>)}
                    </div>}
                    {(child.children?.length ?? 0) > 0 && <p className="mt-1 text-xs font-medium text-[#0B5A51]">{child.children!.length} sous-projet{child.children!.length > 1 ? "s" : ""}</p>}
                </li>)}
            </ul>
        </div>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onReject} disabled={accepting} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50"><X className="h-4 w-4" /> Refuser</button>
            <button type="button" onClick={onEdit} disabled={accepting} className="inline-flex items-center gap-1.5 rounded-lg border border-[#9EC6BD] bg-white px-3 py-2 text-sm font-medium text-[#0B5A51] hover:bg-[#EAF5F2] disabled:opacity-50"><Pencil className="h-4 w-4" /> Modifier</button>
            <button type="button" onClick={onAccept} disabled={accepting} className="inline-flex items-center gap-1.5 rounded-lg bg-[#084C45] px-3 py-2 text-sm font-semibold text-white hover:bg-[#063E39] disabled:opacity-50"><Check className="h-4 w-4" /> {accepting ? "Application..." : "Oui, appliquer"}</button>
        </div>
    </section>;
}
