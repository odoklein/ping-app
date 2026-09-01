-- ==============================================================================
-- SUZALINK - FRENCH MARKET SDR PROSPECTING STATUSES & QUALIFICATIONS
-- Exécutez ce script dans Neon SQL Editor pour injecter tous les statuts standards du marché français
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure all enum values exist in ActionResult
DO $$ BEGIN
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'NO_RESPONSE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'BAD_CONTACT';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'BARRAGE_STANDARD';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'NUMERO_KO';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'INTERESTED';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'CALLBACK_REQUESTED';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'MEETING_BOOKED';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'MEETING_CANCELLED';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'INVALIDE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'DISQUALIFIED';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'ENVOIE_MAIL';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'MAIL_ENVOYE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'REFUS';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'REFUS_ARGU';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'REFUS_CATEGORIQUE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'RELANCE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'RAPPEL';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'GERE_PAR_SIEGE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'FAUX_NUMERO';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'PROJET_A_SUIVRE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'MAUVAIS_INTERLOCUTEUR';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'MAIL_UNIQUEMENT';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'BARRAGE_SECRETAIRE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'MAIL_DOC';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'HORS_CIBLE';
    ALTER TYPE "ActionResult" ADD VALUE IF NOT EXISTS 'NOT_INTERESTED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Upsert Result Categories (Catégories globales de reporting)
