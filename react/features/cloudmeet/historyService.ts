import { CLOUDMEET_ORIGIN } from './meetingService';

export interface IMeetingHistory {
    creatorId?: string;
    endedAt?: string | null;
    roomName: string;
    startedAt?: string | null;
    status?: string;
    subject?: string;
}

/**
 * Format server-owned meeting facts without substituting reservation or attendance times.
 *
 * @param {Object} record - Meeting metadata.
 * @param {number} now - Current time for running meetings.
 * @returns {Array<string>} Labeled history details.
 */
export function historyLines(record: IMeetingHistory, now = Date.now()): string[] {
    const statuses: Record<string, string> = { RUNNING: '进行中', ENDED: '已结束', SCHEDULED: '未开始', CANCELLED: '已取消' };
    const start = record.startedAt ? Date.parse(record.startedAt) : NaN;
    const end = record.endedAt ? Date.parse(record.endedAt) : NaN;
    const elapsed = record.status === 'RUNNING' ? now - start : end - start;
    const validDuration = Number.isFinite(start) && Number.isFinite(elapsed) && elapsed >= 0
        && (record.status === 'RUNNING' || record.status === 'ENDED');
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const duration = minutes ? `${minutes}分钟${seconds % 60 ? `${seconds % 60}秒` : ''}` : `${seconds}秒`;

    return [
        `会议号：${record.roomName}`,
        `会议状态：${statuses[record.status || ''] || '状态未知'}`,
        `会议时间：${Number.isFinite(start) ? new Date(start).toLocaleString() : '暂无数据'}`,
        `会议时长：${validDuration ? `${record.status === 'RUNNING' ? '已进行' : ''}${duration}` : '暂无数据'}`
    ];
}

/**
 * Fetch only this installation's created meetings; never issue an unscoped listing.
 *
 * @param {string} creatorId - Persisted installation identity, not authorization.
 * @param {Function} request - Fetch transport.
 * @returns {Promise<Array>} Deduplicated visible and historical server records.
 */
export async function fetchMeetingHistory(creatorId: string, request = fetch): Promise<IMeetingHistory[]> {
    if (!creatorId.trim()) {
        throw new Error('缺少本机会议身份');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const groups = await Promise.all([ '/history', '' ].map(async suffix => {
            const response = await request(`${CLOUDMEET_ORIGIN}/mapi/open/desktop/meetings${suffix}?creatorId=${encodeURIComponent(creatorId)}`, {
                signal: controller.signal
            });
            const result = await response.json();

            if (!response.ok || (typeof result.code === 'number' && result.code !== 200)) {
                throw new Error(result.message || result.msg || '读取历史会议失败');
            }
            const records = result.data ?? result;

            if (!Array.isArray(records) || records.some(record => !record || typeof record.roomName !== 'string'
                || !/^\d{9}$/.test(record.roomName))) {
                throw new Error('历史会议数据格式异常');
            }

            return records.filter(record => record.creatorId === creatorId && record.status !== 'SCHEDULED').map(record => ({
                roomName: record.roomName,
                subject: typeof record.subject === 'string' ? record.subject : undefined,
                status: typeof record.status === 'string' ? record.status : undefined,
                startedAt: typeof record.startedAt === 'string' ? record.startedAt : null,
                endedAt: typeof record.endedAt === 'string' ? record.endedAt : null,
                creatorId
            }));
        }));

        return Array.from(new Map(groups.flat().map(record => [ record.roomName, record ])).values());
    } finally {
        clearTimeout(timeout);
    }
}
