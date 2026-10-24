import { CLOUDMEET_ORIGIN } from './meetingService';

const pending = new Map<string, Promise<void>>();

/**
 * Synchronize explicit whole-meeting end before terminating media, never on leave.
 *
 * @param {string} url - Active conference URL, never logged.
 * @param {Function} readKey - Encrypted local credential lookup.
 * @param {Function} post - Official business transport.
 * @param {Function} endMedia - Existing Jitsi end operation.
 * @returns {Promise<void>} Completion or retryable failure.
 */
export async function endManagedMeeting(
        url: string | undefined,
        readKey: (room: string) => Promise<string | undefined>,
        post: (path: string, body: object) => Promise<unknown>,
        endMedia: () => unknown): Promise<void> {
    const parsed = url ? new URL(url) : undefined;

    if (!parsed || parsed.origin !== CLOUDMEET_ORIGIN) {
        await endMedia();

        return;
    }
    const room = parsed.pathname.slice(1);

    if (!/^\d{9}$/.test(room)) {
        throw new Error('无法识别会议号，请重试');
    }
    const existing = pending.get(room);

    if (existing) {
        return existing;
    }
    const operation = (async () => {
        const hostKey = await readKey(room);

        if (!hostKey) {
            throw new Error('本机未保存主持人密钥，无法同步结束会议；可选择离开会议');
        }
        await post(`/open/desktop/meetings/${room}/end`, { hostKey });
        await endMedia();
    })();

    pending.set(room, operation);
    try {
        await operation;
    } finally {
        pending.delete(room);
    }
}
