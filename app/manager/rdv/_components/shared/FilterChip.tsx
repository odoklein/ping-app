"use client";

import { X } from "lucide-react";

export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="rdv-filter-chip">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer le filtre ${label}`}
      >
        <X size={12} />
      </button>
    </span>
  );
}
