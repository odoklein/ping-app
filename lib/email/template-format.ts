// ============================================
// CLIENT-SAFE TEMPLATE FORMATTING
// Pure {{variable}} helpers usable in the browser (no Prisma import).
// The server engine (lib/email/services/template-variables.ts) re-uses
// `extractVariables` / `substituteVariables` from here so the matching
// logic stays in one place.
// ============================================

import { SUPPORTED_TEMPLATE_VARIABLES } from "./constants";

export const VARIABLE_REGEX = /\{\{(\w+(?:\.\w+)?)\}\}/g;

/** All distinct {{variable}} names referenced in a string. */
export function extractVariables(text: string): string[] {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(VARIABLE_REGEX.source, "g");
    while ((m = re.exec(text)) !== null) {
        if (!out.includes(m[1])) out.push(m[1]);
    }
    return out;
}

/** Replace every {{name}} with its mapped value ("" when missing). */
export function substituteVariables(text: string, variables: Record<string, string>): string {
    return text.replace(new RegExp(VARIABLE_REGEX.source, "g"), (_match, name) => variables[name] ?? "");
}

/** Highlighted HTML preview: resolved values in green, unresolved tokens in amber. */
export function highlightVariables(text: string, variables: Record<string, string>): string {
    return text.replace(new RegExp(VARIABLE_REGEX.source, "g"), (match, name) => {
        const value = variables[name];
        return value
            ? `<span class="tpl-var-ok">${value}</span>`
            : `<span class="tpl-var-missing">${match}</span>`;
    });
}

// ---- Variable catalog grouped for the UI ----

export const VARIABLE_GROUPS: { key: string; label: string; items: { name: string; description: string }[] }[] = [
    { key: "contact", label: "Contact", items: [] },
    { key: "company", label: "Entreprise", items: [] },
    { key: "date", label: "Date", items: [] },
];

for (const v of SUPPORTED_TEMPLATE_VARIABLES) {
    const group = VARIABLE_GROUPS.find((g) => g.key === v.category) || VARIABLE_GROUPS[0];
    group.items.push({ name: v.name, description: v.description });
}

// ---- Live preview / sample values ----

export interface PreviewContact {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    linkedin?: string | null;
    company?: { name?: string | null; industry?: string | null; website?: string | null; country?: string | null; size?: string | null } | null;
}

export interface PreviewCompany {
    name?: string | null;
    industry?: string | null;
    website?: string | null;
    country?: string | null;
    size?: string | null;
    phone?: string | null;
}

/** Sample placeholder values, used when no real contact is available (template manager preview). */
export function sampleVariables(): Record<string, string> {
    const now = new Date();
    return {
        firstName: "Jean",
        lastName: "Dupont",
        fullName: "Jean Dupont",
        title: "Directeur commercial",
        email: "jean.dupont@exemple.fr",
        phone: "+33 6 12 34 56 78",
        linkedin: "https://linkedin.com/in/jeandupont",
        company: "Acme SAS",
        companyName: "Acme SAS",
        industry: "Technologie",
        website: "https://acme.fr",
        country: "France",
        companySize: "50-200",
        currentDate: now.toLocaleDateString("fr-FR"),
        currentDay: now.toLocaleDateString("fr-FR", { weekday: "long" }),
        currentMonth: now.toLocaleDateString("fr-FR", { month: "long" }),
        currentYear: String(now.getFullYear()),
    };
}

/**
 * Build the real variable map for client-side preview from a contact/company.
 * Mirrors the server's buildVariableMap so the preview matches what is sent.
 */
export function buildPreviewVariables(contact?: PreviewContact | null, company?: PreviewCompany | null): Record<string, string> {
    const now = new Date();
    const co = contact?.company || company || null;
    return {
        firstName: contact?.firstName || "",
        lastName: contact?.lastName || "",
        fullName: [contact?.firstName, contact?.lastName].filter(Boolean).join(" "),
        title: contact?.title || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
        linkedin: contact?.linkedin || "",
        company: co?.name || "",
        companyName: co?.name || "",
        industry: co?.industry || "",
        website: co?.website || "",
        country: co?.country || "",
        companySize: co?.size || "",
        companyPhone: company?.phone || "",
        currentDate: now.toLocaleDateString("fr-FR"),
        currentDay: now.toLocaleDateString("fr-FR", { weekday: "long" }),
        currentMonth: now.toLocaleDateString("fr-FR", { month: "long" }),
        currentYear: String(now.getFullYear()),
    };
}

/** Strip <script> tags from HTML before dangerouslySetInnerHTML preview. */
export function stripScripts(html: string): string {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}
