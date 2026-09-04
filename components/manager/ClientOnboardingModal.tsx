"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui";
import {
    Building2,
    Users,
    Target,
    FileText,
    Calendar,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Check,
    Loader2,
    X,
    Brain,
    ArrowRight,
    AlertTriangle,
    ClipboardPaste,
    Search,
    Mic,
    Link2,
    PenLine,
    Mail,
    Clock,
    Shield,
    Edit3,
    Phone,
    Linkedin,
    Plus,
    Flame,
    Zap
} from "lucide-react";
import { Button, Badge, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Playbook, PlaybookSignal } from "@/lib/playbook/leexi-types";

// ============================================
// TYPES
// ============================================

type CreationMode = "leexi" | "paste" | "manual";

interface LeexiCallSummary {
    id: string;
    title: string;
    date: string | null;
    duration: number;
    companyName: string;
    participantNames: string[];
    hasRecap: boolean;
}

interface LeexiCallDetail {
    id: string;
    title: string;
    date: string | null;
    duration: number;
    companyName: string;
    participants: Array<{ name?: string; email?: string; company?: string }>;
    recapText: string;
    hasTranscript: boolean;
}

// ============================================
// WIZARD STEPS
// ============================================

const STEPS_WITH_SOURCE = [
    { id: "source", label: "Source", icon: Link2, description: "Choisir la source" },
    { id: "review", label: "Revue IA", icon: Sparkles, description: "Données extraites" },
    { id: "client", label: "Fiche Client", icon: Building2, description: "Informations de base" },
    { id: "planning", label: "Planning & Mission", icon: Calendar, description: "Paramètres de lancement" },
];

const STEPS_MANUAL = [
    { id: "client", label: "Fiche Client", icon: Building2, description: "Informations de base" },
    { id: "planning", label: "Planning & Mission", icon: Calendar, description: "Paramètres de lancement" },
];

interface FormData {
    name: string;
    email: string;
    phone: string;
    industry: string;
    website: string;
    icp: string;
    targetIndustries: string[];
    targetCompanySize: string;
    targetJobTitles: string[];
    targetGeographies: string[];
    listingSources: string[];
    listingCriteria: string;
    estimatedContacts: string;
    introScript: string;
    discoveryScript: string;
    objectionScript: string;
    closingScript: string;
    targetLaunchDate: string;
    notes: string;
    createMission: boolean;
    missionName: string;
    missionObjective: string;
    missionChannel: "CALL" | "EMAIL" | "LINKEDIN";
    missionDurationMonths: number;
    missionWorkingDays: number;
    missionRdvTarget: number;
}

const INITIAL_FORM_DATA: FormData = {
    name: "",
    email: "",
    phone: "",
    industry: "",
    website: "",
    icp: "",
    targetIndustries: [],
    targetCompanySize: "",
    targetJobTitles: [],
    targetGeographies: [],
    listingSources: [],
    listingCriteria: "",
    estimatedContacts: "",
    introScript: "",
    discoveryScript: "",
    objectionScript: "",
    closingScript: "",
    targetLaunchDate: "",
    notes: "",
    createMission: true,
    missionName: "",
    missionObjective: "",
    missionChannel: "CALL",
    missionDurationMonths: 3,
    missionWorkingDays: 10,
    missionRdvTarget: 10,
};

const INDUSTRY_OPTIONS = [
    "SaaS / Tech",
    "E-commerce",
    "Finance / Banque",
    "Santé & Médical",
    "Immobilier / PropTech",
    "Industrie & Énergie",
    "Services B2B / Conseil",
    "Retail & Distribution",
    "Éducation & EdTech",
    "Autre",
];

const COMPANY_SIZE_OPTIONS = [
    "1-10 employés",
    "11-50 employés",
    "51-200 employés",
    "201-500 employés",
    "501-1000 employés",
    "1000+ employés",
];

const LISTING_SOURCE_OPTIONS = [
    "Apollo.io",
    "LinkedIn Sales Navigator",
    "Clay",
    "Pharow",
    "Base interne",
    "Autre",
];

const TARGET_JOB_OPTIONS = [
    "DRH",
    "Responsable RH",
    "Responsable formation",
    "Directeur Général / CEO",
    "Directeur Commercial / VP Sales",
    "Directeur Marketing / CMO",
    "DAF",
    "DSI / CTO",
];

const TARGET_GEO_OPTIONS = ["France", "Europe", "Île-de-France", "Métropole", "Belgique", "Suisse"];

interface ClientOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (clientId: string) => void;
    initialRecapText?: string;
}

