import type { Prisma } from "@prisma/client";

// ============================================
// DEFAULT PERMISSIONS PER ROLE
// ============================================
// Single source of truth for the permission set granted when an account is
// created — whether by a manager via POST /api/users or by an invitee
// activating a magic link via POST /api/invitations/accept.

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
    SDR: [
        "pages.dashboard",
        "pages.action",
        "pages.lists",
        "pages.opportunities",
        "pages.settings",
        "pages.email",
        "pages.comms",
        "features.export_data",
        "actions.make_calls",
        "actions.send_emails",
        "actions.send_linkedin",
        "actions.book_meetings",
        "actions.create_opportunity",
        "actions.edit_contacts",
    ],
    BOOKER: [
        "pages.dashboard",
        "pages.action",
        "pages.lists",
        "pages.opportunities",
        "pages.settings",
        "pages.email",
        "pages.comms",
        "features.export_data",
        "actions.make_calls",
        "actions.send_emails",
        "actions.book_meetings",
        "actions.create_opportunity",
        "actions.edit_contacts",
    ],
    BUSINESS_DEVELOPER: [
        "pages.dashboard",
        "pages.action",
        "pages.lists",
        "pages.opportunities",
        "pages.settings",
        "pages.email",
        "pages.comms",
        "pages.portfolio",
        "pages.onboarding",
        "pages.clients",
        "pages.missions",
        "pages.campaigns",
        "pages.projects",
        "features.create_mission",
        "features.edit_mission",
        "features.create_list",
        "features.edit_list",
        "features.import_lists",
        "features.export_data",
        "features.create_campaign",
        "features.edit_campaign",
        "features.create_client",
        "features.edit_client",
        "actions.make_calls",
        "actions.send_emails",
        "actions.send_linkedin",
        "actions.book_meetings",
        "actions.create_opportunity",
        "actions.edit_contacts",
    ],
    MANAGER: [
        "pages.dashboard",
        "pages.clients",
        "pages.missions",
        "pages.campaigns",
        "pages.lists",
        "pages.analytics",
        "pages.planning",
        "pages.files",
        "pages.users",
        "pages.sdrs",
        "pages.projects",
        "pages.settings",
        "pages.email",
        "pages.comms",
        "pages.billing",
        "pages.prospects",
        "features.create_mission",
        "features.edit_mission",
        "features.delete_mission",
        "features.assign_sdr",
        "features.create_list",
        "features.edit_list",
        "features.delete_list",
        "features.import_lists",
        "features.export_data",
        "features.create_campaign",
        "features.edit_campaign",
        "features.delete_campaign",
        "features.create_client",
        "features.edit_client",
        "features.delete_client",
        "features.create_user",
        "features.edit_user",
        "features.delete_user",
        "features.manage_permissions",
        "features.ban_user",
        "features.upload_files",
        "features.delete_files",
        "features.manage_folders",
        "features.create_invoice",
        "features.validate_invoice",
        "features.sync_payments",
        "features.confirm_payment",
        "features.manage_prospect_rules",
        "features.review_prospects",
        "features.configure_prospect_sources",
        "features.activate_prospects",
        "actions.make_calls",
        "actions.send_emails",
        "actions.send_linkedin",
        "actions.book_meetings",
        "actions.create_opportunity",
        "actions.edit_contacts",
    ],
    CLIENT: [
        "pages.dashboard",
        "pages.analytics",
        "pages.files",
    ],
    COMMERCIAL: [
        "pages.dashboard",
    ],
    DEVELOPER: [
        "pages.dashboard",
        "pages.projects",
        "pages.settings",
        "pages.files",
        "features.upload_files",
        "features.manage_folders",
    ],
};

