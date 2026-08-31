"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useCommsRealtime } from "@/hooks/useCommsRealtime";
import { useToast } from "@/components/ui/Toast";
import type { CommsRealtimePayload } from "@/lib/comms/events";
import {
    MessageSquare,
    Plus,
    Search,
    RefreshCw,
    Target,
    Building2,
    FileText,
    Users,
    MessageCircle,
    Megaphone,
    PanelLeftClose,
    PanelLeft,
    Loader2,
    X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CommsPageHeader } from "@/components/comms/CommsPageHeader";
import { ThreadList } from "@/components/comms/ThreadList";
import type {
    CommsThreadListItem,
    CommsThreadView,
    CommsMessageView,
    CommsInboxStats,
    CommsInboxFilters,
    CommsChannelType,
    CommsThreadStatus,
    CreateThreadRequest,
} from "@/lib/comms/types";

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";
}

function buildOptimisticMessage(
    tempId: string,
    content: string,
    currentUserId: string,
    currentUserName: string,
    currentUserRole: string
): CommsMessageView {
    return {
        id: tempId,
        threadId: "",
        type: "TEXT",
        content,
        author: {
            id: currentUserId,
            name: currentUserName,
            role: currentUserRole,
            initials: getInitials(currentUserName),
        },
        mentions: [],
        attachments: [],
        readBy: [],
        reactions: [],
        isEdited: false,
        isDeleted: false,
        isOwnMessage: true,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
    };
}

function buildMessageFromPayload(
    payload: CommsRealtimePayload,
    threadId: string,
    currentUserId: string
): CommsMessageView | null {
    if (payload.type !== "message_created" || !payload.messageId || !payload.content || !payload.createdAt) return null;
    const authorId = payload.userId ?? "";
    const authorName = payload.userName ?? "Utilisateur";
    return {
        id: payload.messageId,
        threadId,
        type: "TEXT",
        content: payload.content,
        author: {
            id: authorId,
            name: authorName,
            role: "",
            initials: getInitials(authorName),
        },
        mentions: [],
        attachments: [],
        readBy: [],
        reactions: [],
        isEdited: false,
        isDeleted: false,
        isOwnMessage: authorId === currentUserId,
        createdAt: payload.createdAt,
    };
}

// Lazy-load heavy panels/modals to improve initial page load
const ThreadView = dynamic(
    () => import("@/components/comms/ThreadView").then((m) => m.default),
    { ssr: false, loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0C3B38] motion-reduce:animate-none" /></div> }
);
const NewThreadModal = dynamic(
    () => import("@/components/comms/NewThreadModal").then((m) => m.NewThreadModal),
    { ssr: false }
);
const SearchPanel = dynamic(
    () => import("@/components/comms/SearchPanel").then((m) => m.SearchPanel),
    { ssr: false }
);

// ============================================
// FILTER OPTIONS
// ============================================

const FILTER_OPTIONS: {
    type: CommsChannelType | "all";
    label: string;
    icon: typeof Target;
}[] = [
        { type: "all", label: "Tous", icon: MessageSquare },
        { type: "MISSION", label: "Missions", icon: Target },
        { type: "CLIENT", label: "Clients", icon: Building2 },
        { type: "CAMPAIGN", label: "Campagnes", icon: FileText },
        { type: "GROUP", label: "Groupes", icon: Users },
        { type: "DIRECT", label: "Directs", icon: MessageCircle },
        { type: "BROADCAST", label: "Annonces", icon: Megaphone },
    ];