INSERT INTO "ResultCategory" ("id", "code", "label", "color", "sortOrder", "description", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'MEETING_BOOKED', 'RDV pris', '#10b981', 1, 'Rendez-vous obtenu / qualifié', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'CALLBACK_REQUESTED', 'Rappel demandé / Relance', '#f59e0b', 2, 'Le contact a demandé un rappel ou une relance à date', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'INTERESTED', 'Intéressé / Projet', '#6366f1', 3, 'Prospect intéressé ou projet à suivre', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'NO_RESPONSE', 'Non joint / Répondeur', '#64748b', 4, 'Pas de réponse ou répondeur', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'DISQUALIFIED', 'Refus / Hors cible', '#ef4444', 5, 'Refus ou prospect non éligible', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'OTHER', 'Autre / Standard', '#94a3b8', 6, 'Barrage standard ou traitement administratif', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
    "label" = EXCLUDED."label",
    "color" = EXCLUDED."color",
    "sortOrder" = EXCLUDED."sortOrder",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP;

-- 4. Upsert Global Action Status Definitions (Statuts SDR marché français dans le panneau latéral)
INSERT INTO "ActionStatusDefinition" (
    "id",
    "scopeType",
    "scopeId",
    "code",
    "label",
    "color",
    "sortOrder",
    "requiresNote",
    "priorityLabel",
    "priorityOrder",
    "triggersOpportunity",
    "triggersCallback",
    "resultCategoryCode",
    "isActive",
    "updatedAt"
)
VALUES
    -- RDV & Positifs
    (gen_random_uuid()::text, 'GLOBAL', '', 'MEETING_BOOKED', 'RDV Pris', '#10b981', 1, false, 'SKIP', 999, true, false, 'MEETING_BOOKED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'INTERESTED', 'Intéressé', '#6366f1', 2, true, 'FOLLOW_UP', 2, true, false, 'INTERESTED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'PROJET_A_SUIVRE', 'Projet à suivre', '#8b5cf6', 3, true, 'FOLLOW_UP', 2, true, false, 'INTERESTED', true, CURRENT_TIMESTAMP),

    -- Rappels & Relances
    (gen_random_uuid()::text, 'GLOBAL', '', 'CALLBACK_REQUESTED', 'Rappel demandé', '#f59e0b', 4, true, 'CALLBACK', 1, false, true, 'CALLBACK_REQUESTED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'RAPPEL', 'Rappel à date', '#f59e0b', 5, true, 'CALLBACK', 1, false, true, 'CALLBACK_REQUESTED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'RELANCE', 'Relance', '#eab308', 6, true, 'CALLBACK', 1, false, true, 'CALLBACK_REQUESTED', true, CURRENT_TIMESTAMP),

    -- Mails & Doc
    (gen_random_uuid()::text, 'GLOBAL', '', 'MAIL_DOC', 'Envoi documentation', '#0ea5e9', 7, true, 'FOLLOW_UP', 3, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'MAIL_UNIQUEMENT', 'Mail uniquement', '#38bdf8', 8, false, 'SKIP', 999, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'ENVOIE_MAIL', 'Mail à envoyer', '#0284c7', 9, true, 'SKIP', 999, false, false, 'OTHER', true, CURRENT_TIMESTAMP),

    -- Non joints & Standard
    (gen_random_uuid()::text, 'GLOBAL', '', 'NO_RESPONSE', 'Pas de réponse / Répondeur', '#94a3b8', 10, false, 'RETRY', 4, false, false, 'NO_RESPONSE', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'BARRAGE_SECRETAIRE', 'Barrage secrétaire / assistante', '#e2e8f0', 11, false, 'RETRY', 4, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'BARRAGE_STANDARD', 'Barrage standard', '#cbd5e1', 12, false, 'RETRY', 4, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'MAUVAIS_INTERLOCUTEUR', 'Mauvais interlocuteur', '#cbd5e1', 13, false, 'RETRY', 4, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'GERE_PAR_SIEGE', 'Géré par le siège', '#94a3b8', 14, false, 'SKIP', 999, false, false, 'OTHER', true, CURRENT_TIMESTAMP),

    -- Numéros invalides & Injoignables
    (gen_random_uuid()::text, 'GLOBAL', '', 'NUMERO_KO', 'Numéro non attribué / KO', '#f87171', 15, false, 'SKIP', 999, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'FAUX_NUMERO', 'Faux numéro', '#f87171', 16, false, 'SKIP', 999, false, false, 'OTHER', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'INVALIDE', 'Fiche Invalide', '#ef4444', 17, false, 'SKIP', 999, false, false, 'OTHER', true, CURRENT_TIMESTAMP),

    -- Refus & Hors cible
    (gen_random_uuid()::text, 'GLOBAL', '', 'REFUS', 'Refus simple', '#dc2626', 18, false, 'SKIP', 999, false, false, 'DISQUALIFIED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'REFUS_ARGU', 'Refus argumenté (Pas de budget / Equipé)', '#b91c1c', 19, true, 'SKIP', 999, false, false, 'DISQUALIFIED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'REFUS_CATEGORIQUE', 'Refus catégorique / Ne plus appeler', '#991b1b', 20, false, 'SKIP', 999, false, false, 'DISQUALIFIED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'HORS_CIBLE', 'Hors cible / Non éligible', '#7f1d1d', 21, false, 'SKIP', 999, false, false, 'DISQUALIFIED', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'GLOBAL', '', 'DISQUALIFIED', 'Disqualifié', '#7f1d1d', 22, false, 'SKIP', 999, false, false, 'DISQUALIFIED', true, CURRENT_TIMESTAMP)

ON CONFLICT ("scopeType", "scopeId", "code") DO UPDATE SET
    "label" = EXCLUDED."label",
    "color" = EXCLUDED."color",
    "sortOrder" = EXCLUDED."sortOrder",
    "requiresNote" = EXCLUDED."requiresNote",
    "priorityLabel" = EXCLUDED."priorityLabel",
    "priorityOrder" = EXCLUDED."priorityOrder",
    "triggersOpportunity" = EXCLUDED."triggersOpportunity",
    "triggersCallback" = EXCLUDED."triggersCallback",
    "resultCategoryCode" = EXCLUDED."resultCategoryCode",
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

-- 5. Résultat
SELECT "sortOrder", "code", "label", "resultCategoryCode", "priorityLabel"
FROM "ActionStatusDefinition"
WHERE "scopeType" = 'GLOBAL' AND "scopeId" = ''
ORDER BY "sortOrder" ASC;
