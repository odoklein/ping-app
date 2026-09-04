import type { UserRole } from "@prisma/client";

// ============================================
// INVITATION EMAIL TEMPLATE (Phase 2)
// ============================================
// Charte Ping / Élan: #080808 (encre), #2890F8 (accent), #f8f8f8 (fond),
// rayons de 12px, typographie DM Sans avec repli système.

export interface InvitationTemplateVariables {
    /** Raw UserRole key — drives the headline and the highlight list. */
    role: UserRole | string;
    recipientName: string;
    inviterName: string;
    roleLabel: string;
    roleDescription: string;
    inviteUrl: string;
    expiryDays: number;
    companyName: string;
    clientName?: string;
}

interface RoleCopy {
    label: string;
    headline: string;
    description: string;
    highlights: string[];
}

const ROLE_COPY: Record<string, RoleCopy> = {
    MANAGER: {
        label: "Manager",
        headline: "Vous avez été invité à piloter l'espace commercial",
        description:
            "Vous disposez d'un accès complet pour superviser les campagnes, planifier les équipes SDR et analyser les performances commerciales en temps réel.",
        highlights: [
            "Cockpit de pilotage et analytics consolidés",
            "Planification et capacité des équipes SDR",
            "Gestion des clients, missions et facturation",
        ],
    },
    SDR: {
        label: "SDR",
        headline: "Bienvenue dans la force de frappe commerciale",
        description:
            "Votre poste d'appel intelligent est configuré. Vous aurez accès aux scripts IA, aux listes de prospection qualifiées et à la prise de rendez-vous directe.",
        highlights: [
            "Poste d'appel avec numérotation intégrée",
            "Scripts et fiches objections assistés par IA",
            "Listes de prospection qualifiées et prise de RDV",
        ],
    },
    BOOKER: {
        label: "Booker",
        headline: "Bienvenue dans la force de frappe commerciale",
        description:
            "Votre poste d'appel intelligent est configuré. Vous aurez accès aux scripts IA, aux listes de prospection qualifiées et à la prise de rendez-vous directe.",
        highlights: [
            "Poste d'appel avec numérotation intégrée",
            "Scripts et fiches objections assistés par IA",
            "Listes de prospection qualifiées et prise de RDV",
        ],
    },
    CLIENT: {
        label: "Client",
        headline: "Votre portail de prospection est disponible",
        description:
            "Suivez en toute transparence l'avancée de vos missions, écoutez les enregistrements des réunions qualifiées et téléchargez vos livrables.",
        highlights: [
            "Suivi en direct de l'avancée de vos missions",
            "Réunions qualifiées, comptes rendus et enregistrements",
            "Livrables et exports disponibles à tout moment",
        ],
    },
    COMMERCIAL: {
        label: "Commercial",
        headline: "Vos rendez-vous qualifiés vous attendent",
        description:
            "Retrouvez les prospects qualifiés attribués à votre secteur et synchronisez votre calendrier pour recevoir les démonstrations.",
        highlights: [
            "Rendez-vous qualifiés attribués à votre secteur",
            "Synchronisation de votre agenda et lien de visio",
            "Historique et contexte complet de chaque prospect",
        ],
    },
    BUSINESS_DEVELOPER: {
        label: "Business Developer",
        headline: "Votre portefeuille commercial vous attend",
        description:
            "Pilotez l'onboarding de vos clients, construisez leurs playbooks et suivez la performance de votre portefeuille de bout en bout.",
        highlights: [
            "Portefeuille clients et onboarding structuré",
            "Construction des playbooks et des campagnes",
            "Suivi de performance par compte",
        ],
    },
    DEVELOPER: {
        label: "Développeur",
        headline: "Votre accès technique à la plateforme est prêt",
        description:
            "Vous disposez d'un accès aux projets, aux tickets techniques et à la documentation interne de la plateforme.",
        highlights: [
            "Projets, tâches et tickets techniques",
            "Documentation et référentiels internes",
            "Espace fichiers partagé",
        ],
    },
};

const DEFAULT_ROLE_COPY: RoleCopy = {
    label: "Collaborateur",
    headline: "Vous avez été invité à rejoindre la plateforme",
    description:
        "Votre espace de travail est prêt. Activez votre compte pour accéder aux outils de votre équipe.",
    highlights: ["Espace de travail dédié", "Outils collaboratifs de votre équipe"],
};

export function getRoleCopy(role: UserRole | string): RoleCopy {
    return ROLE_COPY[role as string] ?? DEFAULT_ROLE_COPY;
}

