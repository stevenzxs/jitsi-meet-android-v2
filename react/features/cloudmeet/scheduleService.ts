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

export interface IScheduleRow extends Omit<IScheduleDetails, 'password'> {
    end: number;
    hostKey?: string;
    password?: string;
    roomName: string;
}

/**
 * Map authoritative public metadata, supplementing private credentials only locally.
 *
 * @param {Array} records - Scoped server response.
 * @param {Array} local - Encrypted local drafts.
 * @param {string} creatorId - Persisted installation identity.
 * @param {number} now - Expiry boundary.
 * @returns {Array} Deduplicated, ordered active reservations.
 */
export function scheduleRows(records: any[], local: IScheduledMeeting[], creatorId: string, now = Date.now()): IScheduleRow[] {
    const rows = new Map<string, IScheduleRow>();

    for (const record of records) {
        if (!record || typeof record.roomName !== 'string' || !/^\d{9}$/.test(record.roomName)) {
            throw new Error('预定会议数据格式异常');
        }
        if (record.creatorId !== creatorId || record.status !== 'SCHEDULED') {
            continue;
        }
        const start = Date.parse(record.scheduledStartTime);
        const end = Date.parse(record.scheduledEndTime);

        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
            throw new Error('预定会议时间格式异常');
        }
        if (end <= now) {
            continue;
        }
        const credentials = local.find(item => item.roomName === record.roomName);

        rows.set(record.roomName, {
            roomName: record.roomName,
            subject: typeof record.subject === 'string' ? record.subject : '',
            displayName: typeof record.displayName === 'string' ? record.displayName : '',
            start, end, durationMinutes: (end - start) / 60000,
            hostKey: credentials?.hostKey,
            password: credentials?.password
        });
    }

    return Array.from(rows.values()).sort((a, b) => a.start - b.start);
}

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
export async function scheduledHostUrl(draft: { hostKey?: string; roomName: string; }, displayName: string, post: Post = postMeetingApi) {
    if (!draft.hostKey) {
        throw new Error('本机未保存主持人密钥，无法以主持人身份加入');
    }
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
    if (!creatorId.trim()) {
        throw new Error('缺少本机会议身份');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${CLOUDMEET_ORIGIN}/mapi/open/desktop/meetings?creatorId=${encodeURIComponent(creatorId)}`, {
            signal: controller.signal
        });
        const result = await response.json();

        if (!result || !response.ok || (typeof result.code === 'number' && result.code !== 200)) {
            throw new Error(result?.message || result?.msg || '读取预定会议失败');
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
