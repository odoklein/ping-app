"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import {
    Loader2,
    Calendar,
    X,
    Mail,
    Phone,
    Building2,
    CheckCircle2,
    Copy,
    Video,
    MapPin,
    Clock,
    User,
    Check,
    CalendarCheck,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackMeetingBooked } from "@/lib/analytics/umami";

// ============================================
// TYPES
// ============================================

export interface BookingContactInfo {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    companyName?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    linkedin?: string | null;
    website?: string | null;
}

export interface SdrBookingLink {
    label: string;
    url: string;
    durationMinutes: number;
}

export interface SdrContactEntry {
    value: string;
    label: string;
    isPrimary: boolean;
}

export interface SdrInterlocuteur {
    id: string;
    firstName: string;
    lastName: string;
    title?: string;
    department?: string;
    territory?: string;
    emails: SdrContactEntry[];
    phones: SdrContactEntry[];
    bookingLinks: SdrBookingLink[];
    notes?: string;
    isActive: boolean;
}

interface BookingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    bookingUrl: string;
    contactId?: string;
    companyId?: string;
    contactName: string;
    contactInfo?: BookingContactInfo;
    rdvDate?: string;
    meetingType?: "VISIO" | "PHYSIQUE" | "TELEPHONIQUE";
    meetingCategory?: "EXPLORATOIRE" | "BESOIN";
    meetingAddress?: string;
    meetingJoinUrl?: string;
    meetingPhone?: string;
    onRdvDateChange?: (value: string) => void;
    onMeetingTypeChange?: (value: "VISIO" | "PHYSIQUE" | "TELEPHONIQUE" | "") => void;
    onMeetingCategoryChange?: (value: "EXPLORATOIRE" | "BESOIN" | "") => void;
    onMeetingAddressChange?: (value: string) => void;
    onMeetingJoinUrlChange?: (value: string) => void;
    onMeetingPhoneChange?: (value: string) => void;
    onBookingSuccess?: () => void;
    interlocuteurs?: SdrInterlocuteur[];
}

interface CalendarOption {
    id: string;
    label: string;
    sublabel?: string;
    url: string;
    interlocuteurId?: string;
    initials?: string;
    avatarColor?: string;
}