export function ClientOnboardingModal({ isOpen, onClose, onSuccess, initialRecapText }: ClientOnboardingModalProps) {
    const { success, error: showError } = useToast();

    // Mode & step
    const [creationMode, setCreationMode] = useState<CreationMode | null>(null);
    const [currentStep, setCurrentStep] = useState(0);

    // Form
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Leexi: recap text (from paste or API fetch)
    const [recapText, setRecapText] = useState("");
    const [isGeneratingPlaybook, setIsGeneratingPlaybook] = useState(false);
    const [generatedPlaybook, setGeneratedPlaybook] = useState<Playbook | null>(null);

    // Leexi: API search calls
    const [leexiSearchQuery, setLeexiSearchQuery] = useState("");
    const [leexiCalls, setLeexiCalls] = useState<LeexiCallSummary[]>([]);
    const [isSearchingCalls, setIsSearchingCalls] = useState(false);
    const [selectedCall, setSelectedCall] = useState<LeexiCallSummary | null>(null);
    const [isFetchingCall, setIsFetchingCall] = useState(false);
    const [leexiCallId, setLeexiCallId] = useState<string | null>(null);

    // If initialRecapText is passed (e.g. from Leexi call page)
    useEffect(() => {
        if (initialRecapText && isOpen) {
            setRecapText(initialRecapText);
            setCreationMode("paste");
            setCurrentStep(0);
        }
    }, [initialRecapText, isOpen]);

    // Steps configuration based on mode
    const steps = creationMode === "manual" ? STEPS_MANUAL : STEPS_WITH_SOURCE;

    // Helper: update form field
    const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Helper: add/remove tag
    const addTag = (field: "targetIndustries" | "targetJobTitles" | "targetGeographies" | "listingSources", tag: string) => {
        if (!tag.trim()) return;
        setFormData(prev => {
            if (prev[field].includes(tag.trim())) return prev;
            return { ...prev, [field]: [...prev[field], tag.trim()] };
        });
    };

    const removeTag = (field: "targetIndustries" | "targetJobTitles" | "targetGeographies" | "listingSources", tag: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter(t => t !== tag),
        }));
    };

    // ============================================
    // LEEXI API: SEARCH CALLS
    // ============================================

    const searchLeexiCalls = useCallback(async (query: string) => {
        setIsSearchingCalls(true);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set("q", query.trim());
            params.set("limit", "20");

            const res = await fetch(`/api/leexi/calls?${params}`);
            const json = await res.json();

            if (json.success && Array.isArray(json.data)) {
                setLeexiCalls(json.data);
            } else {
                setLeexiCalls([]);
            }
        } catch {
            setLeexiCalls([]);
        } finally {
            setIsSearchingCalls(false);
        }
    }, []);

    // Load recent calls when entering Leexi mode
    useEffect(() => {
        if (creationMode === "leexi" && isOpen) {
            searchLeexiCalls("");
        }
    }, [creationMode, isOpen, searchLeexiCalls]);

    // Fetch full call detail (recap)
    const fetchCallDetail = async (callId: string) => {
        setIsFetchingCall(true);
        try {
            const res = await fetch(`/api/leexi/calls/${callId}`);
            const json = await res.json();

            if (json.success && json.data) {
                const detail: LeexiCallDetail = json.data;
                setSelectedCall(leexiCalls.find(c => c.id === callId) || null);
                setLeexiCallId(callId);

                const text = detail.recapText || "";
                setRecapText(text);

                if (detail.companyName) {
                    updateField("name", detail.companyName);
                }

                if (!text) {
                    showError("Attention", "Cet appel n'a pas de récapitulatif textuel disponible.");
                }
            }
        } catch {
            showError("Erreur", "Impossible de charger le détail de l'appel");
        } finally {
            setIsFetchingCall(false);
        }
    };

    // ============================================
    // AI PLAYBOOK GENERATION
    // ============================================

    const generatePlaybook = async () => {
        if (!recapText.trim()) {
            showError("Erreur", "Le récapitulatif est vide");
            return;
        }

        setIsGeneratingPlaybook(true);
        try {
            const res = await fetch("/api/ai/playbook/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceText: recapText,
                    sourceType: creationMode === "leexi" ? "leexi_call" : "manual_recap",
                    companyName: selectedCall?.companyName || formData.name || undefined,
                }),
            });

            const json = await res.json();

            if (json.success && json.data) {
                const pb: Playbook = json.data;
                setGeneratedPlaybook(pb);
                mapPlaybookToForm(pb);
                setCurrentStep(1); // Move to review step
                success("Analyse IA terminée", "Playbook et fiche client pré-remplis avec succès !");
            } else {
                showError("Erreur IA", json.error || "Impossible d'extraire les données");
            }
        } catch {
            showError("Erreur", "Une erreur est survenue lors de l'analyse");
        } finally {
            setIsGeneratingPlaybook(false);
        }
    };

    // Map extracted Playbook to Form fields
    const mapPlaybookToForm = (playbook: Playbook) => {
        setFormData(prev => ({
            ...prev,
            name: playbook.company_name || prev.name,
            industry: playbook.industry || prev.industry,
            website: playbook.website || prev.website,
            icp: playbook.icp_description || prev.icp,
            targetIndustries: playbook.target_industries.length > 0 ? playbook.target_industries : prev.targetIndustries,
            targetCompanySize: playbook.target_company_sizes.length > 0 ? playbook.target_company_sizes[0] : prev.targetCompanySize,
            targetJobTitles: playbook.target_job_titles.length > 0 ? playbook.target_job_titles : prev.targetJobTitles,
            targetGeographies: playbook.target_geographies.length > 0 ? playbook.target_geographies : prev.targetGeographies,
            introScript: playbook.call_scripts?.intro || prev.introScript,
            discoveryScript: playbook.call_scripts?.discovery_questions?.join("\n") || prev.discoveryScript,
            objectionScript: playbook.call_scripts?.objection_handlers ? Object.entries(playbook.call_scripts.objection_handlers).map(([k, v]) => `${k} : ${v}`).join("\n") : prev.objectionScript,
            closingScript: playbook.call_scripts?.closing || prev.closingScript,
            notes: [
                playbook.value_proposition ? `Proposition de valeur:\n${playbook.value_proposition}` : "",
                playbook.competitors.length > 0 ? `Concurrents:\n${playbook.competitors.join(", ")}` : "",
                playbook.persona_pains.length > 0 ? `Pains persona:\n${playbook.persona_pains.join("\n")}` : "",
            ].filter(Boolean).join("\n\n"),
            createMission: true,
            missionName: `Mission ${playbook.company_name || prev.name}`,
            missionChannel: playbook.mission_params?.channel && playbook.mission_params.channel !== ''
                ? playbook.mission_params.channel as "CALL" | "EMAIL" | "LINKEDIN"
                : prev.missionChannel,
            missionDurationMonths: playbook.mission_params?.duration_months || prev.missionDurationMonths,
            missionWorkingDays: playbook.mission_params?.working_days_per_month || prev.missionWorkingDays,
            missionRdvTarget: playbook.mission_params?.rdv_target_per_month || prev.missionRdvTarget,
        }));
    };

    // ============================================
    // NAVIGATION
    // ============================================

    const canProceed = () => {
        const stepId = steps[currentStep]?.id;
        switch (stepId) {
            case "source":
                if (creationMode === "leexi") return !!selectedCall;
                if (creationMode === "paste") return recapText.trim().length >= 20;
                return false;
            case "review":
                return !!generatedPlaybook;
            case "client":
                return formData.name.trim().length > 0;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (canProceed() && currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setCreationMode(null);
        setCurrentStep(0);
        setFormData(INITIAL_FORM_DATA);
        setRecapText("");
        setGeneratedPlaybook(null);
        setLeexiSearchQuery("");
        setLeexiCalls([]);
        setSelectedCall(null);
        setLeexiCallId(null);
        onClose();
    };

    const handleModeSelect = (mode: CreationMode) => {
        setCreationMode(mode);
        setCurrentStep(0);
    };

    const handleBackToModeSelect = () => {
        setCreationMode(null);
        setCurrentStep(0);
        setRecapText("");
        setSelectedCall(null);
        setLeexiCallId(null);
        setGeneratedPlaybook(null);
    };

    // ============================================
    // SUBMIT
    // ============================================

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showError("Erreur", "Le nom du client est requis");
            return;
        }

        setIsSubmitting(true);
        try {
            const onboardingData = {
                icp: formData.icp,
                targetIndustries: formData.targetIndustries,
                targetCompanySize: formData.targetCompanySize,
                targetJobTitles: formData.targetJobTitles,
                targetGeographies: formData.targetGeographies,
                listingSources: formData.listingSources,
                listingCriteria: formData.listingCriteria,
                estimatedContacts: formData.estimatedContacts,
            };

            const scripts = {
                intro: formData.introScript,
                discovery: formData.discoveryScript,
                objection: formData.objectionScript,
                closing: formData.closingScript,
            };

            const payload: Record<string, unknown> = {
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                industry: formData.industry || null,
                onboardingData,
                targetLaunchDate: formData.targetLaunchDate || null,
                scripts,
                notes: formData.notes || null,
                createMission: formData.createMission,
                missionName: formData.missionName || null,
                missionObjective: formData.missionObjective || null,
                missionChannel: formData.missionChannel,
                missionDurationMonths: formData.missionDurationMonths,
                missionWorkingDays: formData.missionWorkingDays,
                missionRdvTarget: formData.missionRdvTarget,
                salesPlaybook: generatedPlaybook || undefined,
            };

            if (generatedPlaybook?.email_sequence?.length) {
                payload.emailTemplates = generatedPlaybook.email_sequence.filter(e => e.subject || e.body);
            }

            if (recapText && creationMode) {
                payload.leexiImport = {
                    leexiCallId: leexiCallId || undefined,
                    source: creationMode === "leexi" ? "api" : "paste",
                    rawRecap: recapText,
                    callTitle: selectedCall?.title,
                    callDate: selectedCall?.date,
                    callDuration: selectedCall?.duration,
                };
            }

            const clientRes = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const clientJson = await clientRes.json();

            if (!clientJson.success) {
                showError("Erreur", clientJson.error || "Impossible de créer le client");
                setIsSubmitting(false);
                return;
            }

            const createdItems: string[] = ["Client"];
            if (formData.createMission) createdItems.push("Mission");
            if (generatedPlaybook?.email_sequence?.length) createdItems.push(`${generatedPlaybook.email_sequence.length} templates email`);
            success("Créé avec succès", `${createdItems.join(" + ")} — ${formData.name}`);
            handleClose();
            onSuccess(clientJson.data.id);
        } catch (err) {
            console.error("Failed to create client:", err);
            showError("Erreur", "Une erreur est survenue");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // RENDER: SOURCE SELECTOR (no mode chosen yet)
    // ============================================

    const renderModeSelector = () => (
        <div className="flex flex-col items-center py-8 px-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#0B0F19] to-slate-800 border border-slate-700/80 flex items-center justify-center mb-6 shadow-xl shadow-black/20 text-primary">
                <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                Comment souhaitez-vous intégrer ce client ?
            </h2>
            <p className="text-sm text-slate-500 mb-8 max-w-lg">
                Suzalink extrait automatiquement le pitch, l'ICP, les scripts d'appel et configure la mission initiale.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
                {/* Mode A: Import from Leexi */}
                <button
                    type="button"
                    onClick={() => handleModeSelect("leexi")}
                    className="group relative p-6 rounded-3xl bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/60 border-2 border-violet-200/80 hover:border-violet-500 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 text-left flex flex-col justify-between"
                >
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded-full">Recommandé</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                            Importer depuis Leexi
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            Synchronisation directe avec vos réunions d'onboarding enregistrées.
                        </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-violet-100 flex items-center justify-between text-xs font-bold text-violet-700">
                        <span>Sélectionner l'appel</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                {/* Mode B: Paste recap */}
                <button
                    type="button"
                    onClick={() => handleModeSelect("paste")}
                    className="group relative p-6 rounded-3xl bg-gradient-to-br from-blue-50/90 via-white to-sky-50/60 border-2 border-blue-200/80 hover:border-primary hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left flex flex-col justify-between"
                >
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B0F19] to-blue-900 flex items-center justify-center mb-4 text-primary shadow-md shadow-black/10 group-hover:scale-105 transition-transform">
                            <ClipboardPaste className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">Rapide</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors">
                            Coller un récapitulatif
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            Collez des notes de meeting, un email ou un compte-rendu textuel.
                        </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-primary">
                        <span>Coller le texte</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                {/* Mode C: Manual */}
                <button
                    type="button"
                    onClick={() => handleModeSelect("manual")}
                    className="group relative p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-xl hover:shadow-slate-500/5 transition-all duration-300 text-left flex flex-col justify-between"
                >
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 text-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                            <PenLine className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Standard</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                            Création Manuelle
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            Remplissez directement la fiche client et les paramètres étape par étape.
                        </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Formulaire manuel</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </div>
        </div>
    );

    // ============================================
    // RENDER: SOURCE STEP (Leexi search or Paste)
    // ============================================

    const renderSourceStep = () => {
        if (creationMode === "leexi") {
            return (
                <div className="space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={leexiSearchQuery}
                            onChange={(e) => setLeexiSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && searchLeexiCalls(leexiSearchQuery)}
                            placeholder="Rechercher par nom de société, contact, date..."
                            className="w-full h-11 pl-10 pr-24 border border-slate-200 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-xs font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => searchLeexiCalls(leexiSearchQuery)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors shadow-2xs"
                        >
                            Rechercher
                        </button>
                    </div>

                    {/* Results */}
                    {isSearchingCalls ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-7 h-7 text-violet-600 animate-spin mb-2" />
                            <span className="text-xs font-bold text-slate-500">Recherche des appels Leexi...</span>
                        </div>
                    ) : leexiCalls.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                            <Mic className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700">Aucun appel trouvé</p>
                            <p className="text-xs text-slate-400 mt-0.5">Vérifiez vos filtres de recherche ou la connexion Leexi.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                {leexiCalls.length} appel{leexiCalls.length > 1 ? "s" : ""} disponible{leexiCalls.length > 1 ? "s" : ""}
                            </p>
                            {leexiCalls.map((call) => (
                                <button
                                    key={call.id}
                                    type="button"
                                    onClick={() => fetchCallDetail(call.id)}
                                    disabled={isFetchingCall}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border text-left transition-all duration-200",
                                        selectedCall?.id === call.id
                                            ? "border-violet-500 bg-violet-50/80 ring-2 ring-violet-500/20 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 text-violet-700 font-bold">
                                            <Mic className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900 truncate">{call.title}</span>
                                                {!call.hasRecap && (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                        Sans récap
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                {call.companyName && <span className="font-bold text-slate-700">{call.companyName}</span>}
                                                {call.participantNames.length > 0 && (
                                                    <span className="truncate max-w-[200px]">{call.participantNames.join(", ")}</span>
                                                )}
                                                {call.date && (
                                                    <span className="flex items-center gap-1 text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(call.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                                    </span>
                                                )}
                                                {call.duration > 0 && (
                                                    <span className="text-slate-400 font-medium">{Math.round(call.duration / 60)} min</span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedCall?.id === call.id && (
                                            <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {isFetchingCall && (
                        <div className="flex items-center gap-2.5 p-3.5 bg-violet-50 border border-violet-200 rounded-2xl">
                            <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                            <span className="text-xs font-bold text-violet-900">Chargement de la transcription Leexi...</span>
                        </div>
                    )}

                    {selectedCall && !isFetchingCall && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-950">Appel sélectionné : {selectedCall.title}</p>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                    {recapText.length} caractères chargés. Cliquez sur <strong>"Analyser et extraire"</strong> pour lancer le traitement IA.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Mode B: Paste
        return (
            <div className="space-y-4">
                <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border border-indigo-200/80 rounded-3xl">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                            <ClipboardPaste className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-indigo-950">Coller le compte-rendu ou les notes</h4>
                    </div>
                    <p className="text-xs text-indigo-800/80 mb-3">
                        Collez les notes du rendez-vous, un email de cadrage ou le script brut. L'intelligence artificielle en extraira l'ICP, le pitch et les arguments.
                    </p>
                    <textarea
                        value={recapText}
                        onChange={(e) => setRecapText(e.target.value)}
                        placeholder="Collez ici le récapitulatif de meeting ou les notes commerciales..."
                        rows={10}
                        className="w-full p-4 border border-indigo-200 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium resize-none shadow-2xs"
                        autoFocus
                    />
                    <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[11px] font-bold text-slate-400">
                            {recapText.length} caractères {recapText.length < 20 && recapText.length > 0 ? "(minimum 20)" : ""}
                        </span>
                        {recapText.length >= 20 && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Prêt pour l'analyse IA
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // RENDER: REVIEW PANEL (Side-by-side)
    // ============================================

    const renderReviewStep = () => {
        if (!generatedPlaybook) {
            return (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-violet-100 rounded-3xl flex items-center justify-center mb-4 text-violet-600 shadow-md">
                        <Brain className="w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">Extraction en cours...</h3>
                    <p className="text-xs text-slate-500 text-center max-w-sm">
                        L'IA analyse le texte pour identifier les cibles, les scripts et les paramètres de mission.
                    </p>
                    <Loader2 className="w-6 h-6 text-violet-600 animate-spin mt-6" />
                </div>
            );
        }

        const pb = generatedPlaybook;

        return (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-blue-900 font-medium">
                    <span>✨ Les données ci-dessous ont été extraites par l'IA. Vous pouvez modifier n'importe quel champ directement.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[420px]">
                    {/* LEFT: Source recap */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-slate-50/50">
                        <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Source analysée</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                                {recapText.slice(0, 3000)}
                                {recapText.length > 3000 && (
                                    <span className="text-slate-400">... ({recapText.length - 3000} caractères masqués)</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Extracted data */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-white">
                        <div className="px-4 py-3 bg-violet-50/80 border-b border-violet-200 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-700" />
                            <span className="text-xs font-bold text-violet-900 uppercase tracking-wider">Données extraites &amp; Playbook</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                            {/* Company info */}
                            <ReviewField label="Nom de l'entreprise" value={formData.name} onChange={(v) => updateField("name", v)} />
                            <ReviewField label="Secteur d'activité" value={formData.industry} onChange={(v) => updateField("industry", v)} />
                            <ReviewField label="Site Web" value={formData.website} onChange={(v) => updateField("website", v)} />

                            {/* ICP */}
                            <ReviewTagField label="Rôles cibles (ICP)" tags={formData.targetJobTitles} onRemove={(t) => removeTag("targetJobTitles", t)} onAdd={(t) => addTag("targetJobTitles", t)} />
                            <ReviewTagField label="Secteurs cibles" tags={formData.targetIndustries} onRemove={(t) => removeTag("targetIndustries", t)} onAdd={(t) => addTag("targetIndustries", t)} />
                            <ReviewField label="Taille d'entreprise cible" value={formData.targetCompanySize} onChange={(v) => updateField("targetCompanySize", v)} />
                            <ReviewTagField label="Zones géographiques" tags={formData.targetGeographies} onRemove={(t) => removeTag("targetGeographies", t)} onAdd={(t) => addTag("targetGeographies", t)} />

                            {/* Mission params */}
                            {pb.mission_params && (pb.mission_params.rdv_target_per_month > 0 || pb.mission_params.duration_months > 0) && (
                                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Mission Recommandée</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        <ReviewNumberField label="RDV / mois" value={formData.missionRdvTarget} onChange={(v) => updateField("missionRdvTarget", v)} />
                                        <ReviewNumberField label="Durée (mois)" value={formData.missionDurationMonths} onChange={(v) => updateField("missionDurationMonths", v)} />
                                        <ReviewNumberField label="Jours / mois" value={formData.missionWorkingDays} onChange={(v) => updateField("missionWorkingDays", v)} />
                                    </div>
                                </div>
                            )}

                            {/* Signals */}
                            {pb.signals_from_call?.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Signaux détectés</span>
                                    <div className="space-y-1">
                                        {pb.signals_from_call.map((s, i) => (
                                            <SignalBadge key={i} signal={s} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // RENDER: STEP CONTENT
    // ============================================

    const renderStepContent = () => {
        const stepId = steps[currentStep]?.id;

        switch (stepId) {
            case "source":
                return renderSourceStep();

            case "review":
                return renderReviewStep();

            case "client":
                return (
                    <div className="space-y-5">
                        {/* Basic info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Nom du client / Entreprise <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder="Ex: Acme Corp"
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Secteur d'activité</label>
                                <select
                                    value={formData.industry}
                                    onChange={(e) => updateField("industry", e.target.value)}
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                    <option value="">Sélectionner un secteur...</option>
                                    {INDUSTRY_OPTIONS.map(ind => (
                                        <option key={ind} value={ind}>{ind}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email principal</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                    placeholder="contact@client.com"
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Téléphone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    placeholder="+33 1 23 45 67 89"
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* ICP details */}
                        <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-indigo-600" />
                                Cible &amp; Critères de Prospection (ICP)
                            </h4>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Description ICP globale</label>
                                <textarea
                                    value={formData.icp}
                                    onChange={(e) => updateField("icp", e.target.value)}
                                    placeholder="Ex: PME de 50 à 200 employés en France dans le secteur IT..."
                                    rows={2}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Postes cibles (Job Titles)</label>
                                    <TagInput
                                        tags={formData.targetJobTitles}
                                        options={TARGET_JOB_OPTIONS}
                                        onAdd={(v) => addTag("targetJobTitles", v)}
                                        onRemove={(v) => removeTag("targetJobTitles", v)}
                                        placeholder="+ Ajouter un rôle..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Géographies</label>
                                    <TagInput
                                        tags={formData.targetGeographies}
                                        options={TARGET_GEO_OPTIONS}
                                        onAdd={(v) => addTag("targetGeographies", v)}
                                        onRemove={(v) => removeTag("targetGeographies", v)}
                                        placeholder="+ Ajouter une zone..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "planning":
                return (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Date de lancement souhaitée</label>
                                <input
                                    type="date"
                                    value={formData.targetLaunchDate}
                                    onChange={(e) => updateField("targetLaunchDate", e.target.value)}
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes additionnelles</label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) => updateField("notes", e.target.value)}
                                    placeholder="Ex: Client grand compte, point d'étape hebdo..."
                                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Interactive Mission Creator Box */}
                        <div className={cn(
                            "p-5 rounded-3xl border-2 transition-all duration-300",
                            formData.createMission
                                ? "bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 border-blue-300 shadow-md shadow-blue-500/5"
                                : "bg-slate-50 border-slate-200"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center font-bold",
                                        formData.createMission ? "bg-[#0B0F19] text-primary" : "bg-slate-200 text-slate-500"
                                    )}>
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">Créer une mission initiale pour ce client</h4>
                                        <p className="text-xs text-slate-500">Configure automatiquement l'équipe SDR et le volume de rendez-vous cibles.</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    id="createMission"
                                    checked={formData.createMission}
                                    onChange={(e) => updateField("createMission", e.target.checked)}
                                    className="w-5 h-5 accent-[var(--brand-primary)] rounded cursor-pointer"
                                />
                            </div>

                            {formData.createMission && (
                                <div className="space-y-4 pt-4 mt-4 border-t border-blue-100">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Nom de la mission</label>
                                        <input
                                            type="text"
                                            value={formData.missionName}
                                            onChange={(e) => updateField("missionName", e.target.value)}
                                            placeholder={`Mission ${formData.name || "Client"}`}
                                            className="w-full h-10 px-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Canal principal</label>
                                            <select
                                                value={formData.missionChannel}
                                                onChange={(e) => updateField("missionChannel", e.target.value as "CALL" | "EMAIL" | "LINKEDIN")}
                                                className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                            >
                                                <option value="CALL">📞 Téléphone</option>
                                                <option value="EMAIL">📧 Email</option>
                                                <option value="LINKEDIN">💼 LinkedIn</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Durée (mois)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={24}
                                                value={formData.missionDurationMonths}
                                                onChange={(e) => updateField("missionDurationMonths", parseInt(e.target.value) || 3)}
                                                className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Objectif RDV / mois</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={formData.missionRdvTarget}
                                                onChange={(e) => updateField("missionRdvTarget", parseInt(e.target.value) || 0)}
                                                className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200 rounded-2xl">
                            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                                Synthèse de création
                            </h4>
                            <ul className="space-y-1.5 text-xs text-emerald-900 font-medium">
                                <li className="flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    Compte Client : <strong>{formData.name || "—"}</strong>
                                </li>
                                {formData.createMission && (
                                    <li className="flex items-center gap-2">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                        Mission : {formData.missionName || `Mission ${formData.name}`} ({formData.missionDurationMonths} mois, {formData.missionRdvTarget} RDV/mois)
                                    </li>
                                )}
                                {generatedPlaybook && (
                                    <li className="flex items-center gap-2">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                        Sales Playbook &amp; Scripts IA rattachés
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ============================================
    // HANDLE "NEXT" on source step: auto-generate
    // ============================================

    const handleSourceNext = async () => {
        if (creationMode === "leexi" || creationMode === "paste") {
            if (!generatedPlaybook) {
                await generatePlaybook();
            } else {
                handleNext();
            }
        } else {
            handleNext();
        }
    };

    // ============================================
    // RENDER MODAL
    // ============================================

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop - Soft focus without darkening the entire screen */}
            <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
                onClick={handleClose}
            />

            {/* Dialog Container with #FCFAFF soft background */}
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FCFAFF] rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
                
                {/* ── Top Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0D1527] to-[#04060A] px-6 sm:px-8 py-5 border-b border-slate-800 flex-shrink-0">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                        Nouveau Compte Client
                                    </h2>
                                    {creationMode && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-indigo-300 border border-white/10">
                                            {creationMode === "leexi" ? "Leexi AI Sync" : creationMode === "paste" ? "Import Texte" : "Manuel"}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {!creationMode
                                        ? "Choisissez une méthode d'intégration"
                                        : steps[currentStep]?.description || "Configuration du client"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {creationMode && (
                                <button
                                    type="button"
                                    onClick={handleBackToModeSelect}
                                    className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    Changer de source
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleClose}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Stepper (when mode is active) */}
                    {creationMode && (
                        <div className="relative z-10 flex items-center gap-1 mt-5 pt-4 border-t border-slate-800/80">
                            {steps.map((step, idx) => {
                                const isDone = idx < currentStep;
                                const isActive = idx === currentStep;
                                const Icon = step.icon;
                                return (
                                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (idx <= currentStep) setCurrentStep(idx);
                                            }}
                                            disabled={idx > currentStep}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                                isActive
                                                    ? "bg-primary text-white shadow-md shadow-blue-500/30 scale-105"
                                                    : isDone
                                                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                                                        : "bg-white/5 text-slate-500 cursor-not-allowed"
                                            )}
                                        >
                                            {isDone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Icon className="w-3.5 h-3.5" />}
                                            <span className="hidden sm:inline">{step.label}</span>
                                        </button>
                                        {idx < steps.length - 1 && (
                                            <div className={cn(
                                                "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                                                idx < currentStep ? "bg-emerald-500/50" : "bg-slate-800"
                                            )} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Body (Soft #FCFAFF surface) ── */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#FCFAFF]">
                    {!creationMode ? renderModeSelector() : renderStepContent()}
                </div>

                {/* ── Footer Navigation ── */}
                {creationMode && (
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-[#FCFAFF] border-t border-slate-200/80 flex-shrink-0">
                        <Button
                            variant="secondary"
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className="gap-1.5 text-xs font-bold"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Retour
                        </Button>

                        <div className="flex items-center gap-2">
                            {currentStep === steps.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !canProceed()}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Finaliser &amp; Créer le Client
                                </button>
                            ) : steps[currentStep]?.id === "source" ? (
                                <button
                                    type="button"
                                    onClick={handleSourceNext}
                                    disabled={!canProceed() || isGeneratingPlaybook}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
                                >
                                    {isGeneratingPlaybook ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Extraction IA en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Analyser et extraire
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-black/10 transition-all disabled:opacity-50"
                                >
                                    Continuer
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ReviewField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const [editing, setEditing] = useState(false);
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            {editing ? (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setEditing(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
                    autoFocus
                    className="w-full h-8 px-2.5 border border-violet-400 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
            ) : (
                <div
                    onClick={() => setEditing(true)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-violet-300 cursor-pointer group transition-colors"
                >
                    <span className={cn("text-xs font-semibold", value ? "text-slate-900" : "text-slate-400 italic")}>
                        {value || "Non détecté"}
                    </span>
                    <Edit3 className="w-3 h-3 text-slate-300 group-hover:text-violet-600 transition-colors" />
                </div>
            )}
        </div>
    );
}

function ReviewNumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    const [editing, setEditing] = useState(false);
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            {editing ? (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    onBlur={() => setEditing(false)}
                    autoFocus
                    className="w-full h-8 px-2 border border-violet-400 rounded-xl bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
            ) : (
                <div onClick={() => setEditing(true)} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-violet-300 cursor-pointer group transition-colors">
                    <span className="text-xs font-bold text-slate-900">{value || "—"}</span>
                    <Edit3 className="w-3 h-3 text-slate-300 group-hover:text-violet-600 transition-colors" />
                </div>
            )}
        </div>
    );
}

function ReviewTagField({
    label, tags, onRemove, onAdd
}: {
    label: string;
    tags: string[];
    onRemove: (tag: string) => void;
    onAdd: (tag: string) => void;
}) {
    const [adding, setAdding] = useState(false);
    const [inputVal, setInputVal] = useState("");

    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 text-[11px] font-bold">
                        {tag}
                        <button type="button" onClick={() => onRemove(tag)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                    </span>
                ))}
                {adding ? (
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && inputVal.trim()) { onAdd(inputVal.trim()); setInputVal(""); setAdding(false); }
                            if (e.key === "Escape") setAdding(false);
                        }}
                        onBlur={() => setAdding(false)}
                        autoFocus
                        placeholder="Ajouter..."
                        className="h-7 w-28 px-2 border border-violet-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="text-[11px] font-bold px-2 py-0.5 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-violet-400 hover:text-violet-700 transition-colors"
                    >
                        + Ajouter
                    </button>
                )}
                {tags.length === 0 && !adding && (
                    <span className="text-xs text-slate-400 italic">Non détecté</span>
                )}
            </div>
        </div>
    );
}

function SignalBadge({ signal }: { signal: PlaybookSignal }) {
    const styles = {
        positive: "bg-emerald-50 border-emerald-200 text-emerald-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        neutral: "bg-slate-50 border-slate-200 text-slate-700",
    };
    const icons = {
        positive: <Check className="w-3.5 h-3.5 text-emerald-600" />,
        warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        neutral: <ArrowRight className="w-3.5 h-3.5 text-slate-500" />,
    };

    return (
        <div className={cn("flex items-center gap-2 text-xs font-semibold p-2 border rounded-xl", styles[signal.type])}>
            {icons[signal.type]}
            {signal.text}
        </div>
    );
}

function TagInput({
    tags, options, onAdd, onRemove, placeholder
}: {
    tags: string[];
    options: string[];
    onAdd: (v: string) => void;
    onRemove: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 items-center p-2 rounded-xl bg-white border border-slate-200 min-h-[44px]">
            {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                    {tag}
                    <button type="button" onClick={() => onRemove(tag)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
            ))}
            <select
                onChange={(e) => { if (e.target.value) { onAdd(e.target.value); e.target.value = ""; } }}
                className="text-xs font-semibold border-0 bg-transparent text-slate-500 cursor-pointer focus:ring-0"
            >
                <option value="">{placeholder}</option>
                {options.filter(i => !tags.includes(i)).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}
