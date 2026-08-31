"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { IntakeSubmitDrawer } from "./IntakeSubmitDrawer";

/**
 * Persistent navbar trigger, injected once in AppLayoutShell's topbar so it
 * appears for every role. Only the button paints on first render — the drawer
 * (and its form state) doesn't mount its DOM until opened.
 */
export function IntakeTriggerButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="hidden h-8 items-center gap-1.5 rounded-lg border border-[#E8EBF0] bg-white px-3 text-[12px] font-semibold text-[#5A5A7A] transition-colors duration-150 hover:border-[#C5C8D4] hover:bg-[#F9FAFB] hover:text-[#12122A] sm:inline-flex"
                title="Signaler un bug ou une idée"
            >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Signaler</span>
            </button>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Signaler un bug ou une idée"
                title="Signaler un bug ou une idée"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8EBF0] text-[#8B8BA7] transition-colors duration-150 hover:border-[#C5C8D4] hover:text-[#12122A] sm:hidden"
            >
                <LifeBuoy className="w-3.5 h-3.5" />
            </button>
            <IntakeSubmitDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
