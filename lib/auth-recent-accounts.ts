/**
 * auth-recent-accounts.ts
 *
 * Manages "Comptes récents" (recent accounts) persisted in localStorage.
 *
 * SECURITY MODEL
 * ──────────────
 * We store ONLY non-secret profile data (email, display name, avatar, last
 * login time). We deliberately DO NOT store passwords, tokens, or any secret.
 *
 * "Easy access" for returning users is achieved the secure, standard way:
 * selecting a saved account pre-fills their identity and focuses the password
 * field with autoComplete="current-password", so the browser / OS credential
 * manager can autofill it. The application itself never holds the secret, so a
 * compromised page (XSS) cannot harvest anyone's password from storage.
 */

const LS_KEY = "elan_recent_accounts";
const MAX_ACCOUNTS = 5;

export interface RecentAccount {
    /** User's email address (primary key) */
    email: string;
    /** User's display name */
    name: string;
    /** Optional avatar URL (profile picture) */
    avatarUrl?: string;
    /** Epoch ms of last successful login */
    lastLoginAt: number;
}

/**
 * Shape as it may exist in storage. Older builds persisted an obfuscated
 * password under `_pw`; we tolerate reading it but strip it on the way out so
 * the secret is purged from storage the first time a returning user loads the
 * page.
 */
type StoredAccount = RecentAccount & { _pw?: string };

function isClient(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readFromStorage(): StoredAccount[] {
    if (!isClient()) return [];
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as StoredAccount[];
    } catch {
        return [];
    }
}

/** Persist accounts, guaranteeing no secret field is ever written back. */
function writeToStorage(accounts: RecentAccount[]): void {
    if (!isClient()) return;
    try {
        const clean = accounts.map(({ email, name, avatarUrl, lastLoginAt }) => ({
            email,
            name,
            avatarUrl,
            lastLoginAt,
        }));
        localStorage.setItem(LS_KEY, JSON.stringify(clean));
    } catch {
        // localStorage unavailable (private mode, quota exceeded, etc.)
    }
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Persists a successfully authenticated account's PROFILE to localStorage.
 * No password or token is ever stored. Existing entry for the same email is
 * updated (moved to the front); entries beyond MAX_ACCOUNTS are pruned.
 */
export function saveRecentAccount(params: {
    email: string;
    name: string;
    avatarUrl?: string;
}): void {
    const email = params.email.trim().toLowerCase();
    if (!email) return;

    const existing = readFromStorage().filter((a) => a.email.toLowerCase() !== email);
    const updated: RecentAccount = {
        email: params.email.trim(),
        name: params.name.trim() || params.email.trim(),
        avatarUrl: params.avatarUrl,
        lastLoginAt: Date.now(),
    };
    const next = [updated, ...existing].slice(0, MAX_ACCOUNTS);
    writeToStorage(next);
}

/**
 * Returns stored recent accounts sorted by lastLoginAt (newest first).
 * Any legacy secret field is dropped here and never surfaced to callers.
 */
export function getRecentAccounts(): RecentAccount[] {
    return readFromStorage()
        .sort((a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0))
        .map(({ email, name, avatarUrl, lastLoginAt }) => ({
            email,
            name,
            avatarUrl,
            lastLoginAt,
        }));
}

/** Removes an account from localStorage by email. */
export function removeRecentAccount(email: string): void {
    const target = email.trim().toLowerCase();
    const filtered = readFromStorage().filter((a) => a.email.toLowerCase() !== target);
    writeToStorage(filtered);
}

/** Clears ALL stored recent accounts. */
export function clearRecentAccounts(): void {
    if (!isClient()) return;
    localStorage.removeItem(LS_KEY);
}
