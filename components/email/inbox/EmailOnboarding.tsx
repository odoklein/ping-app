"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
    Mail,
    Inbox,
    Users,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Check,
    Loader2,
    Server,
    AlertCircle,
    Eye,
    EyeOff,
    ShieldCheck,
    Lock,
    Sparkles,
    Zap,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Globe,
    Bot,
    Flame,
    Info,
    Building2,
    UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES & CONSTANTS
// ============================================

export interface EmailOnboardingProps {
    onMailboxConnected?: () => void;
}

type ProviderType = "gmail" | "outlook" | "imap" | null;
type MailboxUsageType = "PERSONAL" | "SHARED";

interface PresetConfig {
    id: string;
    name: string;
    badge?: string;
    imapHost: string;
    imapPort: string;
    smtpHost: string;
    smtpPort: string;
    helpText: string;
    domainHint?: string;
}

const PRESETS: PresetConfig[] = [
    {
        id: "ovh",
        name: "OVHcloud",
        badge: "Populaire FR",
        imapHost: "ssl0.ovh.net",
        imapPort: "993",
        smtpHost: "ssl0.ovh.net",
        smtpPort: "465",
        helpText: "Utilisez votre adresse email complète et le mot de passe de votre compte Webmail OVH.",
        domainHint: "ovh.net",
    },
    {
        id: "infomaniak",
        name: "Infomaniak",
        badge: "Suisse / RGPD",
        imapHost: "mail.infomaniak.com",
        imapPort: "993",
        smtpHost: "mail.infomaniak.com",
        smtpPort: "587",
        helpText: "Vérifiez que l'accès IMAP/SMTP externe est autorisé dans votre console Mail Manager Infomaniak.",
        domainHint: "infomaniak.com",
    },
    {
        id: "hostinger",
        name: "Hostinger",
        badge: "Titan / cPanel",
        imapHost: "imap.hostinger.com",
        imapPort: "993",
        smtpHost: "smtp.hostinger.com",
        smtpPort: "465",
        helpText: "Pour les comptes Titan Email ou cPanel Hostinger standard.",
        domainHint: "hostinger.com",
    },
    {
        id: "gandi",
        name: "Gandi",
        badge: "GandiMail",
        imapHost: "mail.gandi.net",
        imapPort: "993",
        smtpHost: "mail.gandi.net",
        smtpPort: "587",
        helpText: "Utilisez votre adresse de messagerie Gandi complète comme identifiant.",
        domainHint: "gandi.net",
    },
    {
        id: "icloud",
        name: "Apple iCloud",
        badge: "App Password",
        imapHost: "imap.mail.me.com",
        imapPort: "993",
        smtpHost: "smtp.mail.me.com",
        smtpPort: "587",
        helpText: "Nécessite un mot de passe pour application tierce généré sur appleid.apple.com.",
        domainHint: "icloud.com",
    },
    {
        id: "yahoo",
        name: "Yahoo Mail",
        badge: "App Password",
        imapHost: "imap.mail.yahoo.com",
        imapPort: "993",
        smtpHost: "smtp.mail.yahoo.com",
        smtpPort: "587",
        helpText: "Générez un mot de passe d'application dans les paramètres de sécurité de votre compte Yahoo.",
        domainHint: "yahoo.fr",
    },
    {
        id: "custom",
        name: "Serveur Dédié / Custom",
        badge: "Domaine Pro",
        imapHost: "",
        imapPort: "993",
        smtpHost: "",
        smtpPort: "587",
        helpText: "Configurez manuellement les adresses de vos serveurs de messagerie d'entreprise.",
    },
];