// ============================================
// CUSTOM HOOK FOR DEBOUNCED VALUE
// ============================================

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export function CommsWorkspace() {
    const { data: session } = useSession();
    const { error, success } = useToast();

    const [threads, setThreads] = useState<CommsThreadListItem[]>([]);
    const [selectedThread, setSelectedThread] = useState<CommsThreadView | null>(null);
    const [stats, setStats] = useState<CommsInboxStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingThread, setIsLoadingThread] = useState(false);
    const [showNewThreadModal, setShowNewThreadModal] = useState(false);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [isListCollapsed, setIsListCollapsed] = useState(false);
    const [focusMode, setFocusMode] = useState(false);

    // Filters
    const [filters, setFilters] = useState<CommsInboxFilters>({});
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const threadsAbortRef = useRef<AbortController | null>(null);
    const threadRequestRef = useRef(0);

    // Typing indicators per thread - support multiple users
    const [typingByThread, setTypingByThread] = useState<Record<string, string[]>>({});
    const typingTimeoutRef = useRef<Record<string, Record<string, ReturnType<typeof setTimeout>>>>({});

    // Fetch threads
    const fetchThreads = useCallback(async (refresh = false) => {
        threadsAbortRef.current?.abort();
        const controller = new AbortController();
        threadsAbortRef.current = controller;

        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const params = new URLSearchParams();
            if (filters.type) params.set("type", filters.type);
            if (filters.status) params.set("status", filters.status);
            if (filters.unreadOnly) params.set("unreadOnly", "true");
            if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);

            const res = await fetch(`/api/comms/threads?${params}`, {
                signal: controller.signal,
            });
            if (res.ok) {
                const data = await res.json();
                setThreads(data.threads || []);
            } else {
                error("Erreur", "Impossible de charger les discussions");
            }
        } catch (fetchError) {
            if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
            console.error("Error fetching threads:", fetchError);
            error("Erreur", "Impossible de charger les discussions");
        } finally {
            if (threadsAbortRef.current === controller) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [filters, debouncedSearchQuery, error]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/comms/inbox/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }, []);

    // Fetch thread details
    const fetchThreadDetails = useCallback(async (threadId: string, showLoading = true) => {
        const requestId = ++threadRequestRef.current;
        if (showLoading) setIsLoadingThread(true);
        try {
            const res = await fetch(`/api/comms/threads/${threadId}`);
            if (res.ok) {
                const data: CommsThreadView = await res.json();
                if (threadRequestRef.current === requestId) setSelectedThread(data);
            } else {
                throw new Error("Failed to load thread");
            }
        } catch (fetchError) {
            console.error("Error fetching thread:", fetchError);
            if (threadRequestRef.current === requestId) {
                setSelectedThread(null);
                error("Erreur", "Impossible de charger la discussion");
            }
        } finally {
            if (showLoading && threadRequestRef.current === requestId) setIsLoadingThread(false);
        }
    }, [error]);

    // Debounced stats refresh for realtime (avoid hammering)
    const statsRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetchStats = useCallback(() => {
        if (statsRefreshRef.current) clearTimeout(statsRefreshRef.current);
        statsRefreshRef.current = setTimeout(() => {
            statsRefreshRef.current = null;
            void fetchStats();
        }, 500);
    }, [fetchStats]);

    // Real-time event handler: incremental updates only (no full refetch)
    const handleRealtimeEvent = useCallback(
        (payload: CommsRealtimePayload) => {
            // Resolve threadId for typing when server sends only userId/userName (page has thread list)
            let tid = payload.threadId;
            if (!tid && (payload.type === "typing_start" || payload.type === "typing_stop") && payload.userId && selectedThread?.participants?.some((p) => p.userId === payload.userId)) {
                tid = selectedThread.id;
            }
            const userName = payload.userName;

            if (payload.type === "typing_start" && tid && userName) {
                if (!typingTimeoutRef.current[tid]) {
                    typingTimeoutRef.current[tid] = {};
                }
                if (typingTimeoutRef.current[tid][userName]) {
                    clearTimeout(typingTimeoutRef.current[tid][userName]);
                }
                setTypingByThread((prev) => {
                    const current = prev[tid] || [];
                    if (!current.includes(userName)) {
                        return { ...prev, [tid]: [...current, userName] };
                    }
                    return prev;
                });
                typingTimeoutRef.current[tid][userName] = setTimeout(() => {
                    setTypingByThread((prev) => {
                        const current = prev[tid] || [];
                        return { ...prev, [tid]: current.filter(n => n !== userName) };
                    });
                    delete typingTimeoutRef.current[tid][userName];
                }, 5000);
            } else if (payload.type === "typing_stop" && tid && userName) {
                setTypingByThread((prev) => {
                    const current = prev[tid] || [];
                    return { ...prev, [tid]: current.filter(n => n !== userName) };
                });
                if (typingTimeoutRef.current[tid]?.[userName]) {
                    clearTimeout(typingTimeoutRef.current[tid][userName]);
                    delete typingTimeoutRef.current[tid][userName];
                }
            }

            if (!tid) return;

            const currentUserId = session?.user?.id ?? "";

            switch (payload.type) {
                case "message_created": {
                    const msg = buildMessageFromPayload(payload, tid, currentUserId);
                    if (msg) {
                        setSelectedThread((prev) => {
                            if (prev?.id !== tid) return prev;
                            if (prev.messages.some((m) => m.id === msg.id)) return prev;
                            const optimisticIndex = prev.messages.findIndex(
                                (m) =>
                                    m.isOptimistic &&
                                    m.author.id === msg.author.id &&
                                    m.content === msg.content
                            );
                            if (optimisticIndex === -1) {
                                return { ...prev, messages: [...prev.messages, msg] };
                            }
                            const messages = [...prev.messages];
                            messages[optimisticIndex] = msg;
                            return { ...prev, messages };
                        });
                        setThreads((prev) =>
                            prev.map((t) =>
                                t.id === tid
                                    ? {
                                        ...t,
                                        unreadCount:
                                            selectedThread?.id !== tid && msg.author.id !== currentUserId
                                                ? t.unreadCount + 1
                                                : t.unreadCount,
                                        lastMessage: {
                                            content: payload.content ?? msg.content,
                                            authorName: payload.userName ?? msg.author.name,
                                            createdAt: payload.createdAt ?? msg.createdAt,
                                        },
                                        updatedAt: payload.createdAt ?? msg.createdAt,
                                    }
                                    : t
                            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                        );
                    }
                    debouncedFetchStats();
                    return;
                }
                case "message_updated":
                    setSelectedThread((prev) => {
                        if (!prev || prev.id !== tid || !payload.messageId) return prev;
                        return {
                            ...prev,
                            messages: prev.messages.map((m) =>
                                m.id === payload.messageId
                                    ? { ...m, content: payload.content ?? m.content }
                                    : m
                            ),
                        };
                    });
                    debouncedFetchStats();
                    return;
                case "message_deleted":
                    setSelectedThread((prev) => {
                        if (!prev || prev.id !== tid || !payload.messageId) return prev;
                        return {
                            ...prev,
                            messages: prev.messages.filter((m) => m.id !== payload.messageId),
                        };
                    });
                    debouncedFetchStats();
                    return;
                case "thread_status_updated":
                    if (payload.status) {
                        setSelectedThread((prev) =>
                            prev?.id === tid ? { ...prev, status: payload.status as CommsThreadStatus } : prev
                        );
                        setThreads((prev) =>
                            prev.map((t) =>
                                t.id === tid ? { ...t, status: payload.status as CommsThreadStatus } : t
                            )
                        );
                    }
                    debouncedFetchStats();
                    return;
                default:
                    break;
            }


        },
        [session?.user?.id, debouncedFetchStats, selectedThread]
    );

    const handleStatusChange = useCallback(
        async (status: CommsThreadStatus) => {
            const thread = selectedThread;
            if (!thread) return;

            setSelectedThread((prev) => (prev?.id === thread.id ? { ...prev, status } : prev));
            setThreads((prev) =>
                prev.map((t) => (t.id === thread.id ? { ...t, status } : t))
            );

            try {
                const res = await fetch(`/api/comms/threads/${thread.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                });

                if (res.ok) {
                    const statusMessages: Record<CommsThreadStatus, string> = {
                        OPEN: "Discussion rouverte",
                        RESOLVED: "Discussion résolue",
                        ARCHIVED: "Discussion archivée",
                    };
                    success("Succès", statusMessages[status]);
                    void fetchStats();
                } else {
                    setSelectedThread((prev) => (prev?.id === thread.id ? { ...prev, status: thread.status } : prev));
                    setThreads((prev) =>
                        prev.map((t) => (t.id === thread.id ? { ...t, status: thread.status } : t))
                    );
                    error("Erreur", "Impossible de modifier le statut");
                }
            } catch (err) {
                console.error("Error updating status:", err);
                setSelectedThread((prev) => (prev?.id === thread.id ? { ...prev, status: thread.status } : prev));
                setThreads((prev) =>
                    prev.map((t) => (t.id === thread.id ? { ...t, status: thread.status } : t))
                );
                error("Erreur", "Impossible de modifier le statut");
            }
        },
        [selectedThread, success, error, fetchStats]
    );

    const handleReactionToggle = useCallback(async (messageId: string, emoji: string) => {
        try {
            const res = await fetch(`/api/comms/messages/${messageId}/reactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
            });
            const data: { result?: "added" | "removed"; error?: string } = await res.json().catch(() => ({}));
            if (!res.ok || !data.result) throw new Error(data.error || "Reaction failed");

            const currentUserId = session?.user?.id;
            if (!currentUserId) return;
            setSelectedThread((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    messages: previous.messages.map((message) => {
                        if (message.id !== messageId) return message;
                        const reactions = [...(message.reactions ?? [])];
                        const reactionIndex = reactions.findIndex((reaction) => reaction.emoji === emoji);

                        if (data.result === "added") {
                            if (reactionIndex === -1) {
                                reactions.push({ emoji, count: 1, userIds: [currentUserId] });
                            } else if (!reactions[reactionIndex].userIds.includes(currentUserId)) {
                                const reaction = reactions[reactionIndex];
                                reactions[reactionIndex] = {
                                    ...reaction,
                                    count: reaction.count + 1,
                                    userIds: [...reaction.userIds, currentUserId],
                                };
                            }
                        } else if (reactionIndex !== -1) {
                            const reaction = reactions[reactionIndex];
                            const userIds = reaction.userIds.filter((id) => id !== currentUserId);
                            if (userIds.length === 0) reactions.splice(reactionIndex, 1);
                            else reactions[reactionIndex] = { ...reaction, count: userIds.length, userIds };
                        }

                        return { ...message, reactions };
                    }),
                };
            });
        } catch (reactionError) {
            console.error("Error toggling reaction:", reactionError);
            error("Erreur", "Impossible de modifier la réaction");
        }
    }, [session?.user?.id, error]);

    // Handle send message: optimistic UI, then confirm or rollback
    const handleSendMessage = useCallback(
        async (
            content: string,
            opts?: { mentionIds?: string[]; files?: File[] }
        ) => {
            const thread = selectedThread;
            if (!thread || !session?.user?.id) return false;

            const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const optimisticMsg = buildOptimisticMessage(
                tempId,
                content,
                session.user.id,
                session.user.name ?? "Vous",
                (session.user as { role?: string }).role ?? ""
            );
            optimisticMsg.threadId = thread.id;

            setSelectedThread((prev) =>
                prev?.id === thread.id
                    ? { ...prev, messages: [...prev.messages, optimisticMsg] }
                    : prev
            );

            try {
                const hasFiles = !!opts?.files?.length;
                let res: Response;

                if (hasFiles) {
                    const form = new FormData();
                    form.set("content", content);
                    if (opts.mentionIds?.length) {
                        form.set("mentionIds", JSON.stringify(opts.mentionIds));
                    }
                    for (const f of opts.files!) {
                        form.append("files", f);
                    }
                    res = await fetch(`/api/comms/threads/${thread.id}/messages`, {
                        method: "POST",
                        body: form,
                    });
                } else {
                    res = await fetch(`/api/comms/threads/${thread.id}/messages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            content,
                            mentionIds: opts?.mentionIds ?? [],
                        }),
                    });
                }

                const json = await res.json().catch(() => ({}));

                if (res.ok && json.id) {
                    const realId = json.id as string;
                    const createdAt = (json.createdAt as string) ?? new Date().toISOString();
                    setSelectedThread((prev) => {
                        if (!prev || prev.id !== thread.id) return prev;
                        const alreadyConfirmed = prev.messages.some((m) => m.id === realId);
                        const hasOptimistic = prev.messages.some((m) => m.id === tempId);
                        if (alreadyConfirmed && !hasOptimistic) return prev;
                        const messages = prev.messages
                            .filter((m) => m.id !== realId || m.id === tempId)
                            .map((m) =>
                                m.id === tempId
                                    ? { ...m, id: realId, createdAt, isOptimistic: undefined }
                                    : m
                            );
                        return { ...prev, messages };
                    });
                    void fetchStats();
                    if (hasFiles) void fetchThreadDetails(thread.id, false);
                    return true;
                } else {
                    setSelectedThread((prev) =>
                        prev?.id === thread.id
                            ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) }
                            : prev
                    );
                    error("Erreur", json?.error ?? "Impossible d'envoyer le message");
                    return false;
                }
            } catch (err) {
                console.error("Error sending message:", err);
                setSelectedThread((prev) =>
                    prev?.id === thread.id
                        ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) }
                        : prev
                );
                error("Erreur", "Impossible d'envoyer le message");
                return false;
            }
        },
        [selectedThread, session?.user, error, fetchStats, fetchThreadDetails]
    );

    // Resolve recipient user IDs for the current thread (for typing emissions).
    const getRecipientIdsForThread = useCallback(
        (threadId: string) => {
            if (selectedThread?.id !== threadId) return [];
            return selectedThread.participants
                .filter((p) => p.userId !== session?.user?.id)
                .map((p) => p.userId);
        },
        [selectedThread?.id, selectedThread?.participants, session?.user?.id]
    );

    // Real-time hook with presence
    const {
        onlineUsers,
        joinThread,
        leaveThread,
        startTyping,
        stopTyping
    } = useCommsRealtime({
        enabled: !!session?.user?.id,
        userId: session?.user?.id,
        onEvent: handleRealtimeEvent,
        getRecipientIdsForThread,
    });

    // Keep track of selected thread for room management
    const selectedThreadRef = useRef<string | null>(null);
    useEffect(() => {
        selectedThreadRef.current = selectedThread?.id || null;
    }, [selectedThread?.id]);

    // Initial load: threads and stats in parallel
    useEffect(() => {
        void fetchThreads();
        void fetchStats();
    }, [fetchThreads, fetchStats]);

    useEffect(() => {
        const typingTimeouts = typingTimeoutRef.current;
        return () => {
            threadsAbortRef.current?.abort();
            if (statsRefreshRef.current) clearTimeout(statsRefreshRef.current);
            Object.values(typingTimeouts).forEach((threadTimers) => {
                Object.values(threadTimers).forEach(clearTimeout);
            });
        };
    }, []);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isEditing =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable;

            if (event.key === "/" && !isEditing) {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
            if (event.key.toLowerCase() === "n" && !isEditing) {
                event.preventDefault();
                setShowNewThreadModal(true);
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    // Handle thread selection
    const handleSelectThread = useCallback(
        (thread: CommsThreadListItem) => {
            if (selectedThreadRef.current && selectedThreadRef.current !== thread.id) {
                leaveThread(selectedThreadRef.current);
            }
            joinThread(thread.id);

            const minimalThread: CommsThreadView = {
                ...thread,
                participants: [],
                messages: [],
            };
            setSelectedThread(minimalThread);
            void fetchThreadDetails(thread.id);
        },
        [fetchThreadDetails, joinThread, leaveThread]
    );

    // Handle close thread panel
    const handleCloseThread = useCallback(() => {
        threadRequestRef.current += 1;
        if (selectedThreadRef.current) {
            leaveThread(selectedThreadRef.current);
        }
        setSelectedThread(null);
        setIsLoadingThread(false);
        void fetchThreads(true);
    }, [leaveThread, fetchThreads]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!session?.user?.name || !selectedThread?.id) return;
        if (isTyping) {
            startTyping(selectedThread.id, session.user.name);
        } else {
            stopTyping(selectedThread.id, session.user.name);
        }
    }, [selectedThread?.id, session?.user?.name, startTyping, stopTyping]);

    const isRecipientOnline = useMemo(() => {
        if (!selectedThread) return false;
        return selectedThread.participants.some(
            p => p.userId !== session?.user?.id && onlineUsers.has(p.userId)
        );
    }, [selectedThread, session?.user?.id, onlineUsers]);



    // Handle create thread
    const handleCreateThread = async (request: CreateThreadRequest) => {
        try {
            const res = await fetch("/api/comms/threads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });

            if (res.ok) {
                const { id } = await res.json();
                success("Succès", "Discussion créée");
                fetchThreads(true);
                fetchStats();
                fetchThreadDetails(id);
            } else {
                error("Erreur", "Impossible de créer la discussion");
            }
        } catch (createError) {
            console.error("Error creating thread:", createError);
            error("Erreur", "Impossible de créer la discussion");
        }
    };

    // Handle filter change
    const handleFilterChange = (type: CommsChannelType | "all") => {
        setFilters((prev) => ({
            ...prev,
            type: type === "all" ? undefined : type,
        }));
    };

    // Calculate stats from data
    const totalUnread = stats?.totalUnread || 0;
    // Format typing indicator text
    const getTypingText = (threadId: string) => {
        const users = typingByThread[threadId] || [];
        if (users.length === 0) return undefined;
        if (users.length === 1) return users[0];
        if (users.length === 2) return `${users[0]} et ${users[1]}`;
        return `${users[0]} et ${users.length - 1} autres`;
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F8F7F3] dark:bg-slate-950">
            {!focusMode && (
                <div className="shrink-0 border-b border-[#E7E5DE] bg-[#F8F7F3] px-5 py-3 dark:border-slate-800 dark:bg-[#151c2a] sm:px-7">
                    <CommsPageHeader
                        title="Communications"
                        subtitle={
                            isLoading
                                ? "Chargement des discussions..."
                                : totalUnread > 0
                                  ? `${threads.length} discussion${threads.length !== 1 ? "s" : ""}, ${totalUnread} non lue${totalUnread !== 1 ? "s" : ""}`
                                  : `${threads.length} discussion${threads.length !== 1 ? "s" : ""}, tout est à jour`
                        }
                        icon={null}
                        actions={
                            <>
                                <button
                                    type="button"
                                    onClick={() => void fetchThreads(true)}
                                    disabled={isRefreshing}
                                    className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-[#0C3B38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25 disabled:opacity-50"
                                    aria-label="Actualiser les discussions"
                                    title="Actualiser"
                                >
                                    <RefreshCw className={cn("size-4", isRefreshing && "animate-spin motion-reduce:animate-none")} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowSearchPanel(true)}
                                    className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-[#0C3B38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25"
                                    aria-label="Ouvrir la recherche avancée"
                                    title="Recherche avancée"
                                >
                                    <Search className="size-4" />
                                </button>
                                <Button
                                    type="button"
                                    variant="success"
                                    size="sm"
                                    onClick={() => setShowNewThreadModal(true)}
                                    title="Nouveau message (N)"
                                    className="h-8 px-3 text-xs sm:px-3.5"
                                >
                                    <Plus className="size-4" />
                                    <span className="hidden sm:inline">Nouveau message</span>
                                </Button>
                            </>
                        }
                    />
                </div>
            )}

            <div
                className={cn(
                    "flex min-h-0 flex-1 gap-3 overflow-hidden bg-[#F8F7F3] px-3 pb-3 dark:bg-[#151c2a] sm:px-4",
                    focusMode && "fixed inset-0 z-50"
                )}
            >
                <section
                    aria-label="Liste des discussions"
                    className={cn(
                        "min-h-0 w-full shrink-0 flex-col bg-white dark:bg-[#151c2a] md:rounded-xl md:shadow-[0_1px_2px_rgba(12,59,56,0.04)]",
                        focusMode || selectedThread ? "hidden md:flex" : "flex",
                        isListCollapsed ? "md:w-14" : "md:w-[320px] xl:w-[336px]"
                    )}
                >
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className={cn("shrink-0 border-b border-[#EFEEE9] px-4 py-3 dark:border-slate-800", isListCollapsed && "md:p-2")}>
                            {!isListCollapsed ? (
                                <>
                                    <div className="mb-2.5 flex items-center justify-between">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <h2 className="text-sm font-semibold text-[#0C3B38] dark:text-white">Discussions</h2>
                                            {totalUnread > 0 && (
                                                <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-[#F4E8CF] px-1.5 py-0.5 text-[10px] font-semibold text-[#956A1D]">
                                                    {totalUnread > 99 ? "99+" : totalUnread}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsListCollapsed(true)}
                                            className="hidden size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#F8F7F3] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25 dark:hover:bg-slate-800 dark:hover:text-white md:inline-flex"
                                            aria-label="Réduire la liste"
                                            title="Réduire la liste"
                                        >
                                            <PanelLeftClose className="size-4" />
                                        </button>
                                    </div>

                                    <Input
                                        ref={searchInputRef}
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Rechercher une discussion"
                                        aria-label="Rechercher une discussion"
                                        title="Raccourci : /"
                                        icon={<Search className="size-4 text-slate-400" />}
                                        endIcon={searchQuery ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    searchInputRef.current?.focus();
                                                }}
                                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                aria-label="Effacer la recherche"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        ) : undefined}
                                        className="h-8 border-0 bg-[#F5F4F0] !text-slate-900 placeholder:!text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:!text-white"
                                    />

                                    <div className="-mx-4 mt-2.5 flex gap-1 overflow-x-auto px-4 pb-1 no-scrollbar" role="group" aria-label="Filtres des discussions">
                                        <button
                                            type="button"
                                            onClick={() => setFilters((previous) => ({ ...previous, unreadOnly: !previous.unreadOnly }))}
                                            aria-pressed={Boolean(filters.unreadOnly)}
                                            className={cn(
                                                "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-transparent px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25",
                                                filters.unreadOnly
                                                    ? "border-[#0C3B38]/25 bg-[#0C3B38]/10 text-[#0C3B38] dark:text-emerald-300"
                                                    : "bg-transparent text-slate-500 hover:bg-[#F5F4F0] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            )}
                                        >
                                            Non lus{totalUnread > 0 ? ` ${totalUnread}` : ""}
                                        </button>
                                        {FILTER_OPTIONS.map((option) => {
                                            const isActive = filters.type === option.type || (option.type === "all" && !filters.type);
                                            const unread = option.type === "all" ? 0 : stats?.unreadByType[option.type] ?? 0;
                                            const Icon = option.icon;
                                            return (
                                                <button
                                                    key={option.type}
                                                    type="button"
                                                    onClick={() => handleFilterChange(option.type)}
                                                    aria-pressed={isActive}
                                                    className={cn(
                                                        "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25",
                                                        isActive
                                                            ? "border-[#0C3B38]/25 bg-[#0C3B38]/10 text-[#0C3B38] dark:text-emerald-300"
                                                            : "bg-transparent text-slate-500 hover:bg-[#F5F4F0] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                    )}
                                                >
                                                    <Icon className="size-3.5" />
                                                    {option.label}
                                                    {unread > 0 && <span className="font-bold">{unread > 99 ? "99+" : unread}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {(filters.type || debouncedSearchQuery || filters.unreadOnly) && (
                                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                                            <span className="text-slate-500">{threads.length} résultat{threads.length !== 1 ? "s" : ""}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFilters({});
                                                    setSearchQuery("");
                                                }}
                                                className="font-semibold text-[#0C3B38] hover:underline dark:text-emerald-300"
                                            >
                                                Réinitialiser
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="hidden flex-col items-center gap-2 md:flex">
                                    <button
                                        type="button"
                                        onClick={() => setIsListCollapsed(false)}
                                        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3B38]/25 dark:hover:bg-slate-800"
                                        aria-label="Développer la liste"
                                        title="Développer la liste"
                                    >
                                        <PanelLeft className="size-5" />
                                    </button>
                                    {totalUnread > 0 && (
                                        <span className="rounded-full bg-[#0C3B38] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                            {totalUnread > 99 ? "99+" : totalUnread}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={cn("min-h-0 flex-1 overflow-y-auto", isListCollapsed && "md:hidden")}>
                            {isLoading ? (
                                <ThreadList threads={[]} selectedId={selectedThread?.id} onSelect={handleSelectThread} isLoading currentUserId={session?.user?.id} />
                            ) : threads.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#0C3B38]/8">
                                        <MessageSquare className="size-7 text-[#0C3B38] dark:text-emerald-300" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {debouncedSearchQuery || filters.type || filters.unreadOnly ? "Aucun résultat" : "Aucune discussion"}
                                    </h3>
                                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                                        {debouncedSearchQuery || filters.type || filters.unreadOnly
                                            ? "Modifiez la recherche ou réinitialisez les filtres."
                                            : "Créez une discussion pour échanger avec votre équipe."}
                                    </p>
                                    {!debouncedSearchQuery && !filters.type && !filters.unreadOnly && (
                                        <Button type="button" variant="outline" size="sm" onClick={() => setShowNewThreadModal(true)} className="mt-4">
                                            <Plus className="size-4" /> Nouveau message
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ThreadList
                                    threads={threads}
                                    selectedId={selectedThread?.id}
                                    onSelect={handleSelectThread}
                                    currentUserId={session?.user?.id}
                                />
                            )}
                        </div>
                    </div>
                </section>

                <section
                    aria-label="Conversation sélectionnée"
                    className={cn(
                        "min-h-0 min-w-0 flex-1 flex-col",
                        selectedThread ? "flex" : "hidden md:flex"
                    )}
                >
                    {isLoadingThread ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3">
                            <Loader2 className="size-7 animate-spin text-[#0C3B38] motion-reduce:animate-none dark:text-emerald-300" />
                            <p className="text-sm text-slate-500">Chargement de la discussion...</p>
                        </div>
                    ) : selectedThread ? (
                        <ThreadView
                            key={selectedThread.id}
                            thread={selectedThread}
                            onClose={handleCloseThread}
                            onStatusChange={handleStatusChange}
                            onSendMessage={handleSendMessage}
                            onReactionToggle={handleReactionToggle}
                            currentUserId={session?.user?.id || ""}
                            typingUserName={getTypingText(selectedThread.id)}
                            focusMode={focusMode}
                            onFocusModeChange={setFocusMode}
                            isRecipientOnline={isRecipientOnline}
                            onTyping={handleTyping}
                        />
                    ) : (
                        <div className="flex h-full flex-1 flex-col items-center justify-center bg-slate-50/70 px-6 text-center dark:bg-slate-900/50">
                            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-[#0C3B38]/10 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <MessageSquare className="size-8 text-[#0C3B38] dark:text-emerald-300" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Vos conversations, au même endroit</h3>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">Sélectionnez une discussion pour consulter les messages et répondre.</p>
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                <Button type="button" variant="success" size="sm" onClick={() => setShowNewThreadModal(true)}>
                                    <Plus className="size-4" /> Nouveau message
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowSearchPanel(true)}>
                                    <Search className="size-4" /> Rechercher
                                </Button>
                            </div>
                            <p className="mt-4 text-xs text-slate-400"><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono dark:border-slate-700 dark:bg-slate-800">/</kbd> pour rechercher rapidement</p>
                        </div>
                    )}
                </section>
            </div>

            {/* New thread modal */}
            <NewThreadModal
                isOpen={showNewThreadModal}
                onClose={() => setShowNewThreadModal(false)}
                onSubmit={handleCreateThread}
                userRole={session?.user?.role || ""}
            />

            {/* Search panel */}
            <SearchPanel
                isOpen={showSearchPanel}
                onClose={() => setShowSearchPanel(false)}
                onResultClick={(threadId) => {
                    fetchThreadDetails(threadId);
                    setShowSearchPanel(false);
                }}
            />
        </div>
    );
}
