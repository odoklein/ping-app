"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Star,
    Clock,
    Building2,
    AlertCircle,
    Archive,
    Trash2,
    Loader2,
    Inbox,
    Search,
    X,
    RefreshCw,
    Paperclip,
    Sparkles,
    SlidersHorizontal,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================
// TYPES
// ============================================

interface Thread {
    id: string;
    mailboxId: string;
    subject: string;
    snippet: string | null;
    participantEmails: string[];
    isRead: boolean;
    isStarred: boolean;
    labels: string[];
    sentiment: string | null;
    priority: string | null;
    summary: string | null;
    slaDeadline: string | null;
    lastEmailAt: string;
    messageCount: number;
    latestEmail: {
        id: string;
        fromAddress: string;
        fromName: string | null;
        direction: string;
        attachments: { id: string }[];
    } | null;
    clientId: string | null;
    missionId: string | null;
    assignedTo: {
        id: string;
        name: string;
    } | null;
    mailbox: {
        email: string;
        displayName: string | null;
    };
}

interface ThreadListProps {
    mailboxId?: string;
    folder: string;
    selectedThreadId?: string;
    onSelectThread: (thread: { id: string; subject: string; mailboxId: string }) => void;
    refreshKey?: number;
}

// ============================================
// HELPERS
// ============================================

function formatSmartDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) {
        return format(date, "HH:mm", { locale: fr });
    }
    if (isYesterday(date)) {
        return "Hier";
    }
    if (isThisWeek(date)) {
        return format(date, "EEEE", { locale: fr });
    }
    return format(date, "d MMM", { locale: fr });
}

function getAvatarColor(name: string): string {
    const colors = [
        "from-[#0c3b38] to-[#114b46]",
        "from-[#114b46] to-[#25745f]",
        "from-[#25745f] to-[#0c3b38]",
        "from-[#e07c00] to-[#ff9e1b]",
        "from-[#082c2a] to-[#0c3b38]",
        "from-[#0c3b38] to-[#082c2a]",
        "from-[#114b46] to-[#082c2a]",
        "from-[#ff9e1b] to-[#e07c00]",
        "from-[#082c2a] to-[#114b46]",
        "from-[#394b46] to-[#0c3b38]",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || "?").toUpperCase();
}

// ============================================
// DEBOUNCE HOOK
// ============================================

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// ============================================
// SKELETON LOADER
// ============================================

function ThreadSkeleton() {
    return (
        <div className="px-5 py-4 border-b border-slate-100/80">
            <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-full skeleton-shimmer flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="h-4 w-32 skeleton-shimmer rounded" />
                        <div className="h-3 w-12 skeleton-shimmer rounded" />
                    </div>
                    <div className="h-3.5 w-48 skeleton-shimmer rounded" />
                    <div className="h-3 w-64 skeleton-shimmer rounded" />
                </div>
            </div>
        </div>
    );
}

// ============================================
// THREAD LIST COMPONENT
// ============================================

