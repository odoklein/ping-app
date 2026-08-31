// ============================================
// USER AVAILABILITY
// Stored inside User.preferences.availability (no dedicated table).
// Used for capacity planning and block-booking checks when assigning
// tasks / meetings to a team member.
// ============================================

export interface TimeOffBlock {
    id: string;
    from: string; // ISO date (YYYY-MM-DD)
    to: string;   // ISO date (YYYY-MM-DD), inclusive
    reason?: string;
}

export interface UserAvailability {
    /** Hours available per ISO weekday. Keys "1"=Mon .. "7"=Sun. */
    weeklyHours: Record<string, number>;
    /** One-off unavailable date ranges (holidays, leave, etc.). */
    timeOff: TimeOffBlock[];
}

export const DEFAULT_AVAILABILITY: UserAvailability = {
    weeklyHours: { "1": 8, "2": 8, "3": 8, "4": 8, "5": 8, "6": 0, "7": 0 },
    timeOff: [],
};

/** Safely read an availability object out of a User.preferences JSON blob. */
export function readAvailability(preferences: unknown): UserAvailability {
    const prefs = (preferences ?? {}) as Record<string, unknown>;
    const raw = prefs.availability as Partial<UserAvailability> | undefined;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_AVAILABILITY };
    return {
        weeklyHours: { ...DEFAULT_AVAILABILITY.weeklyHours, ...(raw.weeklyHours || {}) },
        timeOff: Array.isArray(raw.timeOff) ? raw.timeOff : [],
    };
}

/** Merge an availability object back into a preferences blob for persistence. */
export function writeAvailability(preferences: unknown, availability: UserAvailability): Record<string, unknown> {
    const prefs = (preferences ?? {}) as Record<string, unknown>;
    return { ...prefs, availability };
}

/** ISO weekday for a date: 1 (Mon) .. 7 (Sun). */
export function isoWeekday(date: Date): number {
    const d = date.getDay(); // 0 (Sun) .. 6 (Sat)
    return d === 0 ? 7 : d;
}

function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Is the given date inside any time-off block? Returns the block if so. */
export function findTimeOff(availability: UserAvailability, date: Date): TimeOffBlock | null {
    const key = toDateKey(date);
    for (const block of availability.timeOff) {
        if (key >= block.from && key <= block.to) return block;
    }
    return null;
}

/** Capacity (available hours) for a member on a specific date. */
export function capacityForDate(availability: UserAvailability, date: Date): number {
    if (findTimeOff(availability, date)) return 0;
    return availability.weeklyHours[String(isoWeekday(date))] ?? 0;
}

export type AvailabilityStatus = "available" | "tight" | "overbooked" | "off";

export interface AvailabilityCheck {
    status: AvailabilityStatus;
    capacity: number;   // hours available that day
    load: number;       // hours already assigned that day
    remaining: number;  // capacity - load
    reason?: string;    // e.g. time-off reason
    message: string;    // human-readable summary (French)
}

/**
 * Evaluate whether a member can take on `addedHours` of work on `date`,
 * given their availability and existing `load` (already-assigned hours).
 */
export function checkAvailability(
    availability: UserAvailability,
    date: Date,
    load: number,
    addedHours = 0,
): AvailabilityCheck {
    const off = findTimeOff(availability, date);
    if (off) {
        return {
            status: "off",
            capacity: 0,
            load,
            remaining: 0,
            reason: off.reason,
            message: off.reason ? `Absent : ${off.reason}` : "Absent ce jour",
        };
    }

    const capacity = capacityForDate(availability, date);
    const remaining = capacity - load;
    const projected = load + addedHours;

    if (capacity <= 0) {
        return { status: "off", capacity, load, remaining, message: "Non travaillé ce jour" };
    }
    if (projected > capacity) {
        return {
            status: "overbooked",
            capacity, load, remaining,
            message: `Surchargé : ${projected.toFixed(1)}h / ${capacity}h`,
        };
    }
    if (projected > capacity * 0.85) {
        return {
            status: "tight",
            capacity, load, remaining,
            message: `Chargé : ${remaining.toFixed(1)}h restantes`,
        };
    }
    return {
        status: "available",
        capacity, load, remaining,
        message: `Disponible : ${remaining.toFixed(1)}h restantes`,
    };
}
