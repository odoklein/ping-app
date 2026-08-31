"use client";

import { useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        className="rdv-filter-section-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {title}
        {open ? (
          <ChevronUp size={14} style={{ color: "var(--ink3)" }} />
        ) : (
          <ChevronDown size={14} style={{ color: "var(--ink3)" }} />
        )}
      </button>
      {open && (
        <div className="rdv-filter-section-content">
          {children}
        </div>
      )}
    </div>
  );
}
