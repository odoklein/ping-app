"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Target, Building2, Users, MessageCircle, Megaphone, Search, Loader2, Send, ArrowLeft, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { CommsChannelType, CreateThreadRequest } from "@/lib/comms/types";

interface NewThreadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (request: CreateThreadRequest) => Promise<void>;
    userRole: string;
    // Pre-selected context (optional)
    defaultChannelType?: CommsChannelType;
    defaultAnchorId?: string;
    defaultAnchorName?: string;
}

interface SelectableItem {
    id: string;
    name: string;
    subtitle?: string;
}

interface SearchApiItem extends SelectableItem {
    email?: string;
    clientName?: string;
    client?: { name: string };
}

interface SearchApiResponse {
    success?: boolean;
    data?: SearchApiItem[] | SearchApiResponse;
    missions?: SearchApiItem[];
    campaigns?: SearchApiItem[];
    users?: SearchApiItem[];
    clients?: SearchApiItem[];
    groups?: SearchApiItem[];
}

const CLIENT_SUPPORT_TEAM_ITEM_ID = "__client_support_team__";

const CHANNEL_OPTIONS: {
    type: CommsChannelType;
    label: string;
    icon: typeof Target;
    description: string;
    roles: string[];
}[] = [
        {
            type: "DIRECT",
            label: "Message direct à un SDR",
            icon: MessageCircle,
            description: "Contacter un SDR de vos missions",
            roles: ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "DEVELOPER", "CLIENT"],
        },
        {
            type: "MISSION",
            label: "Discussion mission",
            icon: Target,
            description: "Tous les assignés à la mission verront ce message",
            roles: ["MANAGER", "SDR", "BUSINESS_DEVELOPER"],
        },
        {
            type: "CLIENT",
            label: "Discussion client",
            icon: Building2,
            description: "Discussion liée à un client",
            roles: ["MANAGER", "BUSINESS_DEVELOPER"],
        },
        {
            type: "GROUP",
            label: "Groupe",
            icon: Users,
            description: "Discussion de groupe",
            roles: ["MANAGER", "BUSINESS_DEVELOPER"],
        },
        {
            type: "BROADCAST",
            label: "Annonce",
            icon: Megaphone,
            description: "Annonce à toute l'équipe",
            roles: ["MANAGER"],
        },
    ];