const VALUE_PILLARS = [
    {
        icon: Bot,
        title: "Copilote IA Prospecto",
        description: "Génération de brouillons intelligents, synthèse de longs échanges et détection d'opportunités.",
        tag: "Assistant IA",
        gradient: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-100",
    },
    {
        icon: Users,
        title: "Synchronisation CRM",
        description: "Association automatique de vos correspondants aux fiches contacts, entreprises et deals.",
        tag: "Auto-Matching",
        gradient: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-100",
    },
    {
        icon: Flame,
        title: "Délivrabilité & Santé",
        description: "Surveillance de réputation, respect des quotas d'envoi et alertes de configuration DNS (SPF/DKIM).",
        tag: "Protection",
        gradient: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-100",
    },
    {
        icon: Zap,
        title: "Boîte Unifiée Rapide",
        description: "Centralisez plusieurs adresses personnelles et d'équipe dans une interface fluide et sans friction.",
        tag: "Haute Performance",
        gradient: "from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-100",
    },
];

const FAQ_ITEMS = [
    {
        question: "Comment mes identifiants et données de connexion sont-ils sécurisés ?",
        answer: "La sécurité est notre priorité absolue. Pour Google et Microsoft, nous utilisons le protocole officiel OAuth 2.0 (aucun mot de passe n'est stocké). Pour les connexions IMAP/SMTP, vos identifiants sont chiffrés en base de données avec une clé AES-256 de niveau bancaire. Nous ne vendons ni ne partageons jamais le contenu de vos messages.",
    },
    {
        question: "Qu'est-ce qu'un mot de passe d'application et quand en ai-je besoin ?",
        answer: "Si vous utilisez l'authentification à deux facteurs (2FA) sur iCloud, Yahoo ou Google en mode IMAP, votre mot de passe habituel ne fonctionnera pas directement. Vous devez générer un 'mot de passe d'application' à usage unique depuis les paramètres de sécurité de votre fournisseur.",
    },
    {
        question: "Puis-je connecter plusieurs boîtes mails simultanément ?",
        answer: "Oui, tout à fait ! Une fois votre première boîte mail connectée, vous pourrez en ajouter d'autres à tout moment depuis l'onglet 'Boîtes mail' de votre Email Hub, qu'elles soient personnelles ou partagées avec votre équipe.",
    },
    {
        question: "Quelle est la différence entre une boîte Personnelle et Partagée ?",
        answer: "Une boîte personnelle est réservée à votre usage individuel. Une boîte partagée permet à vos collaborateurs et SDRs d'envoyer des campagnes ou de traiter les réponses de manière collaborative avec des permissions dédiées.",
    },
];

// ============================================
// STEP PROGRESS COMPONENT
// ============================================

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    stepsLabels: string[];
}

