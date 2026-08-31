"use client";

import { usePathname } from "next/navigation";

/**
 * Silent metadata captured when the intake drawer opens — never shown to the
 * reporter, never editable. Read fresh each time (not memoized/polled) since it
 * only matters at the moment of submission.
 */
export function useIntakeMetadata() {
    const pathname = usePathname();

    function capture() {
        return {
            sourceRoute: pathname || "unknown",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
            viewport:
                typeof window !== "undefined"
                    ? `${window.innerWidth}x${window.innerHeight}`
                    : null,
        };
    }

    return { capture };
}