// Used to lazily create a Permission row when the code is not seeded yet.
export const PERMISSION_DEFINITIONS: Record<string, { name: string; category: string }> = {
    "pages.dashboard": { name: "Dashboard", category: "pages" },
    "pages.action": { name: "Actions", category: "pages" },
    "pages.lists": { name: "Listes", category: "pages" },
    "pages.opportunities": { name: "Opportunités", category: "pages" },
    "pages.settings": { name: "Paramètres", category: "pages" },
    "pages.email": { name: "Email Hub", category: "pages" },
    "pages.comms": { name: "Messages", category: "pages" },
    "pages.clients": { name: "Clients", category: "pages" },
    "pages.missions": { name: "Missions", category: "pages" },
    "pages.campaigns": { name: "Campagnes", category: "pages" },
    "pages.analytics": { name: "Analytics", category: "pages" },
    "pages.planning": { name: "Planning", category: "pages" },
    "pages.files": { name: "Fichiers", category: "pages" },
    "pages.users": { name: "Utilisateurs", category: "pages" },
    "pages.sdrs": { name: "SDRs", category: "pages" },
    "pages.projects": { name: "Projets", category: "pages" },
    "pages.portfolio": { name: "Portfolio", category: "pages" },
    "pages.onboarding": { name: "Onboarding", category: "pages" },
    "pages.billing": { name: "Facturation", category: "pages" },
    "pages.prospects": { name: "Prospects", category: "pages" },
    "features.export_data": { name: "Exporter données", category: "features" },
    "features.create_mission": { name: "Créer mission", category: "features" },
    "features.edit_mission": { name: "Modifier mission", category: "features" },
    "features.delete_mission": { name: "Supprimer mission", category: "features" },
    "features.assign_sdr": { name: "Assigner SDR", category: "features" },
    "features.create_list": { name: "Créer liste", category: "features" },
    "features.edit_list": { name: "Modifier liste", category: "features" },
    "features.delete_list": { name: "Supprimer liste", category: "features" },
    "features.import_lists": { name: "Importer listes", category: "features" },
    "features.create_campaign": { name: "Créer campagne", category: "features" },
    "features.edit_campaign": { name: "Modifier campagne", category: "features" },
    "features.delete_campaign": { name: "Supprimer campagne", category: "features" },
    "features.create_client": { name: "Créer client", category: "features" },
    "features.edit_client": { name: "Modifier client", category: "features" },
    "features.delete_client": { name: "Supprimer client", category: "features" },
    "features.create_user": { name: "Créer utilisateur", category: "features" },
    "features.edit_user": { name: "Modifier utilisateur", category: "features" },
    "features.delete_user": { name: "Supprimer utilisateur", category: "features" },
    "features.manage_permissions": { name: "Gérer permissions", category: "features" },
    "features.ban_user": { name: "Bannir utilisateur", category: "features" },
    "features.upload_files": { name: "Uploader fichiers", category: "features" },
    "features.delete_files": { name: "Supprimer fichiers", category: "features" },
    "features.manage_folders": { name: "Gérer dossiers", category: "features" },
    "features.create_invoice": { name: "Créer facture", category: "features" },
    "features.validate_invoice": { name: "Valider facture", category: "features" },
    "features.sync_payments": { name: "Synchroniser paiements", category: "features" },
    "features.confirm_payment": { name: "Confirmer paiement", category: "features" },
    "features.manage_prospect_rules": { name: "Gérer règles prospects", category: "features" },
    "features.review_prospects": { name: "Réviser prospects", category: "features" },
    "features.configure_prospect_sources": { name: "Configurer sources prospects", category: "features" },
    "features.activate_prospects": { name: "Activer prospects", category: "features" },
    "actions.make_calls": { name: "Passer appels", category: "actions" },
    "actions.send_emails": { name: "Envoyer emails", category: "actions" },
    "actions.send_linkedin": { name: "Envoyer LinkedIn", category: "actions" },
    "actions.book_meetings": { name: "Réserver RDV", category: "actions" },
    "actions.create_opportunity": { name: "Créer opportunité", category: "actions" },
    "actions.edit_contacts": { name: "Modifier contacts", category: "actions" },
};

type PermissionTx = Pick<Prisma.TransactionClient, "permission" | "userPermission">;

/**
 * Grants the default permission set for `role` to `userId`.
 * Missing Permission rows are created on the fly from PERMISSION_DEFINITIONS.
 * Must run inside a transaction (pass the `tx` client).
 */
export async function assignDefaultPermissions(
    tx: PermissionTx,
    userId: string,
    role: string,
): Promise<number> {
    const defaultPermissionCodes = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    if (defaultPermissionCodes.length === 0) return 0;

    const existingPermissions = await tx.permission.findMany({
        where: { code: { in: defaultPermissionCodes } },
        select: { id: true, code: true },
    });
    const permissionMap = new Map<string, string>(
        existingPermissions.map((p) => [p.code, p.id]),
    );

    const missingCodes = defaultPermissionCodes.filter((code) => !permissionMap.has(code));
    for (const code of missingCodes) {
        const def = PERMISSION_DEFINITIONS[code];
        if (!def) continue;
        const permission = await tx.permission.create({
            data: { code, name: def.name, category: def.category },
        });
        permissionMap.set(code, permission.id);
    }

    const userPermissionsToCreate = Array.from(permissionMap.values()).map((permissionId) => ({
        userId,
        permissionId,
        granted: true,
    }));

    if (userPermissionsToCreate.length === 0) return 0;

    const result = await tx.userPermission.createMany({
        data: userPermissionsToCreate,
        skipDuplicates: true,
    });
    return result.count;
}
