"use client";

// ============================================
// MessageReactions – emoji reactions display + picker
// ============================================

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { CommsMessageReactionView } from "@/lib/comms/types";

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "👀", "🔥"];

interface MessageReactionsProps {
    messageId: string;
    reactions: CommsMessageReactionView[];
    currentUserId: string;
    onToggle: (messageId: string, emoji: string) => Promise<void>;
    className?: string;
}

export function MessageReactions({
    messageId,
    reactions,
    currentUserId,
    onToggle,
    className,
}: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClick = async (emoji: string) => {
        if (loading) return;
        setLoading(emoji);
        try {
            await onToggle(messageId, emoji);
        } finally {
            setLoading(null);
            setShowPicker(false);
        }
    };

    const hasReacted = (r: CommsMessageReactionView) => r.userIds.includes(currentUserId);

    return (
        <div className={cn("flex flex-wrap items-center gap-1 mt-1", className)}>
            {reactions.map((r) => (
                <button
                    key={r.emoji}
                    type="button"
                    onClick={() => handleClick(r.emoji)}
                    disabled={!!loading}
                    className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors",
                        hasReacted(r)
                            ? "bg-[#0C3B38]/8 border-[#0C3B38]/20 text-[#0C3B38] dark:text-emerald-300"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                    aria-label={`${hasReacted(r) ? "Retirer" : "Ajouter"} la réaction ${r.emoji}, ${r.count}`}
                >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                </button>
            ))}
            <div className="relative" ref={pickerRef}>
                <button
                    type="button"
                    onClick={() => setShowPicker(!showPicker)}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 text-xs w-6 h-6 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25"
                    aria-label="Ajouter une réaction"
                    aria-expanded={showPicker}
                >
                    +
                </button>
                {showPicker && (
                    <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50" role="menu" aria-label="Choisir une réaction">
                        {EMOJI_LIST.map((e) => (
                            <button
                                key={e}
                                type="button"
                                onClick={() => handleClick(e)}
                                disabled={!!loading}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25"
                                aria-label={`Réagir avec ${e}`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
