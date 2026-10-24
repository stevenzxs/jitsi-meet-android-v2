import 'react-native-get-random-values';
import { NativeModules } from 'react-native';

import { newMeetingDraft } from './meetingService';
import { IScheduledMeeting, fetchSchedules, saveSchedule } from './scheduleService';

interface IPlanner {
    creatorId: string; meetings: IScheduledMeeting[];
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
            const records = await fetchSchedules(planner.creatorId);

            if (records.some(item => item.roomName === record.roomName)) {
                record.saved = true;
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
