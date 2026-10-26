import { CLOUDMEET_ORIGIN } from './meetingService';

/**
 * Share public meeting context only; an absent local password is not passwordless.
 *
 * @param {Object} meeting - Public metadata and optional locally stored password.
 * @returns {string} Clipboard invitation, never a host-token URL.
 */
export function scheduleInvite(meeting: { password?: string; roomName: string; subject: string; }): string {
    const subject = meeting.subject.trim() || '我的会议';
    const link = `${CLOUDMEET_ORIGIN}/cm/invite?room=${encodeURIComponent(meeting.roomName)}&subject=${encodeURIComponent(subject)}`;
    const hint = meeting.password === undefined
        ? '打开链接，按提示输入会议密码。'
        : meeting.password ? '打开链接输入密码，即可直接进入会议。' : '打开链接即可直接进入会议。';

    return [ '【邀请您参加会议】', `主题：${subject}`, `会议号：${meeting.roomName}`,
        meeting.password ? `密码：${meeting.password}` : '', `会议链接：${link}`, hint ].filter(Boolean).join('\n');
}

/**
 * Cancel using private authorization; a successful void response is valid.
 *
 * @param {Object} meeting - Exact official room and local host key.
 * @param {Function} request - HTTPS transport.
 * @returns {Promise<void>} Server-confirmed cancellation or explicit failure.
 */
export async function cancelSchedule(meeting: { hostKey?: string; roomName: string; }, request = fetch): Promise<void> {
    if (!/^\d{9}$/.test(meeting.roomName)) {
        throw new Error('无法识别会议号');
    }
    if (!meeting.hostKey) {
        throw new Error('本机未保存主持人密钥，无法取消会议');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await request(`${CLOUDMEET_ORIGIN}/mapi/open/desktop/meetings/${meeting.roomName}`, {
            method: 'DELETE', headers: { 'X-Host-Key': meeting.hostKey }, signal: controller.signal
        });
        const text = await response.text();
        const result = text.trim() ? JSON.parse(text) : undefined;

        if (!response.ok || (typeof result?.code === 'number' && result.code !== 200)) {
            throw new Error(result?.message || result?.msg || '取消会议失败，请重试');
        }
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('取消会议超时，请刷新列表核对结果后重试');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Prevent an older in-flight list response from restoring a cancelled card.
 *
 * @param {Array} rows - Potentially stale response or state.
 * @param {Set} cancelled - Server-confirmed cancellations for this screen.
 * @returns {Array} Visible rows without changing stored credentials.
 */
export function withoutCancelled<T extends { roomName: string; }>(rows: T[], cancelled: Set<string>): T[] {
    return rows.filter(row => !cancelled.has(row.roomName));
}