export function ThreadList({
    mailboxId,
    folder,
    selectedThreadId,
    onSelectThread,
    refreshKey = 0,
}: ThreadListProps) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [quickFilter, setQuickFilter] = useState<"unread" | "today" | "attachments" | "starred" | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const fetchingRef = useRef(false);

    // Debounce search by 400ms
    const debouncedSearch = useDebounce(searchInput, 400);

    // Fetch threads
    const fetchThreads = useCallback(async (pageNum: number, append: boolean = false) => {
        // Pagination guard - prevent duplicate fetches
        if (fetchingRef.current && append) return;
        fetchingRef.current = true;

        if (!append) {
            setIsLoading(true);
            setError(null);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const params = new URLSearchParams({
                folder,
                page: pageNum.toString(),
                limit: "30",
            });

            if (mailboxId) {
                params.set("mailboxId", mailboxId);
            }
            if (debouncedSearch) {
                params.set("search", debouncedSearch);
            }
            if (quickFilter === "unread") params.set("isRead", "false");
            if (quickFilter === "starred") params.set("isStarred", "true");
            if (quickFilter === "attachments") params.set("hasAttachments", "true");
            if (quickFilter === "today") {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                params.set("dateFrom", start.toISOString());
            }

            const res = await fetch(`/api/email/threads?${params.toString()}`);

            if (!res.ok) {
                throw new Error(`Erreur ${res.status}`);
            }

            const json = await res.json();

            if (json.success) {
                if (append) {
                    setThreads(prev => [...prev, ...json.data.threads]);
                } else {
                    setThreads(json.data.threads);
                }
                setHasMore(json.data.hasMore);
            } else {
                throw new Error(json.error || "Erreur inconnue");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur de chargement";
            if (!append) {
                setError(message);
            }
            console.error("Failed to fetch threads:", err);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
            fetchingRef.current = false;
        }
    }, [mailboxId, folder, debouncedSearch, quickFilter]);

    // Reset and refetch on filter change
    useEffect(() => {
        setPage(1);
        fetchThreads(1, false);
    }, [mailboxId, folder, debouncedSearch, quickFilter, refreshKey, fetchThreads]);

    // Scroll-based pagination
    const handleScroll = useCallback(() => {
        if (!listRef.current || !hasMore || isLoadingMore || fetchingRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 150) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchThreads(nextPage, true);
        }
    }, [hasMore, isLoadingMore, page, fetchThreads]);

    // Thread actions with optimistic updates and rollback
    const handleStar = async (e: React.MouseEvent, threadId: string, isStarred: boolean) => {
        e.stopPropagation();
        const prevThreads = threads;
        setThreads(prev => prev.map(t =>
            t.id === threadId ? { ...t, isStarred: !isStarred } : t
        ));
        try {
            const res = await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isStarred: !isStarred }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setThreads(prevThreads); // Rollback
        }
    };

    const handleArchive = async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();
        const prevThreads = threads;
        setThreads(prev => prev.filter(t => t.id !== threadId));
        try {
            const res = await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setThreads(prevThreads); // Rollback
        }
    };

    const handleTrash = async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();
        const prevThreads = threads;
        setThreads(prev => prev.filter(t => t.id !== threadId));
        try {
            const res = await fetch(`/api/email/threads/${threadId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error();
        } catch {
            setThreads(prevThreads); // Rollback
        }
    };

    // Error state
    if (error && threads.length === 0) {
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <SearchBar
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    isSearchFocused={isSearchFocused}
                    setIsSearchFocused={setIsSearchFocused}
                    searchRef={searchRef}
                    quickFilter={quickFilter}
                    setQuickFilter={setQuickFilter}
                />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                        <AlertCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-slate-800 mb-1.5">
                        Erreur de chargement
                    </h3>
                    <p className="text-sm text-slate-400 max-w-[260px] leading-relaxed mb-4">
                        {error}
                    </p>
                    <button
                        onClick={() => {
                            setPage(1);
                            fetchThreads(1, false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary hover:bg-primary-light rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (!isLoading && threads.length === 0) {
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <SearchBar
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    isSearchFocused={isSearchFocused}
                    setIsSearchFocused={setIsSearchFocused}
                    searchRef={searchRef}
                    quickFilter={quickFilter}
                    setQuickFilter={setQuickFilter}
                />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-5">
                        <Inbox className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-slate-800 mb-1.5">
                        {searchInput ? "Aucun résultat" : "Boîte vide"}
                    </h3>
                    <p className="text-sm text-slate-400 max-w-[240px] leading-relaxed">
                        {searchInput
                            ? "Essayez de modifier votre recherche"
                            : "Aucun message dans ce dossier"}
                    </p>
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput("")}
                            className="mt-4 px-4 py-2 text-sm font-bold text-primary hover:bg-primary-light rounded-lg transition-colors"
                        >
                            Effacer la recherche
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <SearchBar
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                isSearchFocused={isSearchFocused}
                setIsSearchFocused={setIsSearchFocused}
                searchRef={searchRef}
                quickFilter={quickFilter}
                setQuickFilter={setQuickFilter}
            />

            {/* Thread List */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto email-scrollbar"
            >
                {isLoading && threads.length === 0 ? (
                    <div>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <ThreadSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="email-entrance">
                        {threads.map((thread) => (
                            <ThreadListItem
                                key={thread.id}
                                thread={thread}
                                isSelected={thread.id === selectedThreadId}
                                onSelect={() => onSelectThread({
                                    id: thread.id,
                                    subject: thread.subject,
                                    mailboxId: thread.mailboxId,
                                })}
                                onStar={(e) => handleStar(e, thread.id, thread.isStarred)}
                                onArchive={(e) => handleArchive(e, thread.id)}
                                onTrash={(e) => handleTrash(e, thread.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Load more indicator */}
                {isLoadingMore && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// SEARCH BAR
// ============================================

function SearchBar({
    searchInput,
    setSearchInput,
    isSearchFocused,
    setIsSearchFocused,
    searchRef,
    quickFilter,
    setQuickFilter,
}: {
    searchInput: string;
    setSearchInput: (q: string) => void;
    isSearchFocused: boolean;
    setIsSearchFocused: (f: boolean) => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
    quickFilter: "unread" | "today" | "attachments" | "starred" | null;
    setQuickFilter: (filter: "unread" | "today" | "attachments" | "starred" | null) => void;
}) {
    const filters = [
        { id: "unread" as const, label: "Non lus" },
        { id: "today" as const, label: "Aujourd'hui" },
        { id: "attachments" as const, label: "Pièces jointes" },
        { id: "starred" as const, label: "Favoris" },
    ];

    return (
        <div className="p-3 border-b border-[#EEF2F1] bg-white">
            <div className={cn(
                "relative rounded-xl transition-all duration-200",
                isSearchFocused
                    ? "ring-2 ring-primary/25 shadow-sm"
                    : ""
            )}>
                <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    isSearchFocused ? "text-primary" : "text-slate-400"
                )} />
                <input
                    ref={searchRef}
                    type="text"
                    placeholder="Rechercher des emails..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="w-full pl-9 pr-9 py-2.5 bg-[#F7F9F8] border border-[#DDE5E2] rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
                {searchInput ? (
                    <button
                        onClick={() => setSearchInput("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                        /
                    </kbd>
                )}
            </div>
            {(isSearchFocused || quickFilter) && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto email-scrollbar">
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setQuickFilter(quickFilter === filter.id ? null : filter.id)}
                            className={cn(
                                "h-7 px-2.5 rounded-md border text-[11px] font-semibold whitespace-nowrap transition-all duration-150 active:translate-y-px",
                                quickFilter === filter.id
                                    ? "border-[#C98A32] bg-[#FFF4E2] text-[#8A4D00]"
                                    : "border-[#DDE5E2] bg-white text-slate-500 hover:border-primary/20 hover:bg-[#F1F4F3] hover:text-primary"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// THREAD LIST ITEM
// ============================================

interface ThreadListItemProps {
    thread: Thread;
    isSelected: boolean;
    onSelect: () => void;
    onStar: (e: React.MouseEvent) => void;
    onArchive: (e: React.MouseEvent) => void;
    onTrash: (e: React.MouseEvent) => void;
}

function ThreadListItem({
    thread,
    isSelected,
    onSelect,
    onStar,
    onArchive,
    onTrash,
}: ThreadListItemProps) {
    const sender = thread.latestEmail?.fromName || thread.latestEmail?.fromAddress || "Inconnu";
    const isOutbound = thread.latestEmail?.direction === "OUTBOUND";
    const smartDate = formatSmartDate(thread.lastEmailAt);
    const avatarColor = getAvatarColor(sender);
    const initials = getInitials(sender);

    return (
        <div
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
            role="button"
            tabIndex={0}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
                "group relative px-4 py-3.5 cursor-pointer border-b border-l-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary transition-[background-color,border-color,box-shadow] duration-150",
                isSelected
                    ? "border-l-[var(--brand-primary)] border-b-slate-200 bg-primary-light/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_10px_rgba(var(--brand-primary-rgb),0.06)]"
                    : "border-l-transparent border-b-[#EEF2F1] hover:bg-[#F7F9F8] hover:border-l-[#CBD8D4] focus-within:bg-[#F7F9F8]",
                !thread.isRead && !isSelected && "bg-white"
            )}
        >
            <div className="flex items-start gap-3.5">
                {/* Avatar */}
                <div className="relative flex-shrink-0 mt-[1px]">
                    <div className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold bg-gradient-to-br text-white shadow-sm",
                        thread.clientId
                            ? "from-emerald-400 to-emerald-600"
                            : avatarColor
                    )}>
                        {initials}
                    </div>
                    {!thread.isRead && (
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Sender + Date */}
                    <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                                "text-[14px] truncate",
                                thread.isRead ? "text-slate-600 font-medium" : "font-semibold text-slate-900"
                            )}>
                                {isOutbound ? `À: ${thread.latestEmail?.toAddresses?.[0] || ""}` : sender}
                            </span>
                            {thread.messageCount > 1 && (
                                <span className="flex-shrink-0 text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium tabular-nums">
                                    {thread.messageCount}
                                </span>
                            )}
                        </div>
                        <span className={cn(
                            "text-[11px] flex-shrink-0 tabular-nums pr-1",
                            thread.isRead ? "text-slate-400" : "text-primary font-semibold"
                        )}>
                            {smartDate}
                        </span>
                    </div>

                    {/* Row 2: Subject */}
                    <p className={cn(
                        "text-[13px] truncate leading-snug pr-2",
                        thread.isRead ? "text-slate-500" : "text-slate-800 font-medium"
                    )}>
                        {thread.subject || "(Sans objet)"}
                    </p>

                    {/* Row 3: Snippet + badges */}
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-[12px] text-slate-400 truncate flex-1 pr-2">
                            {thread.snippet}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {thread.clientId && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100" title="Lié à un client">
                                    <Building2 className="w-3 h-3 text-emerald-500" />
                                </div>
                            )}
                            {thread.priority === "high" && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100" title="Haute priorité">
                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                </div>
                            )}
                            {thread.slaDeadline && new Date(thread.slaDeadline) < new Date() && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100" title="SLA dépassé">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                </div>
                            )}
                            {thread.isStarred && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                            )}
                            {thread.latestEmail?.attachments.length ? (
                                <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-label="Pièce jointe" />
                            ) : null}
                            {thread.summary && (
                                <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-label="Résumé IA disponible" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover actions */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white/95 backdrop-blur-sm shadow-md border border-[#DDE5E2] rounded-lg px-1 py-1 z-10 opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-x-0 group-focus-within:pointer-events-auto transition-all duration-150">
                <button
                    onClick={onStar}
                    className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        thread.isStarred
                            ? "text-amber-400 hover:bg-amber-50"
                            : "text-slate-400 hover:text-amber-400 hover:bg-slate-50"
                    )}
                    title={thread.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                    aria-label={thread.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                    <Star className={cn("w-4 h-4", thread.isStarred && "fill-current")} />
                </button>
                <button
                    onClick={onArchive}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    title="Archiver"
                    aria-label="Archiver"
                >
                    <Archive className="w-4 h-4" />
                </button>
                <button
                    onClick={onTrash}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                    aria-label="Supprimer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default ThreadList;