function StepIndicator({ currentStep, totalSteps, stepsLabels }: StepIndicatorProps) {
    return (
        <div className="w-full max-w-xl mx-auto mb-8">
            <div className="flex items-center justify-between relative">
                <div className="absolute left-6 right-6 top-4 h-[2px] bg-slate-200 -z-0" />
                <div
                    className="absolute left-6 top-4 h-[2px] bg-gradient-to-r from-[#2890F8] to-[#156cd4] transition-all duration-500 -z-0"
                    style={{
                        width: `${((currentStep) / (totalSteps - 1)) * 88}%`,
                    }}
                />

                {stepsLabels.map((label, idx) => {
                    const isDone = idx < currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 z-10">
                            <div
                                className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ring-4 ring-[#F5F7F6]",
                                    isDone
                                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-100"
                                        : isCurrent
                                            ? "bg-[#2890F8] text-white shadow-lg shadow-blue-500/30 scale-110"
                                            : "bg-white text-slate-400 border border-slate-200"
                                )}
                            >
                                {isDone ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                    <span>{idx + 1}</span>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-semibold tracking-tight transition-colors duration-200",
                                    isCurrent ? "text-slate-900" : isDone ? "text-emerald-700" : "text-slate-400"
                                )}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// IMAP CONFIGURATION FORM COMPONENT
// ============================================

interface ImapFormData {
    email: string;
    password: string;
    imapHost: string;
    imapPort: string;
    smtpHost: string;
    smtpPort: string;
    displayName: string;
    type: MailboxUsageType;
}

interface ImapConfigFormProps {
    onSubmit: (data: ImapFormData) => void;
    onBack: () => void;
    isLoading: boolean;
    error: string | null;
}

function ImapConfigForm({ onSubmit, onBack, isLoading, error }: ImapConfigFormProps) {
    const [selectedPresetId, setSelectedPresetId] = useState<string>("custom");
    const [showPassword, setShowPassword] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const [formData, setFormData] = useState<ImapFormData>({
        email: "",
        password: "",
        imapHost: "",
        imapPort: "993",
        smtpHost: "",
        smtpPort: "587",
        displayName: "",
        type: "PERSONAL",
    });

    const updateField = (field: keyof ImapFormData, value: string) => {
        setValidationError(null);
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const applyPreset = (preset: PresetConfig) => {
        setSelectedPresetId(preset.id);
        setValidationError(null);
        if (preset.id !== "custom") {
            setFormData((prev) => ({
                ...prev,
                imapHost: preset.imapHost,
                imapPort: preset.imapPort,
                smtpHost: preset.smtpHost,
                smtpPort: preset.smtpPort,
            }));
        }
    };

    const handleEmailChange = (email: string) => {
        updateField("email", email);
        const domain = email.split("@")[1]?.toLowerCase().trim();
        if (domain && !formData.imapHost) {
            const matchedPreset = PRESETS.find(
                (p) => p.domainHint && domain.includes(p.domainHint)
            );
            if (matchedPreset) {
                applyPreset(matchedPreset);
                return;
            }

            setFormData((prev) => ({
                ...prev,
                email,
                imapHost: `imap.${domain}`,
                smtpHost: `smtp.${domain}`,
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!formData.email.trim() || !formData.email.includes("@")) {
            setValidationError("Veuillez saisir une adresse email valide.");
            return;
        }
        if (!formData.password.trim()) {
            setValidationError("Le mot de passe de messagerie est requis.");
            return;
        }
        if (!formData.imapHost.trim() || !formData.smtpHost.trim()) {
            setValidationError("Les adresses des serveurs IMAP et SMTP sont requises.");
            return;
        }

        onSubmit(formData);
    };

    const activePreset = PRESETS.find((p) => p.id === selectedPresetId);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {(error || validationError) && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-3 animate-in fade-in duration-200">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800 space-y-1">
                        <p className="font-semibold">Impossible d&apos;établir la connexion</p>
                        <p className="text-red-700 text-xs leading-relaxed">{error || validationError}</p>
                    </div>
                </div>
            )}

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2890F8]" />
                        Fournisseurs & Pré-configurations rapides
                    </span>
                    <span className="text-[11px] text-slate-500">1-clic pour préremplir</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((preset) => {
                        const isSelected = selectedPresetId === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border",
                                    isSelected
                                        ? "bg-[#2890F8] text-white border-[#2890F8] shadow-sm shadow-blue-500/20"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
                                )}
                            >
                                <span>{preset.name}</span>
                                {preset.badge && (
                                    <span
                                        className={cn(
                                            "text-[10px] px-1.5 py-0.2 rounded font-medium",
                                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                        )}
                                    >
                                        {preset.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {activePreset && activePreset.helpText && (
                    <div className="mt-3 text-[11px] text-slate-600 bg-white/70 px-3 py-2 rounded-lg border border-slate-200/50 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{activePreset.helpText}</span>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                        Type d&apos;utilisation de cette boîte
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => updateField("type", "PERSONAL")}
                            className={cn(
                                "p-3 rounded-xl border text-left flex items-start gap-3 transition-all",
                                formData.type === "PERSONAL"
                                    ? "bg-blue-50/50 border-[#2890F8] ring-2 ring-blue-500/10 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                                    formData.type === "PERSONAL" ? "bg-[#2890F8] text-white" : "bg-slate-100 text-slate-500"
                                )}
                            >
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900">Boîte Personnelle</p>
                                <p className="text-[11px] text-slate-500">Pour vos échanges individuels directs</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => updateField("type", "SHARED")}
                            className={cn(
                                "p-3 rounded-xl border text-left flex items-start gap-3 transition-all",
                                formData.type === "SHARED"
                                    ? "bg-blue-50/50 border-[#2890F8] ring-2 ring-blue-500/10 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                                    formData.type === "SHARED" ? "bg-[#2890F8] text-white" : "bg-slate-100 text-slate-500"
                                )}
                            >
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900">Boîte d&apos;Équipe / SDR</p>
                                <p className="text-[11px] text-slate-500">Partagée pour campagnes et séquences</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Adresse email professionnelle <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#2890F8] focus:ring-4 focus:ring-[#2890F8]/10 outline-none transition-all text-sm font-medium"
                                placeholder="ex: contact@votre-entreprise.fr"
                            />
                            <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Nom d&apos;expéditeur affiché
                        </label>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => updateField("displayName", e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#2890F8] focus:ring-4 focus:ring-[#2890F8]/10 outline-none transition-all text-sm"
                            placeholder="ex: Jean Dupont (Prospecto)"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Mot de passe de messagerie <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-emerald-500" />
                                Chiffré AES-256
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={formData.password}
                                onChange={(e) => updateField("password", e.target.value)}
                                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#2890F8] focus:ring-4 focus:ring-[#2890F8]/10 outline-none transition-all text-sm font-medium"
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-slate-500" />
                            Paramètres de serveurs IMAP & SMTP
                        </span>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="text-[11px] font-normal">
                                {formData.imapHost && formData.smtpHost ? `${formData.imapHost} / ${formData.smtpHost}` : "Personnaliser"}
                            </span>
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </button>

                    {showAdvanced && (
                        <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Serveur IMAP (Réception)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.imapHost}
                                    onChange={(e) => updateField("imapHost", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:border-[#2890F8] outline-none"
                                    placeholder="imap.example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Port IMAP (SSL)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="65535"
                                    required
                                    value={formData.imapPort}
                                    onChange={(e) => updateField("imapPort", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:border-[#2890F8] outline-none"
                                    placeholder="993"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Serveur SMTP (Envoi)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.smtpHost}
                                    onChange={(e) => updateField("smtpHost", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:border-[#2890F8] outline-none"
                                    placeholder="smtp.example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Port SMTP (TLS/SSL)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="65535"
                                    required
                                    value={formData.smtpPort}
                                    onChange={(e) => updateField("smtpPort", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:border-[#2890F8] outline-none"
                                    placeholder="587 ou 465"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </button>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#2890F8] to-[#156cd4] hover:from-[#1f7fe2] hover:to-[#0f5bb8] text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-60"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Vérification & Établissement du tunnel SSL...</span>
                        </>
                    ) : (
                        <>
                            <span>Tester & Connecter la boîte</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

// ============================================
// MAIN COMPONENT: EmailOnboarding
// ============================================

export function EmailOnboarding({ onMailboxConnected }: EmailOnboardingProps) {
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [oauthConnecting, setOauthConnecting] = useState<"gmail" | "outlook" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [connectedMailboxEmail, setConnectedMailboxEmail] = useState<string>("");
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    const currentStep = isSuccess ? 2 : selectedProvider === "imap" ? 1 : 0;
    const stepsLabels = ["Choix du fournisseur", "Configuration & Sécurité", "Synchronisation"];

    const handleProviderSelect = async (providerId: ProviderType) => {
        setError(null);

        if (providerId === "gmail") {
            setOauthConnecting("gmail");
            window.location.href = "/api/email/oauth/gmail/connect?returnUrl=/manager/email";
        } else if (providerId === "outlook") {
            setOauthConnecting("outlook");
            window.location.href = "/api/email/oauth/outlook/connect?returnUrl=/manager/email";
        } else if (providerId === "imap") {
            setSelectedProvider("imap");
        }
    };

    const handleImapSubmit = async (data: ImapFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/email/mailboxes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: "CUSTOM",
                    email: data.email.trim(),
                    displayName: data.displayName.trim() || data.email.split("@")[0],
                    password: data.password,
                    imapHost: data.imapHost.trim(),
                    imapPort: parseInt(data.imapPort),
                    smtpHost: data.smtpHost.trim(),
                    smtpPort: parseInt(data.smtpPort),
                    type: data.type,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                const failedProtocols = [
                    result.imapOk === false ? "IMAP (Réception)" : null,
                    result.smtpOk === false ? "SMTP (Envoi)" : null,
                ]
                    .filter(Boolean)
                    .join(" et ");

                throw new Error(
                    failedProtocols
                        ? `Échec sur ${failedProtocols} : ${result.error || "Vérifiez vos identifiants et numéros de ports"}`
                        : result.error || "Erreur lors de la configuration de la boîte mail"
                );
            }

            setConnectedMailboxEmail(data.email);
            setIsSuccess(true);
            setTimeout(() => {
                onMailboxConnected?.();
            }, 1800);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de la connexion");
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // STEP 3: SUCCESS STATE
    // ============================================
    if (isSuccess) {
        return (
            <div className="min-h-full flex items-center justify-center p-6 bg-[#F5F7F6]">
                <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center animate-in zoom-in-95 fade-in duration-400">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in duration-300" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Connexion Établie avec Succès
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 mb-2">Boîte mail connectée !</h2>
                    <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
                        Votre adresse <span className="font-semibold text-slate-800">{connectedMailboxEmail}</span> est prête.
                        Synchronisation des dossiers et initialisation de l&apos;indexation en cours...
                    </p>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-2 mb-6">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Protocole IMAP (Réception) :</span>
                            <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Actif & Sécurisé
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Protocole SMTP (Envoi) :</span>
                            <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Prêt pour vos campagnes
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Chiffrement des clés :</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5 text-blue-500" /> AES-256 bits
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => onMailboxConnected?.()}
                        className="w-full py-3.5 px-6 rounded-xl bg-[#2890F8] hover:bg-[#1f7fe2] text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Accéder à la boîte de réception</span>
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // STEP 2: IMAP/SMTP CONFIGURATOR VIEW
    // ============================================
    if (selectedProvider === "imap") {
        return (
            <div className="min-h-full py-10 px-4 sm:px-6 bg-[#F5F7F6] overflow-y-auto">
                <div className="w-full max-w-2xl mx-auto">
                    <StepIndicator currentStep={currentStep} totalSteps={3} stepsLabels={stepsLabels} />

                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-5 mb-6">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md shadow-slate-900/10">
                                    <Server className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Configuration Serveur Professionnel
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Compatible OVH, Infomaniak, Hostinger, Gandi, iCloud & serveurs dédiés
                                    </p>
                                </div>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                TLS/SSL Sécurisé
                            </span>
                        </div>

                        <ImapConfigForm
                            onSubmit={handleImapSubmit}
                            onBack={() => {
                                setSelectedProvider(null);
                                setError(null);
                            }}
                            isLoading={isLoading}
                            error={error}
                        />
                    </div>

                    <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-slate-500" /> Chiffrement AES-256 bits
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-slate-500" /> Données hébergées en UE
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // STEP 1: PROVIDER SELECTION HERO VIEW
    // ============================================
    return (
        <div className="min-h-full py-10 px-4 sm:px-6 lg:px-8 bg-[#F5F7F6] overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto space-y-10">
                <StepIndicator currentStep={0} totalSteps={3} stepsLabels={stepsLabels} />

                <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-[#2890F8] text-xs font-bold tracking-wide shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        NOUVEL EMAIL HUB MANAGER & SDR
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                        Connectez votre messagerie professionnelle
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Centralisez vos échanges, activez la synchronisation instantanée avec votre CRM et boostez
                        vos réponses grâce au copilote IA.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-semibold text-slate-600">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            OAuth 2.0 Officiel
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                            <Lock className="w-4 h-4 text-[#2890F8]" />
                            Chiffrement AES-256
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Synchro Bidirectionnelle
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                            Sélectionnez votre service de messagerie
                        </h2>
                        <span className="text-xs text-slate-500">Installation en moins de 60 secondes</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                            onClick={() => handleProviderSelect("gmail")}
                            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-red-400 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 cursor-pointer overflow-hidden text-left"
                        >
                            <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-red-50/80 border border-red-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Image
                                            src="/icons/gmail.svg"
                                            alt="Google Workspace"
                                            width={28}
                                            height={28}
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-700 tracking-wide uppercase">
                                        OAuth 1-Clic
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                        Google Workspace
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Comptes Gmail professionnels et d&apos;entreprise via l&apos;API officielle Google.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Sans mot de passe (OAuth 2.0)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Libellés & Catégories synchronisés</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Support multi-comptes</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={oauthConnecting === "gmail"}
                                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-50 group-hover:bg-red-600 text-slate-700 group-hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs group-hover:shadow-md"
                            >
                                {oauthConnecting === "gmail" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Redirection Google...
                                    </>
                                ) : (
                                    <>
                                        <span>Connecter avec Google</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div
                            onClick={() => handleProviderSelect("outlook")}
                            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer overflow-hidden text-left"
                        >
                            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Image
                                            src="/icons/outlook.svg"
                                            alt="Microsoft 365"
                                            width={28}
                                            height={28}
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 tracking-wide uppercase">
                                        Recommandé Pro
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                        Microsoft 365 & Outlook
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Exchange Online, Azure AD et adresses Microsoft d&apos;entreprise.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Authentification SSO Microsoft</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Compatibilité boîtes partagées</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Dossiers & statuts de lecture</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={oauthConnecting === "outlook"}
                                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-50 group-hover:bg-[#0078D4] text-slate-700 group-hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs group-hover:shadow-md"
                            >
                                {oauthConnecting === "outlook" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Redirection Microsoft...
                                    </>
                                ) : (
                                    <>
                                        <span>Connecter avec Microsoft</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div
                            onClick={() => handleProviderSelect("imap")}
                            className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-800 hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300 cursor-pointer overflow-hidden text-left"
                        >
                            <div className="absolute top-0 right-0 w-28 h-28 bg-slate-800/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Server className="w-6 h-6 text-slate-800" />
                                    </div>
                                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 tracking-wide uppercase">
                                        Universel
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                                        IMAP / SMTP / Hébergeur
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        OVHcloud, Infomaniak, Hostinger, Gandi, iCloud ou serveur dédié.
                                    </p>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Pré-configurations 1-clic</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Diagnostic de connexion en direct</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span>Chiffrement SSL/TLS complet</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-50 group-hover:bg-slate-900 text-slate-700 group-hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs group-hover:shadow-md"
                            >
                                <span>Configurer manuellement</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-200/80">
                    <div className="text-center mb-6">
                        <h2 className="text-base font-bold text-slate-800">
                            Ce que vous débloquez dans l&apos;Email Hub
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Une suite d&apos;outils complète pour piloter vos conversions par email
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {VALUE_PILLARS.map((pillar, idx) => {
                            const IconComponent = pillar.icon;
                            return (
                                <div
                                    key={idx}
                                    className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center border",
                                                pillar.gradient
                                            )}
                                        >
                                            <IconComponent className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                                            {pillar.tag}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900">{pillar.title}</h3>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            {pillar.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-200/80">
                    <div className="max-w-2xl mx-auto space-y-4">
                        <div className="text-center mb-4">
                            <h2 className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                                <HelpCircle className="w-4 h-4 text-[#2890F8]" />
                                Questions fréquentes & Sécurité
                            </h2>
                        </div>

                        <div className="space-y-2.5">
                            {FAQ_ITEMS.map((faq, idx) => {
                                const isOpen = activeFaq === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-xl border border-slate-200/80 overflow-hidden transition-all"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setActiveFaq(isOpen ? null : idx)}
                                            className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                                        >
                                            <span>{faq.question}</span>
                                            {isOpen ? (
                                                <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50 animate-in fade-in duration-150">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmailOnboarding;
