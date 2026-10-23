export const CLOUDMEET_ORIGIN = 'https://118.193.36.35:8443';

export interface IMeetingDraft {
    creatorRecoveryKey: string;
    hostKey: string;
    roomName: string;
}

type Post = (path: string, body: object) => Promise<any>;
const attemptedDrafts = new WeakSet<IMeetingDraft>();

/**
 * Generate credentials using native cryptographic randomness.
 *
 * @param {Function} fill - Secure random byte provider.
 * @returns {Object} Ephemeral credentials.
 */
export function newMeetingDraft(fill: (bytes: Uint8Array) => Uint8Array): IMeetingDraft {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = fill(new Uint8Array(57));
    const key = Array.from(bytes.slice(9, 25), value => alphabet[value % 32]).join('');

    return {
        roomName: Array.from(bytes.slice(0, 9), value => String(value % 10)).join(''),
        hostKey: key.match(/.{4}/g)!.join('-'),
        creatorRecoveryKey: Array.from({ length: 43 }, (_, index) => {
            const offset = index * 6;
            const byte = Math.floor(offset / 8);
            const bits = ((bytes[25 + byte] << 8) | (bytes[26 + byte] || 0)) >> (10 - offset % 8);

            return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'[bits & 63];
        }).join('')
    };
}

/**
 * Official API only; errors must not silently become anonymous joins.
 *
 * @param {string} path - API path.
 * @param {Object} body - Request body.
 * @param {Function} request - Fetch implementation.
 * @returns {Promise} Validated response data.
 */
export async function postMeetingApi(path: string, body: object, request = fetch): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await request(`${CLOUDMEET_ORIGIN}/mapi${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        const result = await response.json();

        if (!response.ok || (typeof result.code === 'number' && result.code !== 200)) {
            throw new Error(result.message || result.msg || '会议请求失败');
        }

        return result.data ?? result;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('连接会议服务器超时，请检查网络后重试');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Register the meeting and obtain a scoped host token before navigation.
 *
 * @param {Object} draft - Credentials.
 * @param {Object} details - User input.
 * @param {Function} post - API transport.
 * @returns {Promise<string>} Native meeting URL.
 */
export async function createMeeting(
        draft: IMeetingDraft,
        details: { displayName: string; subject?: string; },
        post: Post = postMeetingApi): Promise<string> {
    if (!details.displayName.trim()) {
        throw new Error('请输入昵称');
    }
    if (!attemptedDrafts.has(draft)) {
        // A lost create response may still have committed. Never blindly repeat it.
        attemptedDrafts.add(draft);
        await post('/open/desktop/meetings', {
            ...draft,
            subject: details.subject?.trim() || '我的会议',
            displayName: details.displayName.trim(),
            password: '',
            creatorId: '',
            durationMinutes: 1440
        });
    }
    const result = await post(`/open/desktop/meetings/${draft.roomName}/host-token`, {
        hostKey: draft.hostKey,
        displayName: details.displayName.trim()
    });

    if (typeof result.token !== 'string' || !result.token) {
        throw new Error('主持人身份验证失败，请重试');
    }

    return `${CLOUDMEET_ORIGIN}/${draft.roomName}?jwt=${encodeURIComponent(result.token)}`;
}

/**
 * Validate existing IDs without creating a room.
 *
 * @param {string} room - Meeting ID.
 * @param {string} password - Business password.
 * @param {Function} post - API transport.
 * @returns {Promise<string>} Native meeting URL.
 */
export async function joinMeeting(room: string, password: string, post: Post = postMeetingApi): Promise<string> {
    const id = room.trim().replace(/[\s-]/g, '');

    if (!/^\d{9}$/.test(id)) {
        throw new Error('请输入九位会议号');
    }
    await post(`/open/desktop/meetings/${id}/join-check`, { password });

    return `${CLOUDMEET_ORIGIN}/${id}`;
}
