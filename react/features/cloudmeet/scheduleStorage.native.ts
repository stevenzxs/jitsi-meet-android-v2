import 'react-native-get-random-values';
import { NativeModules } from 'react-native';

import { CLOUDMEET_ORIGIN, IMeetingDraft, newMeetingDraft, postMeetingApi } from './meetingService';
import { IScheduledMeeting, saveSchedule } from './scheduleService';
import { IHostReceipt } from './hostTransfer';

interface IPlanner {
    creatorId: string; meetings: IScheduledMeeting[];
    quickMeetings?: IMeetingDraft[];
    hostReceipts?: Record<string, IHostReceipt & { active: boolean; }>;
}

/**
 * Store quick-meeting management credentials in the existing Keystore vault.
 *
 * @param {Object} draft - Private credentials, never placed in Redux or logs.
 * @returns {Promise<void>} Durable write before creating the server meeting.
 */
export function persistQuickMeeting(draft: IMeetingDraft): Promise<void> {
    return serialized(async () => {
        const planner = await readPlanner();
        const records = planner.quickMeetings || [];

        planner.quickMeetings = [ ...records.filter(item => item.roomName !== draft.roomName), { ...draft } ];
        await NativeModules.MeetingPlanner.write(JSON.stringify(planner));
    });
}

/**
 * Resolve a locally held management key without trusting listing responses.
 *
 * @param {string} room - Exact official meeting ID.
 * @returns {Promise<string|undefined>} Host credential if present.
 */
export async function readMeetingHostKey(room: string): Promise<string | undefined> {
    const planner = await readPlanner();
    const receipt = planner.hostReceipts?.[`${CLOUDMEET_ORIGIN}/${room}`];

    if (receipt) return receipt.active ? receipt.hostKey : undefined;

    return (planner.quickMeetings || []).find(item => item.roomName === room)?.hostKey
        || planner.meetings.find(item => item.roomName === room)?.hostKey;
}

/** Persist and read back encrypted credentials before sending a receipt ack. */
export function persistHostReceipt(room: string, receipt: IHostReceipt): Promise<void> {
    const scope = `${CLOUDMEET_ORIGIN}/${room}`;

    return serialized(async () => {
        const planner = await readPlanner();
        const prior = planner.hostReceipts?.[scope];

        if (prior?.operationId === receipt.operationId && prior.hostKey === receipt.hostKey && prior.active) return;

        if (prior && prior.operationId !== receipt.operationId && !prior.active && prior.expiresAt > Date.now()) {
            throw new Error('Existing host receipt requires recovery');
        }
        planner.hostReceipts = { ...planner.hostReceipts, [scope]: { ...receipt, active: false } };
        await NativeModules.MeetingPlanner.write(JSON.stringify(planner));
        const saved = (await readPlanner()).hostReceipts?.[scope];

        if (saved?.hostKey !== receipt.hostKey || saved?.operationId !== receipt.operationId || saved.active) {
            throw new Error('Host receipt storage unconfirmed');
        }
    });
}

/** API token issuance is the durable completion fence, not a local role event. */
export async function completeHostReceipt(room: string, receipt: IHostReceipt): Promise<void> {
    const scope = `${CLOUDMEET_ORIGIN}/${room}`;
    const result = await postMeetingApi(`/open/desktop/meetings/${room}/host-token`, {
        hostKey: receipt.hostKey, displayName: '主持人'
    });

    if (typeof result?.token !== 'string' || !result.token) throw new Error('Host authority unconfirmed');
    await serialized(async () => {
        const planner = await readPlanner();
        const saved = planner.hostReceipts?.[scope];

        if (saved?.operationId !== receipt.operationId || saved.hostKey !== receipt.hostKey) {
            throw new Error('Host receipt superseded');
        }
        saved.active = true;
        await NativeModules.MeetingPlanner.write(JSON.stringify(planner));
    });
}