export function getRoleLabel(role: UserRole | string): string {
    return getRoleCopy(role).label;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const FONT_STACK =
    "'DM Sans','Segoe UI',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif";

export function buildInvitationSubject(vars: InvitationTemplateVariables): string {
    return `${vars.inviterName} vous invite à rejoindre ${vars.companyName} (${vars.roleLabel})`;
}

export function buildInvitationText(vars: InvitationTemplateVariables): string {
    const lines = [
        `Bonjour ${vars.recipientName},`,
        "",
        `${vars.inviterName} vous invite à rejoindre ${vars.companyName} en tant que ${vars.roleLabel}.`,
        vars.clientName ? `Compte rattaché : ${vars.clientName}` : "",
        "",
        vars.roleDescription,
        "",
        "Activez votre compte et définissez votre mot de passe ici :",
        vars.inviteUrl,
        "",
        `Ce lien est personnel et expire dans ${vars.expiryDays} jours.`,
        "Si vous n'attendiez pas cette invitation, ignorez simplement cet email.",
    ];
    return lines.filter((line) => line !== "").join("\n");
}

export function buildInvitationHtml(vars: InvitationTemplateVariables): string {
    const copy = {
        recipientName: escapeHtml(vars.recipientName),
        inviterName: escapeHtml(vars.inviterName),
        roleLabel: escapeHtml(vars.roleLabel),
        roleDescription: escapeHtml(vars.roleDescription),
        companyName: escapeHtml(vars.companyName),
        clientName: vars.clientName ? escapeHtml(vars.clientName) : null,
        inviteUrl: vars.inviteUrl,
    };

    const roleCopy = getRoleCopy(vars.role);
    const highlights = roleCopy.highlights;
    const highlightRows = highlights
        .map(
            (item) => `
              <tr>
                <td style="padding:0 0 10px;vertical-align:top;width:22px;">
                  <div style="width:16px;height:16px;border-radius:8px;background:#2890F8;color:#ffffff;font-size:10px;line-height:16px;text-align:center;font-weight:700;">&#10003;</div>
                </td>
                <td style="padding:0 0 10px 10px;font-size:13px;line-height:1.5;color:#4a4a4a;">${escapeHtml(item)}</td>
              </tr>`,
        )
        .join("");

    const clientRow = copy.clientName
        ? `
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#8a8a8a;width:110px;">Compte</td>
                <td style="padding:6px 0;font-size:13px;color:#080808;font-weight:600;">${copy.clientName}</td>
              </tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>Invitation ${copy.companyName}</title>
</head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:${FONT_STACK};color:#080808;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${copy.inviterName} vous invite à rejoindre ${copy.companyName} en tant que ${copy.roleLabel}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Marque -->
          <tr>
            <td style="padding:0 4px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:19px;font-weight:800;letter-spacing:-0.02em;color:#080808;">${copy.companyName}</td>
                  <td align="right">
                    <span style="display:inline-block;padding:5px 10px;border-radius:8px;background:#EAF3FE;color:#2890F8;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">Invitation ${copy.roleLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Carte principale -->
          <tr>
            <td style="background:#ffffff;border:1px solid #ebebeb;border-radius:12px;padding:32px 30px;">
              <p style="margin:0 0 6px;font-size:13px;color:#8a8a8a;">Bonjour ${copy.recipientName},</p>
              <h1 style="margin:0 0 14px;font-size:23px;line-height:1.28;font-weight:800;letter-spacing:-0.02em;color:#080808;">
                ${escapeHtml(roleCopy.headline)}
              </h1>
              <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#4a4a4a;">
                <strong style="color:#080808;">${copy.inviterName}</strong> vous a invité à rejoindre
                <strong style="color:#080808;">${copy.companyName}</strong>. ${copy.roleDescription}
              </p>

              <!-- Récapitulatif -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:12px;padding:14px 16px;margin:0 0 24px;">
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#8a8a8a;width:110px;">Rôle</td>
                  <td style="padding:6px 0;font-size:13px;color:#080808;font-weight:600;">${copy.roleLabel}</td>
                </tr>${clientRow}
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#8a8a8a;width:110px;">Invité par</td>
                  <td style="padding:6px 0;font-size:13px;color:#080808;font-weight:600;">${copy.inviterName}</td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr>
                  <td style="border-radius:12px;background:#2890F8;">
                    <a href="${copy.inviteUrl}" style="display:inline-block;padding:14px 26px;border-radius:12px;background:#2890F8;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:-0.01em;">
                      Activer mon compte &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 26px;font-size:12px;line-height:1.6;color:#a0a0a0;">
                Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br />
                <a href="${copy.inviteUrl}" style="color:#2890F8;word-break:break-all;text-decoration:none;">${copy.inviteUrl}</a>
              </p>

              <div style="height:1px;background:#f0f0f0;margin:0 0 22px;"></div>

              <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8a8a8a;">
                Ce qui vous attend
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${highlightRows}
              </table>
            </td>
          </tr>

          <!-- Pied -->
          <tr>
            <td style="padding:18px 6px 0;">
              <p style="margin:0 0 6px;font-size:12px;color:#8a8a8a;">
                Lien personnel &middot; expire dans ${vars.expiryDays} jours &middot; connexion chiffrée TLS
              </p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#b4b4b4;">
                Vous n'attendiez pas cette invitation ? Ignorez cet email, aucun compte ne sera créé.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the full transactional payload for an invitation email.
 * `role` drives both the copy blocks and the highlight list.
 */
export function renderInvitationEmail(params: {
    role: UserRole | string;
    recipientName: string;
    inviterName: string;
    inviteUrl: string;
    expiryDays?: number;
    companyName?: string;
    clientName?: string | null;
}): { subject: string; html: string; text: string } {
    const roleCopy = getRoleCopy(params.role);
    const vars: InvitationTemplateVariables = {
        role: params.role,
        recipientName: params.recipientName,
        inviterName: params.inviterName,
        roleLabel: roleCopy.label,
        roleDescription: roleCopy.description,
        inviteUrl: params.inviteUrl,
        expiryDays: params.expiryDays ?? 7,
        companyName: params.companyName ?? "Prospecto",
        clientName: params.clientName ?? undefined,
    };

    return {
        subject: buildInvitationSubject(vars),
        html: buildInvitationHtml(vars),
        text: buildInvitationText(vars),
    };
}
