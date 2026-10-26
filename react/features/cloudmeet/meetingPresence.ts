import { CLOUDMEET_ORIGIN } from './meetingService';

/**
 * Report only real native joins, repeating to cover entry before scheduled start.
 *
 * @param {string} url - Current official conference URL, never logged.
 * @param {string} participantId - Ephemeral Jitsi participant ID.
 * @param {Function} post - Business transport.
 * @param {Function} onFailure - Sanitized failure notification.
 * @param {Function} schedule - Repeating timer returning cancellation.
 * @returns {Function} Stop reporting on leave or conference replacement.
 */
export function startMeetingPresence(
        url: string | undefined,
        participantId: string | undefined,
        post: (path: string, body: object) => Promise<unknown>,
        onFailure: () => void,
        schedule = (tick: () => Promise<void>) => {
            const timer = setInterval(() => void tick(), 30000);

            return () => clearInterval(timer);
        }): () => void {
    let parsed: URL;

    try {
        parsed = new URL(url || '');
    } catch (_) {
        return () => undefined;
    }
    const room = parsed.pathname.slice(1);

    if (parsed.origin !== CLOUDMEET_ORIGIN || !/^\d{9}$/.test(room) || !participantId) {
        return () => undefined;
    }
    let active = true;
    let loading = false;
    const tick = async () => {
        if (!active || loading) {
            return;
        }
        loading = true;
        try {
            await post(`/open/desktop/meetings/${room}/participants/join`, { participantId });
        } catch (_) {
            active && onFailure();
        } finally {
            loading = false;
        }
    };
    const cancel = schedule(tick);

    void tick();

    return () => {
        active = false;
        cancel();
    };
}
