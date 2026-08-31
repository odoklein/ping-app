"use client";

import { CalendarX2 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="rdv-empty-state">
      <div><CalendarX2 size={24} /></div>
      <strong>Aucun rendez-vous ici</strong>
      <p>Élargissez la période ou réinitialisez les filtres pour retrouver vos rendez-vous.</p>
    </div>
  );
}
