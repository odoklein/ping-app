"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Target,
    Building2,
    FileText,
    Users,
    MessageCircle,
    Megaphone,
} from "lucide-react";
import type {
    CommsThreadListItem,
    CommsChannelType,
} from "@/lib/comms/types";

interface ThreadListProps {
    threads: CommsThreadListItem[];
    selectedId?: string;
    onSelect: (thread: CommsThreadListItem) => void;
    isLoading?: boolean;
    currentUserId?: string;
}

const CHANNEL_ICONS: Record<CommsChannelType, typeof Target> = {
    MISSION: Target,
    CLIENT: Building2,
    CAMPAIGN: FileText,
    GROUP: Users,
    DIRECT: MessageCircle,
    BROADCAST: Megaphone,
};

const CHANNEL_COLORS: Record<CommsChannelType, string> = {
    MISSION: "bg-[#0C3B38]/10 text-[#0C3B38]",
    CLIENT: "bg-emerald-50 text-emerald-700",
    CAMPAIGN: "bg-amber-50 text-amber-700",
    GROUP: "bg-violet-50 text-violet-700",
    DIRECT: "bg-[#0C3B38]/8 text-[#0C3B38]",
    BROADCAST: "bg-orange-50 text-orange-700",
};

const CHANNEL_TAGS: Record<CommsChannelType, string> = {
    MISSION: "Mission",
    CLIENT: "Client",
    CAMPAIGN: "Campagne",
    GROUP: "Groupe",
    DIRECT: "Direct",
    BROADCAST: "Annonce",
};

function getThreadDisplayName(thread: CommsThreadListItem): string {
    if (thread.channelType === "DIRECT") {
        if (thread.otherParticipantName) return thread.otherParticipantName;
        if (thread.subject.startsWith("Message avec ")) {
            return thread.subject.replace("Message avec ", "");
        }
    }
    return thread.channelName;
}

function formatShortTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `${diffDays}j`;
    return formatDistanceToNow(date, { addSuffix: false, locale: fr });
}

function getInitials(name: string): string {
    return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export function ThreadList({
    threads,
    selectedId,
    onSelect,
    isLoading,
}: ThreadListProps) {
    if (isLoading) {
        return (
            <div className="space-y-0 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="flex items-start gap-3 p-3.5 rounded-xl animate-pulse"
                    >
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4" />
                            <div className="h-3 bg-slate-50 dark:bg-slate-800/70 rounded-md w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-14 h-14 rounded-2xl bg-[#ECE5D8] flex items-center justify-center mb-4">
                    <MessageCircle className="w-7 h-7 text-[#8B8BA7]" />
                </div>
                <p className="text-[14px] font-semibold text-[#12122A] mb-1">
                    Aucune discussion
                </p>
                <p className="text-[13px] text-[#8B8BA7] text-center">
                    Les conversations apparaîtront ici
                </p>
            </div>
        );
    }

    return (
            <div className="flex flex-col gap-1 px-2 py-2">
            {threads.map((thread) => {
                const ChannelIcon = CHANNEL_ICONS[thread.channelType];
                const isSelected = selectedId === thread.id;
                const hasUnread = thread.unreadCount > 0;
                const displayName = getThreadDisplayName(thread);
                const lastPreview = thread.lastMessage
                    ? thread.channelType === "DIRECT"
                        ? thread.lastMessage.content
                        : `${thread.lastMessage.authorName}: ${thread.lastMessage.content}`
                    : null;
                const updatedDate = new Date(thread.updatedAt);

                return (
                    <button
                        key={thread.id}
                        type="button"
                        onClick={() => onSelect(thread)}
                        aria-current={isSelected ? "true" : undefined}
                        aria-label={`${displayName}${hasUnread ? `, ${thread.unreadCount} non lu${thread.unreadCount > 1 ? "s" : ""}` : ""}`}
                        className={cn(
                            "w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg relative group transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0C3B38]/30",
                            isSelected
                                ? "bg-[#EEF4F0] dark:bg-emerald-950/30"
                                : "hover:bg-[#F7F6F2] dark:hover:bg-slate-800/70",
                            hasUnread && !isSelected && "bg-[#FFFBF4] dark:bg-slate-800/35"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#0C3B38] rounded-r-full" />
                        )}

                        <div
                            className={cn(
                                "size-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                                thread.channelType === "DIRECT"
                                    ? "bg-[#0C3B38] text-white text-[11px] font-bold"
                                    : cn(CHANNEL_COLORS[thread.channelType])
                            )}
                        >
                            {thread.channelType === "DIRECT" ? (
                                getInitials(displayName)
                            ) : (
                                <ChannelIcon className="w-4.5 h-4.5" />
                            )}
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5 gap-2">
                                <p
                                    className={cn(
                                        "text-[12px] truncate",
                                        hasUnread
                                            ? "font-bold text-[#12122A] dark:text-white"
                                            : "font-semibold text-[#12122A] dark:text-slate-200"
                                    )}
                                >
                                    {displayName}
                                </p>
                                <span
                                    className={cn(
                                        "text-[10px] shrink-0 font-medium",
                                        hasUnread
                                            ? "text-[#0C3B38] font-semibold"
                                            : "text-[#8B8BA7]"
                                    )}
                                >
                                    {formatShortTime(updatedDate)}
                                </span>
                            </div>

                            {thread.subject && thread.channelType !== "DIRECT" && (
                                <p className="text-[11px] text-[#5A5A7A] dark:text-slate-400 font-medium truncate mb-0.5">
                                    {thread.subject}
                                </p>
                            )}

                            {lastPreview && (
                                <p
                                    className={cn(
                                        "text-[11px] truncate leading-relaxed",
                                        hasUnread
                                            ? "text-[#3A3A5A] dark:text-slate-300 font-medium"
                                            : "text-[#8B8BA7] dark:text-slate-500"
                                    )}
                                >
                                    {lastPreview}
                                </p>
                            )}

                            <div className="mt-1 flex items-center gap-1.5">
                                {thread.channelType !== "DIRECT" && (
                                    <span className={cn(
                                        "text-[9px] font-semibold rounded px-1.5 py-0.5",
                                        CHANNEL_COLORS[thread.channelType]
                                    )}>
                                        {CHANNEL_TAGS[thread.channelType]}
                                    </span>
                                )}
                                {thread.isBroadcast && (
                                    <span className="text-[10px] bg-orange-50 text-orange-600 rounded-md px-1.5 py-0.5 font-semibold">
                                        Annonce
                                    </span>
                                )}
                                {hasUnread && (
                                    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#0C3B38] text-white">
                                        {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default ThreadList;