const AVATAR_COLORS = [
    "bg-[#dbe4df] text-[#0c3b38]",
    "bg-[#fff1d6] text-[#e07c00]",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-[#ece5d8] text-[#394b46]",
    "bg-[#f4f0e8] text-[#5c6e69]",
];

function hashStr(s: string) {
    return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function getEmbedBookingUrl(rawUrl: string): string {
    try {
        const url = new URL(rawUrl);
        if (
            url.hostname === "cal.com" ||
            url.hostname.endsWith(".cal.com") ||
            url.hostname === "cal.eu" ||
            url.hostname.endsWith(".cal.eu")
        ) {
            url.searchParams.set("embed", "true");
        }
        if (url.hostname.endsWith("calendly.com") || url.hostname === "calendly.com") {
            url.searchParams.set("embed_domain", typeof window !== "undefined" ? window.location.hostname : "localhost");
            url.searchParams.set("embed_type", "Inline");
            url.searchParams.set("hide_gdpr_banner", "1");
        }
        return url.toString();
    } catch {
        return rawUrl;
    }
}

// ── Typewriter hook
// ── Copy pill button
function CopyPill({ text, label }: { text: string; label: string }) {
    const { success } = useToast();
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard.writeText(text);
                success("Copié", `${label} dans le presse-papier`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            title={`Copier ${label}`}
            className="ml-auto shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded transition-colors"
        >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
    );
}

// ── Animated fade-in wrapper (appears after a delay)
// ── Format date for display
function formatRdvDate(iso: string): string {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

const MEETING_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; colorClass: string }> = {
    VISIO: { label: "Visio", icon: Video, colorClass: "text-indigo-600" },
    PHYSIQUE: { label: "Physique", icon: MapPin, colorClass: "text-emerald-600" },
    TELEPHONIQUE: { label: "Téléphonique", icon: Phone, colorClass: "text-amber-600" },
};

const MEETING_CATEGORY_LABELS: Record<string, string> = {
    EXPLORATOIRE: "Exploratoire",
    BESOIN: "Analyse de besoin",
};

// ── Extract date from calendar postMessage event data (client-side mirror of API's extractScheduledStartTime)
function extractDateFromEventData(eventData: unknown): string | null {
    if (!eventData || typeof eventData !== "object") return null;
    const data = eventData as Record<string, unknown>;
    const candidates = [
        data.invitee_start_time,
        data.start_time,
        data.startTime,
        data.scheduled_start,
        data.start,
        (data.payload as Record<string, unknown> | undefined)?.invitee_start_time,
        (data.payload as Record<string, unknown> | undefined)?.start_time,
        (data.event as Record<string, unknown> | undefined)?.start_time,
        (data.event as Record<string, unknown> | undefined)?.startTime,
    ];
    for (const c of candidates) {
        if (typeof c === "string") {
            const d = new Date(c);
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
    }
    return null;
}

// ============================================
// BOOKING DRAWER
// ============================================

export function BookingDrawer({
    isOpen,
    onClose,
    bookingUrl,
    contactId,
    companyId,
    contactName,
    contactInfo,
    rdvDate,
    meetingType,
    meetingCategory,
    meetingAddress,
    meetingJoinUrl,
    meetingPhone,
    onRdvDateChange,
    onMeetingTypeChange,
    onMeetingCategoryChange,
    onMeetingAddressChange,
    onMeetingJoinUrlChange,
    onMeetingPhoneChange,
    onBookingSuccess,
    interlocuteurs,
}: BookingDrawerProps) {
    const { success, error: showError } = useToast();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const bookingHandledRef = useRef(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [booked, setBooked] = useState(false);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [step, setStep] = useState<1 | 2>(1);

    const [rdvDateLocal, setRdvDateLocal] = useState<string>(rdvDate ?? "");
    const [meetingTypeLocal, setMeetingTypeLocal] = useState<"" | "VISIO" | "PHYSIQUE" | "TELEPHONIQUE">(meetingType ?? "");
    const [meetingCategoryLocal, setMeetingCategoryLocal] = useState<"" | "EXPLORATOIRE" | "BESOIN">(meetingCategory ?? "");
    const [meetingAddressLocal, setMeetingAddressLocal] = useState<string>(meetingAddress ?? "");
    const [meetingJoinUrlLocal, setMeetingJoinUrlLocal] = useState<string>(meetingJoinUrl ?? "");
    const [meetingPhoneLocal, setMeetingPhoneLocal] = useState<string>(meetingPhone ?? "");

    // Calendar-synced state: date extracted from calendar postMessage (eliminates double-typing)
    const [showManualDate, setShowManualDate] = useState(false);

    const activeInterlocuteurs = (interlocuteurs || []).filter(
        i => i.isActive && i.bookingLinks.length > 0
    );

    const bookingOptions: CalendarOption[] = [];
    if (bookingUrl?.trim()) {
        bookingOptions.push({
            id: "general",
            label: "Calendrier général",
            sublabel: "Lien de réservation client",
            url: bookingUrl,
            initials: "CG",
            avatarColor: "bg-slate-100 text-slate-600",
        });
    }
    activeInterlocuteurs.forEach((interl) => {
        const color = AVATAR_COLORS[hashStr(interl.id) % AVATAR_COLORS.length];
        const initials = `${interl.firstName[0]}${interl.lastName[0]}`.toUpperCase();
        interl.bookingLinks.forEach((bl, idx) => {
            bookingOptions.push({
                id: `${interl.id}-${idx}`,
                label: `${interl.firstName} ${interl.lastName}`,
                sublabel: `${bl.label} · ${bl.durationMinutes} min`,
                url: bl.url,
                interlocuteurId: interl.id,
                initials,
                avatarColor: color,
            });
        });
    });

    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const selectedOption = bookingOptions.find(o => o.id === selectedOptionId) || bookingOptions[0] || null;
    const embedUrl = selectedOption ? getEmbedBookingUrl(selectedOption.url) : "";

    useEffect(() => {
        if (!isOpen) return;
        setBooked(false);
        setIsProcessing(false);
        bookingHandledRef.current = false;
        setStep(1);
        setIframeLoading(true);
        setSelectedOptionId(bookingOptions[0]?.id ?? null);

        setRdvDateLocal(rdvDate ?? "");
        setMeetingTypeLocal(meetingType ?? "");
        setMeetingCategoryLocal(meetingCategory ?? "");
        setMeetingAddressLocal(meetingAddress ?? "");
        setMeetingJoinUrlLocal(meetingJoinUrl ?? "");
        setMeetingPhoneLocal(meetingPhone ?? "");
        setShowManualDate(false);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const effectiveRdvDate = onRdvDateChange ? (rdvDate ?? "") : rdvDateLocal;
    const effectiveMeetingType = onMeetingTypeChange ? (meetingType ?? "") : meetingTypeLocal;
    const effectiveMeetingCategory = onMeetingCategoryChange ? (meetingCategory ?? "") : meetingCategoryLocal;
    const effectiveMeetingAddress = onMeetingAddressChange ? (meetingAddress ?? "") : meetingAddressLocal;
    const effectiveMeetingJoinUrl = onMeetingJoinUrlChange ? (meetingJoinUrl ?? "") : meetingJoinUrlLocal;
    const effectiveMeetingPhone = onMeetingPhoneChange ? (meetingPhone ?? "") : meetingPhoneLocal;

    const setEffectiveRdvDate = useCallback((v: string) => {
        onRdvDateChange?.(v);
        if (!onRdvDateChange) setRdvDateLocal(v);
    }, [onRdvDateChange]);
    const setEffectiveMeetingType = (v: "" | "VISIO" | "PHYSIQUE" | "TELEPHONIQUE") => { onMeetingTypeChange?.(v); if (!onMeetingTypeChange) setMeetingTypeLocal(v); };
    const setEffectiveMeetingCategory = (v: "" | "EXPLORATOIRE" | "BESOIN") => { onMeetingCategoryChange?.(v); if (!onMeetingCategoryChange) setMeetingCategoryLocal(v); };
    const setEffectiveMeetingAddress = (v: string) => { onMeetingAddressChange?.(v); if (!onMeetingAddressChange) setMeetingAddressLocal(v); };
    const setEffectiveMeetingJoinUrl = (v: string) => { onMeetingJoinUrlChange?.(v); if (!onMeetingJoinUrlChange) setMeetingJoinUrlLocal(v); };
    const setEffectiveMeetingPhone = (v: string) => { onMeetingPhoneChange?.(v); if (!onMeetingPhoneChange) setMeetingPhoneLocal(v); };

    // Auto-fill phone from contact info when TELEPHONIQUE is selected (avoids re-typing known data)
    useEffect(() => {
        if (effectiveMeetingType === "TELEPHONIQUE" && !effectiveMeetingPhone && contactInfo?.phone) {
            setEffectiveMeetingPhone(contactInfo.phone);
        }
    }, [effectiveMeetingType]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSelectCalendar = useCallback((id: string) => {
        if (id === selectedOptionId) return;
        setIframeLoading(true);
        setSelectedOptionId(id);
    }, [selectedOptionId]);

    // Listen for booking completion postMessage
    useEffect(() => {
        if (!isOpen) return;
        const handleMessage = async (event: MessageEvent) => {
            const origin = event.origin;
            const isAllowed =
                origin === window.location.origin ||
                origin.endsWith(".calendly.com") ||
                origin === "https://calendly.com" ||
                origin.endsWith(".cal.com") ||
                origin === "https://cal.com" ||
                origin.endsWith(".cal.eu") ||
                origin === "https://cal.eu";
            if (!isAllowed) return;

            const processBooking = async (eventData: unknown) => {
                if (bookingHandledRef.current) return;
                setIsProcessing(true);
                try {
                    // Auto-extract date from calendar event → eliminates manual DateTimePicker entry
                    const extractedDate = extractDateFromEventData(eventData);
                    if (extractedDate) {
                        setEffectiveRdvDate(extractedDate);
                    }
                    // Use extracted date immediately (state hasn't flushed yet)
                    const resolvedRdvDate = extractedDate || effectiveRdvDate;

                    if (effectiveMeetingType === "PHYSIQUE" && !effectiveMeetingAddress.trim()) {
                        showError("Adresse requise", "Veuillez renseigner une adresse pour un RDV physique.");
                        return;
                    }
                    bookingHandledRef.current = true;
                    const isoRdvDate = resolvedRdvDate ? new Date(resolvedRdvDate).toISOString() : undefined;
                    const res = await fetch("/api/actions/booking-success", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...(contactId && { contactId }),
                            ...(companyId && !contactId && { companyId }),
                            eventData,
                            rdvDate: isoRdvDate,
                            ...(effectiveMeetingType && { meetingType: effectiveMeetingType }),
                            ...(effectiveMeetingCategory && { meetingCategory: effectiveMeetingCategory }),
                            ...(effectiveMeetingAddress?.trim() && { meetingAddress: effectiveMeetingAddress.trim() }),
                            ...(effectiveMeetingJoinUrl?.trim() && { meetingJoinUrl: effectiveMeetingJoinUrl.trim() }),
                            ...(effectiveMeetingPhone?.trim() && { meetingPhone: effectiveMeetingPhone.trim() }),
                                    ...(selectedOption?.interlocuteurId && { interlocuteurId: selectedOption.interlocuteurId }),
                                    ...(selectedOption?.interlocuteurId && { interlocuteurName: selectedOption.label }),
                        }),
                    });
                    const json = await res.json();
                    if (json.success) {
                        setBooked(true);
                        success("Rendez-vous confirmé", `Le rendez-vous avec ${contactName} a été enregistré`);
                        onBookingSuccess?.();
                        setTimeout(onClose, 1800);
                    } else {
                        bookingHandledRef.current = false;
                        showError("Erreur", json.error || "Impossible d'enregistrer le rendez-vous");
                    }
                } catch (err) {
                    bookingHandledRef.current = false;
                    console.error("Failed to process booking:", err);
                    showError("Erreur", "Impossible d'enregistrer le rendez-vous");
                } finally {
                    setIsProcessing(false);
                }
            };

            if (event.data.event === "calendly.event_scheduled") await processBooking(event.data.payload);
            else if (event.data.type === "booking_success" || event.data.event === "booking.completed") await processBooking(event.data);
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [isOpen, contactId, companyId, contactName, effectiveRdvDate, effectiveMeetingType, effectiveMeetingCategory, effectiveMeetingAddress, effectiveMeetingJoinUrl, effectiveMeetingPhone, selectedOption, onBookingSuccess, onClose, success, showError, setEffectiveRdvDate]);

    const handleConfirmRdv = useCallback(async () => {
        if (bookingHandledRef.current) return;
        if (effectiveMeetingType === "PHYSIQUE" && !effectiveMeetingAddress.trim()) {
            showError("Adresse requise", "Veuillez renseigner une adresse pour un RDV physique.");
            return;
        }
        bookingHandledRef.current = true;
        setIsProcessing(true);
        try {
            const isoRdvDate = effectiveRdvDate ? new Date(effectiveRdvDate).toISOString() : undefined;
            const res = await fetch("/api/actions/booking-success", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(contactId && { contactId }),
                    ...(companyId && !contactId && { companyId }),
                    eventData: {},
                    rdvDate: isoRdvDate,
                    ...(effectiveMeetingType && { meetingType: effectiveMeetingType }),
                    ...(effectiveMeetingCategory && { meetingCategory: effectiveMeetingCategory }),
                    ...(effectiveMeetingAddress?.trim() && { meetingAddress: effectiveMeetingAddress.trim() }),
                    ...(effectiveMeetingJoinUrl?.trim() && { meetingJoinUrl: effectiveMeetingJoinUrl.trim() }),
                    ...(effectiveMeetingPhone?.trim() && { meetingPhone: effectiveMeetingPhone.trim() }),
                    ...(selectedOption?.interlocuteurId && { interlocuteurId: selectedOption.interlocuteurId }),
                    ...(selectedOption?.interlocuteurId && { interlocuteurName: selectedOption.label }),
                }),
            });
            const json = await res.json();
            if (json.success) {
                trackMeetingBooked({ type: (effectiveMeetingType as "VISIO" | "PHYSIQUE" | "TELEPHONIQUE") || "VISIO", hasCalendly: false });
                setBooked(true);
                success("Rendez-vous confirmé", `Le rendez-vous avec ${contactName} a été enregistré`);
                onBookingSuccess?.();
                setTimeout(onClose, 1800);
            } else {
                bookingHandledRef.current = false;
                showError("Erreur", json.error || "Impossible d'enregistrer le rendez-vous");
            }
        } catch (err) {
            bookingHandledRef.current = false;
            console.error("Failed to process booking:", err);
            showError("Erreur", "Impossible d'enregistrer le rendez-vous");
        } finally {
            setIsProcessing(false);
        }
    }, [contactId, companyId, contactName, effectiveRdvDate, effectiveMeetingType, effectiveMeetingCategory, effectiveMeetingAddress, effectiveMeetingJoinUrl, effectiveMeetingPhone, selectedOption, onBookingSuccess, onClose, success, showError]);

    if (!isOpen) return null;

    // Contact name shown immediately. Artificial reveal animations were removed
    // so the operational booking flow is ready as soon as the modal opens.
    const displayName = contactInfo?.firstName || contactInfo?.lastName
        ? `${contactInfo?.firstName ?? ""} ${contactInfo?.lastName ?? ""}`.trim()
        : contactName;

    const MeetingTypeIcon = effectiveMeetingType ? MEETING_TYPE_LABELS[effectiveMeetingType]?.icon : null;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            {/* Dialog */}
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-0 sm:p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Planifier un RDV avec ${contactName}`}
                    className="flex h-dvh min-h-0 w-full max-w-5xl flex-col overflow-hidden border border-[#DDE5E2] bg-white shadow-[0_24px_70px_rgba(21,32,30,0.24)] sm:h-[min(88dvh,820px)] sm:rounded-xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#174B45] bg-[#1F4D47] px-5 py-4 text-white sm:px-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                <CalendarCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold">Planifier un rendez-vous</h2>
                                <p className="mt-0.5 text-xs text-[#D9E8E4]">
                                    {contactName}
                                    {contactInfo?.companyName ? ` · ${contactInfo.companyName}` : ""}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="Fermer" className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center border-b border-[#DDE5E2] bg-[#F7F9F8] px-5 py-3 sm:px-6" aria-label={`Étape ${step} sur 2`}>
                        {[
                            { id: 1, label: "Données CRM" },
                            { id: 2, label: "Créneau calendrier" },
                        ].map((item, index) => (
                            <div key={item.id} className="flex min-w-0 flex-1 items-center">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span className={cn(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                                        step > item.id
                                            ? "border-[#1F4D47] bg-[#1F4D47] text-white"
                                            : step === item.id
                                                ? "border-[#E07C00] bg-[#FF9E1B] text-[#15201E]"
                                                : "border-[#CBD8D4] bg-white text-slate-400"
                                    )}>
                                        {step > item.id ? <Check className="h-3.5 w-3.5" /> : item.id}
                                    </span>
                                    <span className={cn("truncate text-xs font-semibold sm:text-sm", step === item.id ? "text-[#15201E]" : "text-slate-500")}>{item.label}</span>
                                </div>
                                {index === 0 && <div className={cn("mx-3 h-px flex-1 sm:mx-5", step === 2 ? "bg-[#1F4D47]" : "bg-[#CBD8D4]")} />}
                            </div>
                        ))}
                    </div>

                    <div className="flex min-h-0 flex-1 overflow-hidden">
                        {/* ── LEFT PANEL ── */}
                        {step === 1 && (
                        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-4 overflow-y-auto p-5 sm:p-6">

                            {/* ── Contact card with typewriter ── */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2 text-xs text-slate-700">
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5 shrink-0">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        {/* Typewriter on name */}
                                        <p className="font-semibold text-slate-900 text-sm">
                                            {displayName}
                                        </p>
                                        {/* Title fades in after name */}
                                        {contactInfo?.title && (
                                            <div>
                                                <p className="text-[11px] text-slate-500">{contactInfo.title}</p>
                                            </div>
                                        )}
                                        {/* Email */}
                                        {contactInfo?.email && (
                                            <div>
                                                <p className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                                                    <a href={`mailto:${contactInfo.email}`} className="truncate hover:text-indigo-600">
                                                        {contactInfo.email}
                                                    </a>
                                                    <CopyPill text={contactInfo.email} label="email" />
                                                </p>
                                            </div>
                                        )}
                                        {/* Phone */}
                                        {contactInfo?.phone && (
                                            <div>
                                                <p className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                                                    <a href={`tel:${contactInfo.phone}`} className="truncate hover:text-emerald-600">
                                                        {contactInfo.phone}
                                                    </a>
                                                    <CopyPill text={contactInfo.phone} label="téléphone" />
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Company section */}
                                {contactInfo?.companyName && (
                                    <div>
                                        <div className="pt-2 border-t border-slate-200/70 space-y-0.5">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                Société
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">{contactInfo.companyName}</p>
                                            {contactInfo.companyEmail && (
                                                <p className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                                                    <a href={`mailto:${contactInfo.companyEmail}`} className="truncate hover:text-indigo-600">
                                                        {contactInfo.companyEmail}
                                                    </a>
                                                    <CopyPill text={contactInfo.companyEmail} label="email société" />
                                                </p>
                                            )}
                                            {contactInfo.companyPhone && (
                                                <p className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                                                    <a href={`tel:${contactInfo.companyPhone}`} className="truncate hover:text-emerald-600">
                                                        {contactInfo.companyPhone}
                                                    </a>
                                                    <CopyPill text={contactInfo.companyPhone} label="téléphone société" />
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── Live RDV summary — updates as user fills form ── */}
                                {(effectiveRdvDate || effectiveMeetingType || effectiveMeetingCategory) && (
                                    <div className="pt-2 border-t border-indigo-100 space-y-1.5 mt-1">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">
                                            <Calendar className="w-3 h-3" />
                                            Récapitulatif RDV
                                        </div>

                                        {/* Date */}
                                        {effectiveRdvDate && (
                                            <p className="flex items-center gap-1.5 text-[11px] text-slate-700">
                                                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                                <span className="font-medium capitalize">{formatRdvDate(effectiveRdvDate)}</span>
                                            </p>
                                        )}

                                        {/* Type */}
                                        {effectiveMeetingType && MeetingTypeIcon && (
                                            <p className={cn("flex items-center gap-1.5 text-[11px] font-medium", MEETING_TYPE_LABELS[effectiveMeetingType]?.colorClass)}>
                                                <MeetingTypeIcon className="w-3 h-3 shrink-0" />
                                                {MEETING_TYPE_LABELS[effectiveMeetingType]?.label}
                                                {/* Show detail for each type */}
                                                {effectiveMeetingType === "VISIO" && effectiveMeetingJoinUrl && (
                                                    <a href={effectiveMeetingJoinUrl} target="_blank" rel="noopener noreferrer" className="ml-1 truncate max-w-[120px] underline underline-offset-2">
                                                        {effectiveMeetingJoinUrl.replace(/^https?:\/\//, "").slice(0, 28)}…
                                                    </a>
                                                )}
                                                {effectiveMeetingType === "PHYSIQUE" && effectiveMeetingAddress && (
                                                    <span className="ml-1 truncate max-w-[140px] text-slate-600 font-normal">{effectiveMeetingAddress}</span>
                                                )}
                                                {effectiveMeetingType === "TELEPHONIQUE" && effectiveMeetingPhone && (
                                                    <span className="ml-1 text-slate-600 font-normal">{effectiveMeetingPhone}</span>
                                                )}
                                            </p>
                                        )}

                                        {/* Category */}
                                        {effectiveMeetingCategory && (
                                            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block shrink-0" />
                                                {MEETING_CATEGORY_LABELS[effectiveMeetingCategory]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Form: date + type + detail + category ── */}
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                Détails du rendez-vous
                            </p>

                            <div className="flex items-start gap-2.5 rounded-lg border border-[#D7E1DE] bg-[#EEF3F1] px-3 py-2.5 text-xs leading-relaxed text-[#3F625D]">
                                <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>La date et l&apos;heure seront choisies à l&apos;étape suivante dans le calendrier. Aucune double saisie.</span>
                            </div>

                            <div className="space-y-2 text-xs text-slate-600">
                                <p className="font-semibold">Type de réunion</p>
                                <div className="flex flex-wrap gap-2">
                                    {(["VISIO", "PHYSIQUE", "TELEPHONIQUE"] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setEffectiveMeetingType(effectiveMeetingType === type ? "" : type)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                                                effectiveMeetingType === type
                                                    ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            {type === "VISIO" ? "Visio" : type === "PHYSIQUE" ? "Physique" : "Téléphonique"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {effectiveMeetingType === "PHYSIQUE" && (
                                <div className="space-y-1 text-xs">
                                    <label className="font-semibold text-slate-700">
                                        Adresse du RDV <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={effectiveMeetingAddress}
                                        onChange={(e) => setEffectiveMeetingAddress(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                                        placeholder="Adresse complète du lieu"
                                    />
                                </div>
                            )}

                            {effectiveMeetingType === "VISIO" && (
                                <div className="space-y-1 text-xs">
                                    <label className="font-semibold text-slate-700">
                                        Lien de connexion <span className="text-slate-400 font-normal">(auto-détecté si disponible)</span>
                                    </label>
                                    <input
                                        value={effectiveMeetingJoinUrl}
                                        onChange={(e) => setEffectiveMeetingJoinUrl(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
                                        placeholder="Auto-récupéré du calendrier, ou saisir manuellement…"
                                    />
                                </div>
                            )}

                            {effectiveMeetingType === "TELEPHONIQUE" && (
                                <div className="space-y-1 text-xs">
                                    <label className="font-semibold text-slate-700">
                                        Numéro à appeler <span className="text-slate-400 font-normal">(optionnel)</span>
                                    </label>
                                    <input
                                        value={effectiveMeetingPhone}
                                        onChange={(e) => setEffectiveMeetingPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                                        placeholder={contactInfo?.phone ?? "Numéro du contact"}
                                    />
                                </div>
                            )}

                            <div className="space-y-1 text-xs">
                                <label className="font-semibold text-slate-700">Catégorie</label>
                                <div className="flex flex-wrap gap-2">
                                    {(["EXPLORATOIRE", "BESOIN"] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setEffectiveMeetingCategory(effectiveMeetingCategory === cat ? "" : cat)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                                                effectiveMeetingCategory === cat
                                                    ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            {MEETING_CATEGORY_LABELS[cat]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Continue to the calendar without creating the CRM action yet. */}
                            <div className="mt-auto pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!effectiveMeetingType) {
                                            showError("Type requis", "Choisissez le type de rendez-vous avant de continuer.");
                                            return;
                                        }
                                        if (effectiveMeetingType === "PHYSIQUE" && !effectiveMeetingAddress.trim()) {
                                            showError("Adresse requise", "Renseignez l'adresse du rendez-vous physique.");
                                            return;
                                        }
                                        setIframeLoading(true);
                                        setStep(2);
                                    }}
                                    disabled={!effectiveMeetingType || (effectiveMeetingType === "PHYSIQUE" && !effectiveMeetingAddress.trim())}
                                    className={cn(
                                        "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition-colors active:translate-y-px",
                                        !effectiveMeetingType || (effectiveMeetingType === "PHYSIQUE" && !effectiveMeetingAddress.trim())
                                            ? "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400"
                                            : "border-[#E07C00] bg-[#FF9E1B] text-[#15201E] hover:bg-[#F09212]"
                                    )}
                                >
                                    Choisir le créneau
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <p className="text-[11px] text-slate-400 mt-2 text-center">
                                    Les données CRM seront enregistrées après confirmation du calendrier.
                                </p>
                            </div>
                        </div>
                        )}

                        {/* ── RIGHT PANEL: calendar selector + iframe ── */}
                        {step === 2 && (
                        <div className="relative flex min-h-0 flex-1 flex-col bg-white">
                            {!selectedOption ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
                                    <Calendar className="w-8 h-8 text-slate-300" />
                                    <p className="text-sm font-semibold text-slate-600">Aucun calendrier configuré</p>
                                    <p className="text-xs text-slate-400">Contactez votre administrateur</p>
                                </div>
                            ) : (
                                <>
                                    {bookingOptions.length > 1 && (
                                        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50/80">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Choisir un commercial / calendrier
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {bookingOptions.map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => handleSelectCalendar(opt.id)}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                                                            selectedOptionId === opt.id
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                                : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                                            selectedOptionId === opt.id ? "bg-white/20" : opt.avatarColor ?? "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {opt.initials ?? "?"}
                                                        </span>
                                                        <span className="text-left">
                                                            <span className="block truncate max-w-[140px]">{opt.label}</span>
                                                            {opt.sublabel && (
                                                                <span className="block text-xs opacity-80 truncate max-w-[140px]">{opt.sublabel}</span>
                                                            )}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 min-h-0 relative">
                                        {iframeLoading && !isProcessing && !booked && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
                                                <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                                                <p className="text-sm text-slate-500">Chargement du calendrier…</p>
                                            </div>
                                        )}
                                        {isProcessing && (
                                            <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center gap-3">
                                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                                <p className="text-sm font-medium text-slate-700">Enregistrement du rendez-vous…</p>
                                            </div>
                                        )}
                                        {booked && (
                                            <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center gap-4">
                                                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                                                <p className="text-lg font-semibold text-slate-900">RDV confirmé !</p>
                                                <p className="text-sm text-slate-500 text-center">
                                                    Rendez-vous avec {contactName} enregistré.
                                                </p>
                                            </div>
                                        )}
                                        <iframe
                                            ref={iframeRef}
                                            src={embedUrl}
                                            key={selectedOption.id}
                                            onLoad={() => setIframeLoading(false)}
                                            className="h-full min-h-[320px] w-full border-0"
                                            title={selectedOption.label}
                                            allow="camera; microphone; geolocation"
                                            loading="eager"
                                        />
                                    </div>

                                    {!booked && (
                                        <div className="flex shrink-0 flex-col gap-3 border-t border-[#DDE5E2] bg-[#F7F9F8] px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                disabled={isProcessing}
                                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CBD8D4] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-[#EEF3F1] disabled:opacity-50"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                                Modifier les données CRM
                                            </button>

                                            <div className="flex flex-col items-stretch gap-2 sm:items-end">
                                                {!showManualDate ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowManualDate(true)}
                                                        className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-[#1F4D47]"
                                                    >
                                                        Le calendrier ne remonte pas le créneau ? Saisie manuelle
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                                        <div className="min-w-[260px]">
                                                            <DateTimePicker
                                                                label="Date et heure du RDV"
                                                                value={effectiveRdvDate}
                                                                onChange={setEffectiveRdvDate}
                                                                placeholder="Choisir date et heure…"
                                                                min={new Date().toISOString().slice(0, 16)}
                                                                triggerClassName="border-[#CBD8D4] bg-white focus:border-[#E07C00] focus:ring-[#FF9E1B]/20"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleConfirmRdv}
                                                            disabled={!effectiveRdvDate || isProcessing}
                                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E07C00] bg-[#FF9E1B] px-4 text-sm font-bold text-[#15201E] hover:bg-[#F09212] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"
                                                        >
                                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                            Confirmer manuellement
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default BookingDrawer;
