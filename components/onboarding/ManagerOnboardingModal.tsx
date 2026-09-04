"use client";

import { useMemo } from "react";
import { KeyRound, LayoutDashboard, UserPlus } from "lucide-react";
import { OnboardingWizard, BulletList, InfoTile, type WizardStep } from "./OnboardingWizard";
import type { OnboardingContext } from "./types";

export function ManagerOnboardingModal({
    isOpen,
    context,
    onComplete,
    onSkip,
}: {
    isOpen: boolean;
    context: OnboardingContext | null;
    onComplete: (redirectTo?: string) => Promise<void> | void;
    onSkip?: () => Promise<void> | void;
}) {
    const cockpit = context?.cockpit;

    const steps: WizardStep[] = useMemo(
        () => [
            {
                label: "Cockpit",
                title: "Votre cockpit de pilotage",
                subtitle:
                    "Le dashboard agrège l'activité de toutes les missions : volume d'appels, RDV obtenus, taux de conversion et charge par SDR.",
                icon: LayoutDashboard,
                accent: "bg-indigo-100 text-indigo-600",
                content: (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <InfoTile label="Clients" value={String(cockpit?.clientCount ?? 0)} />
                            <InfoTile
                                label="Missions actives"
                                value={String(cockpit?.missionCount ?? 0)}
                            />
                            <InfoTile label="SDR actifs" value={String(cockpit?.sdrCount ?? 0)} />
                            <InfoTile
                                label="Invitations"
                                value={String(cockpit?.pendingInvitations ?? 0)}
                                hint="en attente"
                            />
                        </div>
                        <BulletList
                            items={[
                                "Analytics : performance par mission, par SDR et par liste, sur la période de votre choix.",
                                "Planning : capacité mensuelle, absences et allocation journalière de chaque SDR.",
                                "Prospects : règles d'orchestration et revue des profils avant activation.",
                            ]}
                        />
                    </div>
                ),
            },
            {
                label: "Équipe",
                title: "Constituez votre équipe par invitation",
                subtitle:
                    "Vous ne créez plus de mots de passe à la main : vous envoyez une invitation, et le collaborateur définit lui-même son mot de passe.",
                icon: UserPlus,
                accent: "bg-blue-100 text-blue-600",
                content: (
                    <div className="space-y-4">
                        <BulletList
                            items={[
                                "Utilisateurs → « Inviter un collaborateur » : nom, email, rôle, et pré-configuration de la ligne VoIP pour un SDR.",
                                "Pour un rôle Client ou Commercial, le rattachement à un compte client est obligatoire.",
                                "L'onglet « Invitations en cours » permet de renvoyer, copier le lien ou révoquer un accès.",
                                "Un lien d'activation expire au bout de 7 jours ; une révocation le coupe immédiatement.",
                            ]}
                        />
                        <p className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                            Le collaborateur reçoit un email adapté à son rôle, et son propre parcours
                            d&apos;onboarding se déclenche à sa première connexion.
                        </p>
                    </div>
                ),
            },
            {
                label: "Intégrations",
                title: "Clés API & intégrations",
                subtitle:
                    "Les paramètres regroupent la téléphonie, la messagerie et les connexions externes de la plateforme.",
                icon: KeyRound,
                accent: "bg-violet-100 text-violet-600",
                content: (
                    <BulletList
                        items={[
                            "Téléphonie : WithAllo, Onoff Business et Ringover — la ligne est attribuée par utilisateur.",
                            "Email Hub : boîtes partagées, séquences et templates transactionnels.",
                            "Clés API : accès programmatique aux listes et aux actions, révocables à tout moment.",
                            "Enrichissement & IA : sources de prospects, scripts et fiches objections.",
                        ]}
                    />
                ),
            },
        ],
        [cockpit],
    );

    return (
        <OnboardingWizard
            isOpen={isOpen}
            badge="Onboarding Manager"
            heading="Prenez la main sur votre espace commercial"
            steps={steps}
            completeLabel="Ouvrir mon cockpit"
            onComplete={() => onComplete("/manager/dashboard")}
            onSkip={onSkip}
        />
    );
}