export function NewThreadModal({
    isOpen,
    onClose,
    onSubmit,
    userRole,
    defaultChannelType,
    defaultAnchorId,
    defaultAnchorName,
}: NewThreadModalProps) {
    const [step, setStep] = useState<"type" | "recipient" | "compose">("type");
    const [channelType, setChannelType] = useState<CommsChannelType | null>(
        defaultChannelType || null
    );
    const [anchorId, setAnchorId] = useState<string | null>(defaultAnchorId || null);
    const [anchorName, setAnchorName] = useState<string>(defaultAnchorName || "");
    const [message, setMessage] = useState("");
    const [isBroadcast, setIsBroadcast] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For DIRECT type
    const [selectedUser, setSelectedUser] = useState<SelectableItem | null>(null);
    const [clientSupportUserIds, setClientSupportUserIds] = useState<string[]>([]);

    // Searchable items for anchor selection
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SelectableItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep("type");
            setChannelType(defaultChannelType || null);
            setAnchorId(defaultAnchorId || null);
            setAnchorName(defaultAnchorName || "");
            setMessage("");
            setIsBroadcast(false);
            setSelectedUser(null);
            setClientSupportUserIds([]);
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [isOpen, defaultChannelType, defaultAnchorId, defaultAnchorName]);

    // Skip to compose if defaults provided
    useEffect(() => {
        if (defaultChannelType && defaultAnchorId) {
            setStep("compose");
        }
    }, [defaultChannelType, defaultAnchorId]);

    // CLIENT: load missions or support recipients when entering recipient step (no search)
    useEffect(() => {
        if (!isOpen || userRole !== "CLIENT" || step !== "recipient" || !channelType) {
            return;
        }
        if (channelType !== "MISSION" && channelType !== "DIRECT") {
            setSearchResults([]);
            return;
        }

        let cancelled = false;
        setIsSearching(true);
        (async () => {
            try {
                if (channelType === "MISSION") {
                    const res = await fetch("/api/missions?isActive=true");
                    if (!res.ok || cancelled) return;
                    const json = await res.json();
                    const list = Array.isArray(json.data) ? json.data : [];
                    const items: SelectableItem[] = list.map((m: { id: string; name: string }) => ({
                        id: m.id,
                        name: m.name,
                        subtitle: undefined,
                    }));
                    if (!cancelled) setSearchResults(items);
                } else {
                    const res = await fetch("/api/client/contactable-managers");
                    if (!res.ok || cancelled) return;
                    const json = await res.json();
                    const supportUsers = Array.isArray(json.supportTeamUsers)
                        ? json.supportTeamUsers
                        : [];
                    if (!cancelled) {
                        setClientSupportUserIds(
                            supportUsers
                                .map((u: { id: string }) => u.id)
                                .filter((id: string) => !!id),
                        );
                        setSearchResults(
                            supportUsers.length > 0
                                ? [
                                      {
                                          id: CLIENT_SUPPORT_TEAM_ITEM_ID,
                                          name: "Equipe support",
                                          subtitle: supportUsers
                                              .map((u: { name: string }) => u.name)
                                              .join(", "),
                                      },
                                  ]
                                : [],
                        );
                    }
                }
            } catch {
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, userRole, step, channelType]);

    // Search for anchors when query changes (non-CLIENT or CLIENT with search filter)
    useEffect(() => {
        if (userRole === "CLIENT" && (channelType === "MISSION" || channelType === "DIRECT")) {
            return;
        }
        if (!searchQuery || !channelType) {
            setSearchResults([]);
            return;
        }

        const searchAnchors = async () => {
            setIsSearching(true);
            try {
                let endpoint = "";
                switch (channelType) {
                    case "MISSION":
                        endpoint = `/api/missions?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "CLIENT":
                        endpoint = `/api/clients?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "CAMPAIGN":
                        endpoint = `/api/campaigns?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "GROUP":
                        endpoint = `/api/comms/groups?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "DIRECT":
                        endpoint = `/api/users?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    default:
                        return;
                }

                const res = await fetch(endpoint);
                if (res.ok) {
                    const response = await res.json() as SearchApiResponse | SearchApiItem[];

                    // Handle different response formats
                    let items: SearchApiItem[] = [];

                    if (!Array.isArray(response) && response.success === true) {
                        const responseData = response.data;

                        if (Array.isArray(responseData)) {
                            items = responseData;
                        } else if (responseData && responseData.users) {
                            items = responseData.users || [];
                        } else if (responseData?.campaigns) {
                            items = responseData.campaigns || [];
                        } else if (responseData?.missions) {
                            items = responseData.missions || [];
                        } else if (responseData?.clients) {
                            items = responseData.clients || [];
                        } else if (responseData?.groups) {
                            items = responseData.groups || [];
                        }
                    } else if (!Array.isArray(response) && response.missions) {
                        items = response.missions || [];
                    } else if (!Array.isArray(response) && response.campaigns) {
                        items = response.campaigns || [];
                    } else if (!Array.isArray(response) && response.users) {
                        items = response.users || [];
                    } else if (!Array.isArray(response) && response.clients) {
                        items = response.clients || [];
                    } else if (!Array.isArray(response) && response.groups) {
                        items = response.groups || [];
                    } else if (Array.isArray(response)) {
                        items = response;
                    }

                    // Normalize results
                    const normalizedItems: SelectableItem[] = items.map(
                        (item) => ({
                            id: item.id,
                            name: item.name,
                            subtitle: item.email || item.clientName || item.client?.name,
                        })
                    );
                    setSearchResults(normalizedItems.slice(0, 10));
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchAnchors, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, channelType, userRole]);

    const handleSelectType = (type: CommsChannelType) => {
        setChannelType(type);
        if (type === "BROADCAST") {
            setIsBroadcast(true);
            setStep("compose");
        } else {
            setStep("recipient");
        }
    };

    const handleSelectRecipient = (item: SelectableItem) => {
        if (channelType === "DIRECT" && item.id !== CLIENT_SUPPORT_TEAM_ITEM_ID) {
            setSelectedUser(item);
        } else if (channelType === "DIRECT") {
            setSelectedUser({ id: item.id, name: "Equipe support", subtitle: item.subtitle });
        }
        setAnchorId(item.id);
        setAnchorName(item.name);
        setStep("compose");
    };

    const handleSubmit = async () => {
        if (!channelType || !message.trim()) return;

        // For non-direct types, we need an anchor
        if (channelType !== "DIRECT" && channelType !== "BROADCAST" && !anchorId) return;

        setIsSubmitting(true);
        try {
            const request: CreateThreadRequest = {
                channelType,
                // For DIRECT messages, use recipient name as subject
                subject: channelType === "DIRECT" && selectedUser
                    ? `Message avec ${selectedUser.name}`
                    : channelType === "BROADCAST"
                        ? "Annonce"
                        : `Discussion - ${anchorName}`,
                initialMessage: message.trim(),
                isBroadcast,
            };

            if (channelType === "DIRECT") {
                if (userRole === "CLIENT") {
                    request.participantIds = clientSupportUserIds;
                } else if (selectedUser) {
                    request.participantIds = [selectedUser.id];
                }
            } else if (anchorId) {
                request.anchorId = anchorId;
            }

            await onSubmit(request);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableChannelOptions = CHANNEL_OPTIONS.filter((opt) =>
        opt.roles.includes(userRole)
    );

    const getRecipientPlaceholder = () => {
        switch (channelType) {
            case "DIRECT": return "Rechercher un collègue...";
            case "MISSION": return "Rechercher une mission...";
            case "CLIENT": return "Rechercher un client...";
            case "GROUP": return "Rechercher un groupe...";
            default: return "Rechercher...";
        }
    };

    const getRecipientLabel = () => {
        switch (channelType) {
            case "DIRECT": return "Envoyer à";
            case "MISSION": return "Mission";
            case "CLIENT": return "Client";
            case "GROUP": return "Groupe";
            default: return "Destinataire";
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false}>
            <div className="bg-white text-slate-900">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
                    <div className="flex items-center gap-3">
                        {step !== "type" && (
                            <button
                                onClick={() => setStep(step === "compose" ? "recipient" : "type")}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#E5EFEC] hover:text-[#0C3B38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25"
                                aria-label="Revenir à l'étape précédente"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-slate-900">
                            {step === "type" && "Nouveau message"}
                            {step === "recipient" && getRecipientLabel()}
                            {step === "compose" && (selectedUser?.name || anchorName || "Nouveau message")}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25"
                        aria-label="Fermer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step 1: Select type */}
                {step === "type" && (
                    <div className="grid gap-2">
                        {availableChannelOptions.map((opt) => {
                            const label = userRole === "CLIENT" && opt.type === "DIRECT" ? "Message a l'equipe support" : opt.label;
                            const description = userRole === "CLIENT" && opt.type === "DIRECT" ? "Contacter l'equipe support" : opt.description;
                            return (
                                <button
                                    key={opt.type}
                                    onClick={() => handleSelectType(opt.type)}
                                    className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-[#AFC5BF] hover:bg-[#F0F5F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25 sm:gap-4 sm:p-4"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                        "bg-slate-100 group-hover:bg-[#DBE4DF]"
                                    )}>
                                        <opt.icon className="h-6 w-6 text-slate-600 group-hover:text-[#0C3B38]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{label}</p>
                                        <p className="text-sm text-slate-500">{description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Step 2: Select recipient */}
                {step === "recipient" && (
                    <div>
                        {/* Search input (hidden for CLIENT: they see only their missions / SDRs) */}
                        {userRole !== "CLIENT" && (
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={getRecipientPlaceholder()}
                                    className="pl-10 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Results */}
                        <div className="max-h-72 overflow-y-auto">
                            {isSearching && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                </div>
                            )}
                            {!isSearching && searchResults.length === 0 && searchQuery && userRole !== "CLIENT" && (
                                <p className="text-sm text-slate-500 text-center py-8">
                                    Aucun résultat pour « {searchQuery} »
                                </p>
                            )}
                            {!isSearching && searchResults.length === 0 && (userRole === "CLIENT" || !searchQuery) && (
                                <div className="text-center py-8">
                                            {userRole === "CLIENT" ? (
                                                <>
                                                    <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                    <p className="text-sm text-slate-500">
                                                        {channelType === "MISSION"
                                                            ? "Aucune mission en cours."
                                                            : "Aucune equipe support disponible."}
                                                    </p>
                                                </>
                                            ) : (
                                        <>
                                            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">
                                                Commencez à taper pour rechercher
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                            {!isSearching && searchResults.length > 0 && (
                                <div className="space-y-1">
                                    {searchResults.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectRecipient(item)}
                                            className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[#F0F5F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0C3B38]/25"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 transition-colors group-hover:bg-[#DBE4DF] group-hover:text-[#0C3B38]">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {item.name}
                                                </p>
                                                {item.subtitle && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {item.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Compose - Simplified for direct messages */}
                {step === "compose" && (
                    <div className="space-y-4">
                        {/* Recipient indicator */}
                        <div className="flex items-center gap-3 rounded-xl border border-[#D7E3DF] bg-[#F0F5F3] p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DBE4DF] text-sm font-semibold text-[#0C3B38]">
                                {(selectedUser?.name || anchorName || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">
                                    {channelType === "DIRECT" ? "Message à" : channelType === "BROADCAST" ? "Annonce à" : "Discussion"}
                                </p>
                                <p className="text-sm font-medium text-slate-900">
                                    {selectedUser?.name || anchorName || (channelType === "BROADCAST" ? "Toute l'équipe" : "...")}
                                </p>
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Écrivez votre message..."
                                rows={5}
                                autoFocus
                                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0C3B38] focus:outline-none focus:ring-2 focus:ring-[#0C3B38]/15"
                            />
                        </div>

                        {/* Note for mission threads */}
                        {channelType === "MISSION" && (
                            <p className="flex items-start gap-2 rounded-lg border border-[#D7E3DF] bg-[#F0F5F3] px-3 py-2 text-xs leading-relaxed text-[#2F6B62]">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                Tous les SDR et managers assignés à cette mission verront cette discussion.
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <Button variant="secondary" onClick={onClose}>
                                Annuler
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!message.trim() || isSubmitting}
                                className="gap-2"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Envoyer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default NewThreadModal;