/** Exact-operation revocation cannot erase a replacement receipt. */
export function revokeHostReceipt(room: string, operation: string): Promise<void> {
    const scope = `${CLOUDMEET_ORIGIN}/${room}`;

    return serialized(async () => {
        const planner = await readPlanner();
        const saved = planner.hostReceipts?.[scope];

        if (saved?.operationId !== operation) return;
        // Keep a tombstone/fence so stale original meeting keys cannot reappear.
        saved.active = false;
        saved.hostKey = '';
        await NativeModules.MeetingPlanner.write(JSON.stringify(planner));
    });
}

export async function readPendingHostReceipt(room: string): Promise<IHostReceipt | undefined> {
    const saved = (await readPlanner()).hostReceipts?.[`${CLOUDMEET_ORIGIN}/${room}`];

    return saved && !saved.active && saved.hostKey ? saved : undefined;
}
let queue: Promise<unknown> = Promise.resolve();

/**
 * Serialize Keystore storage operations so saves cannot overwrite each other.
 *
 * @param {Function} operation - Mutation.
 * @returns {Promise} Operation result.
 */
function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = queue.then(operation, operation);

    queue = next.catch(() => undefined);

    return next;
}

/**
 * Use the platform cryptographic RNG for all credentials.
 *
 * @param {Uint8Array} bytes - Buffer.
 * @returns {Uint8Array} Secure bytes.
 */
export function randomBytes(bytes: Uint8Array): Uint8Array {
    return (globalThis as any).crypto.getRandomValues(bytes);
}

/**
 * Read encrypted private records; fail closed on corruption or missing native bridge.
 *
 * @returns {Promise} Planner state.
 */
export async function readPlanner(): Promise<IPlanner> {
    const value = await NativeModules.MeetingPlanner.read();

    if (value) {
        const parsed = JSON.parse(value);

        if (typeof parsed.creatorId !== 'string' || !parsed.creatorId || !Array.isArray(parsed.meetings)) {
            throw new Error('本机预定记录损坏，请勿重复创建');
        }

        return parsed;
    }

    return { creatorId: `android-${newMeetingDraft(randomBytes).creatorRecoveryKey}`, meetings: [] };
}

/**
 * Persist an installation identity before any server listing or quick creation.
 *
 * @returns {Promise<string>} Stable creator identity.
 */
export function getPlannerIdentity(): Promise<string> {
    return serialized(async () => {
        const planner = await readPlanner();

        await NativeModules.MeetingPlanner.write(JSON.stringify(planner));

        return planner.creatorId;
    });
}

/**
 * Persist before sending credentials to the server. Retry reconciles a lost response.
 *
 * @param {Object} meeting - Stable draft and frozen input.
 * @returns {Promise} Saved schedule.
 */
export function persistSchedule(meeting: IScheduledMeeting): Promise<void> {
    return serialized(async () => {
        const planner = await readPlanner();
        const existing = planner.meetings.find(item => item.roomName === meeting.roomName);
        const record = existing || meeting;

        if (existing?.saved) {
            return;
        }
        if (existing) {
            try {
                const result = await postMeetingApi(`/open/desktop/meetings/${record.roomName}/host-token`, {
                    hostKey: record.hostKey, displayName: record.displayName
                });

                if (typeof result?.token !== 'string' || !result.token) {
                    throw new Error('无法确认预定结果，请重试');
                }
                record.saved = true;
            } catch (error) {
                const code = (error as { code?: number; }).code;

                // These errors occur only after host-key validation on the server.
                if (code === 40901 || code === 40902) {
                    record.saved = true;
                } else if (code !== 40401) {
                    throw error;
                }
            }
        } else {
            planner.meetings.push(record);
            await NativeModules.MeetingPlanner.write(JSON.stringify(planner));
        }
        if (!record.saved) {
            await saveSchedule(record, record, planner.creatorId);
            record.saved = true;
        }
        await NativeModules.MeetingPlanner.write(JSON.stringify(planner));
    });
}
