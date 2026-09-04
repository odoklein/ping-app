"use client";

import { useMemo } from "react";
import { CalendarCheck2, Video } from "lucide-react";
import { OnboardingWizard, BulletList, InfoTile, type WizardStep } from "./OnboardingWizard";
import type { BookingLink, OnboardingContext } from "./types";

export function CommercialOnboardingModal({
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
    const interlocuteur = context?.interlocuteur ?? null;
    const bookingLinks = useMemo<BookingLink[]>(
        () =>
            Array.isArray(interlocuteur?.bookingLinks)
                ? (interlocuteur.bookingLinks as BookingLink[])
                : [],
        [interlocuteur],
    );

    const steps: WizardStep[] = useMemo(
        () => [
            {
                label: "Vos RDV",
                title: "Vos rendez-vous qualifiés",
                subtitle:
                    "Chaque RDV décroché par un SDR pour votre secteur apparaît ici, avec le compte rendu de l'appel et le contexte du prospect.",
                icon: CalendarCheck2,
                accent: "bg-teal-100 text-teal-600",
                content: (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InfoTile
                                label="Compte"
                                value={interlocuteur?.client?.name ?? "—"}
                            />
                            <InfoTile
                                label="Secteur / territoire"
                                value={interlocuteur?.territory || "Non segmenté"}
                            />
                        </div>
                        <BulletList
                            items={[
                                "Un email vous prévient dès qu'un rendez-vous vous est attribué.",
                                "Le compte rendu du SDR précise le besoin exprimé et le niveau de maturité.",
                                "Vous pouvez confirmer ou signaler un RDV non pertinent directement depuis la fiche.",
                            ]}
                        />
                    </div>
                ),
            },
            {
                label: "Agenda",
                title: "Votre lien de visio",
                subtitle:
                    "Les SDR proposent votre créneau au prospect pendant l'appel. Un lien à jour évite les allers-retours par email.",
                icon: Video,
                accent: "bg-blue-100 text-blue-600",
                content: (
                    <div className="space-y-4">
                        {bookingLinks.length > 0 ? (
                            <div className="space-y-2">
                                {bookingLinks.map((link) => (
                                    <div
                                        key={link.url}
                                        className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
                                    >
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {link.label || "Prise de rendez-vous"}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-800 break-all">
                                            {link.url}
                                        </p>
                                        {link.durationMinutes ? (
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                Créneaux de {link.durationMinutes} min
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                                Aucun lien de visio n&apos;est encore enregistré. Transmettez votre lien
                                Calendly, Cal.com ou Google Meet à votre contact chez le client pour que
                                les SDR puissent le proposer en direct.
                            </p>
                        )}
                        <BulletList
                            items={[
                                "Gardez des créneaux ouverts sur les 5 prochains jours ouvrés : au-delà, le taux de présence chute.",
                                "Vérifiez que votre agenda est synchronisé pour éviter les doubles réservations.",
                            ]}
                        />
                    </div>
                ),
            },
        ],
        [interlocuteur, bookingLinks],
    );

    return (
        <OnboardingWizard
            isOpen={isOpen}
            badge="Onboarding Commercial"
            heading="Vos rendez-vous qualifiés vous attendent"
            steps={steps}
            completeLabel="Accéder à mes rendez-vous"
            onComplete={() => onComplete("/commercial/portal")}
            onSkip={onSkip}
        />
    );
}
