import { CLOUDMEET_ORIGIN } from './meetingService';

let pending: { expires: number; password: string; target: string; } | undefined;

function targetFor(url?: string): string | undefined {
    try {
        const parsed = new URL(url || '');

        if (parsed.origin === CLOUDMEET_ORIGIN && /^\/\d{9}$/.test(parsed.pathname)) {
            return `${parsed.origin}${parsed.pathname}`;
        }
    } catch {
        // Invalid or unrelated navigation must never receive the credential.
    }
}

/**
 * Stage a validated password for one native join, without URL or Redux storage.
 *
 * @param {string} url - Validated meeting URL.
 * @param {string} password - User-entered password.
 * @param {number} now - Current time.
 * @returns {Function} Attempt-scoped cancellation callback.
 */
export function stageJoinPassword(url: string, password: string, now = Date.now()): () => void {
    const target = targetFor(url);
    const attempt = target ? { target, password, expires: now + 300000 } : undefined;

    pending = attempt;

    return () => {
        if (pending === attempt) {
            pending = undefined;
        }
    };
}

/**
 * Consume once; mismatched, expired or cancelled joins cannot reuse the password.
 *
 * @param {string} url - Actual conference URL.
 * @param {number} now - Current time.
 * @returns {string|undefined} Password for this join only.
 */
export function consumeJoinPassword(url?: string, now = Date.now()): string | undefined {
    const attempt = pending;

    pending = undefined;

    if (attempt && attempt.expires > now && attempt.target === targetFor(url)) {
        return attempt.password;
    }
}
