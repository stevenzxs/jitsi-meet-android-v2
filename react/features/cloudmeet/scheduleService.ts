import { CLOUDMEET_ORIGIN, IMeetingDraft, postMeetingApi } from './meetingService';

export const DURATIONS = [ 15, 30, 45, 60, 120, 180, 240, 300 ];
export interface IScheduleDetails {
    displayName: string;
    durationMinutes: number;
    password: string;
    start: number;
    subject: string;
}
export interface IScheduledMeeting extends IMeetingDraft, IScheduleDetails {
    saved: boolean;
}
type Post = (path: string, body: object) => Promise<any>;

/**
 * Persist an explicit future schedule; never turn API failures into local success.
 *
 * @param {Object} draft - Scoped credentials.
 * @param {Object} details - User input.
 * @param {string} creatorId - Local listing identity, not authorization.
 * @param {Function} post - Transport.
 * @returns {Promise} Server response.
 */
export async function saveSchedule(draft: IMeetingDraft, details: IScheduleDetails, creatorId: string, post: Post = postMeetingApi) {
    if (!details.displayName.trim()) {
        throw new Error('请输入昵称');
    }
    if (!Number.isFinite(details.start) || details.start <= Date.now()) {
        throw new Error('预定开始时间必须晚于当前时间');
    }
    if (!DURATIONS.includes(details.durationMinutes)) {
        throw new Error('请选择有效会议时长');
    }

    return post('/open/desktop/meetings/schedule', {
        roomName: draft.roomName, hostKey: draft.hostKey, creatorRecoveryKey: draft.creatorRecoveryKey,
        creatorId, subject: details.subject.trim() || '我的会议',
        displayName: details.displayName.trim(), password: details.password,
        scheduledStartTime: new Date(details.start).toISOString(), durationMinutes: details.durationMinutes
    });
}

/**
 * Acquire host authorization for an already saved schedule.
 *
 * @param {Object} draft - Credentials.
 * @param {string} displayName - Nickname.
 * @param {Function} post - Transport.
 * @returns {Promise<string>} Scoped JWT URL.
 */
export async function scheduledHostUrl(draft: IMeetingDraft, displayName: string, post: Post = postMeetingApi) {
    const result = await post(`/open/desktop/meetings/${draft.roomName}/host-token`, { hostKey: draft.hostKey, displayName });

    if (!result.token || typeof result.token !== 'string') {
        throw new Error('主持人身份验证失败，请重试');
    }

    return `${CLOUDMEET_ORIGIN}/${draft.roomName}?jwt=${encodeURIComponent(result.token)}`;
}

/**
 * Load only this installation's schedules with a bounded HTTPS request.
 *
 * @param {string} creatorId - Installation identity.
 * @returns {Promise<Array>} Server records (no credentials trusted from response).
 */
export async function fetchSchedules(creatorId: string): Promise<any[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${CLOUDMEET_ORIGIN}/mapi/open/desktop/meetings?creatorId=${encodeURIComponent(creatorId)}`, {
            signal: controller.signal
        });
        const result = await response.json();

        if (!response.ok || (typeof result.code === 'number' && result.code !== 200)) {
            throw new Error(result.message || '读取预定会议失败');
        }
        const records = result.data ?? result;

        if (!Array.isArray(records)) {
            throw new Error('预定会议数据格式异常');
        }

        return records;
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('读取预定会议超时，请检查网络');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
