import { CLOUDMEET_ORIGIN } from './meetingService';

export interface IMeetingHistory {
    creatorId?: string;
    endedAt?: string | null;
    roomName: string;
    scheduledEndTime?: string | null;
    scheduledStartTime?: string | null;
    startedAt?: string | null;
    status?: string;
    subject?: string;
}

/**
 * Display API reservation times explicitly as planned, never as actual attendance.
 *
 * @param {Object} record - Meeting metadata.
 * @returns {Array<string>} Labeled history details.
 */
export function historyLines(record: IMeetingHistory): string[] {
    const statuses: Record<string, string> = { RUNNING: '进行中', ENDED: '已结束', SCHEDULED: '未开始', CANCELLED: '已取消' };
    const start = record.scheduledStartTime ? Date.parse(record.scheduledStartTime) : NaN;
    const end = record.scheduledEndTime ? Date.parse(record.scheduledEndTime) : NaN;
    const elapsed = end - start;
    const validDuration = Number.isFinite(start) && Number.isFinite(elapsed) && elapsed >= 0;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const duration = minutes ? `${minutes}分钟${seconds % 60 ? `${seconds % 60}秒` : ''}` : `${seconds}秒`;

    return [
        `会议号：${record.roomName}`,
        `会议状态：${statuses[record.status || ''] || '状态未知'}`,
        `计划时间：${Number.isFinite(start) ? new Date(start).toLocaleString() : '暂无数据'}`,
        `计划时长：${validDuration ? duration : '暂无数据'}`
    ];
}

/**
 * Fetch only this installation's created meetings; never issue an unscoped listing.
 *
 * @param {string} creatorId - Persisted installation identity, not authorization.
 * @param {Function} request - Fetch transport.
 * @returns {Promise<Array>} Deduplicated server history records.
 */
export async function fetchMeetingHistory(creatorId: string, request = fetch): Promise<IMeetingHistory[]> {
    if (!creatorId.trim()) {
        throw new Error('缺少本机会议身份');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await request(`${CLOUDMEET_ORIGIN}/mapi/open/desktop/meetings/history?creatorId=${encodeURIComponent(creatorId)}`, {
            signal: controller.signal
        });
        const result = await response.json();

        if (!result || !response.ok || (typeof result.code === 'number' && result.code !== 200)) {
            throw new Error(result?.message || result?.msg || '读取历史会议失败');
        }
        const records = result.data ?? result;

        if (!Array.isArray(records) || records.some(record => !record || typeof record.roomName !== 'string'
                || !/^\d{9}$/.test(record.roomName))) {
            throw new Error('历史会议数据格式异常');
        }

        const meetings: IMeetingHistory[] = records.filter(record => record.creatorId === creatorId).map(record => ({
            roomName: record.roomName,
            subject: typeof record.subject === 'string' ? record.subject : undefined,
            status: typeof record.status === 'string' ? record.status : undefined,
            startedAt: typeof record.startedAt === 'string' ? record.startedAt : null,
            endedAt: typeof record.endedAt === 'string' ? record.endedAt : null,
            scheduledStartTime: typeof record.scheduledStartTime === 'string' ? record.scheduledStartTime : null,
            scheduledEndTime: typeof record.scheduledEndTime === 'string' ? record.scheduledEndTime : null,
            creatorId
        }));

        return Array.from(new Map(meetings.map(record => [ record.roomName, record ])).values())
            .sort((a, b) => (Date.parse(b.scheduledStartTime || '') || 0) - (Date.parse(a.scheduledStartTime || '') || 0));
    } finally {
        clearTimeout(timeout);
    }
}
