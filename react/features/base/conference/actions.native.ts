import { IStore } from '../../app/types';
import { endManagedMeeting } from '../../cloudmeet/endMeetingService';
import { postMeetingApi } from '../../cloudmeet/meetingService';
import { readMeetingHostKey } from '../../cloudmeet/scheduleStorage.native';
import { getCurrentConferenceUrl } from '../connection/functions';
import { setAudioMuted, setVideoMuted } from '../media/actions';
import { MEDIA_TYPE, MediaType, VIDEO_MUTISM_AUTHORITY } from '../media/constants';

export * from './actions.any';

/**
 * Explicit native end synchronizes the official business record before media.
 *
 * @returns {Function} Awaitable action; callers surface failures for retry.
 */
export function endConference() {
    return async (_dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState();
        const { conference } = state['features/base/conference'];

        if (conference) {
            await endManagedMeeting(getCurrentConferenceUrl(state), readMeetingHostKey, postMeetingApi,
                () => conference.end());
        }
    };
}

/**
 * Starts audio and/or video for the visitor.
 *
 * @param {Array<MediaType>} mediaTypes - The media types that need to be started.
 * @returns {Function}
 */
export function setupVisitorStartupMedia(mediaTypes: Array<MediaType>) {
    return (dispatch: IStore['dispatch']) => {
        if (!mediaTypes || !Array.isArray(mediaTypes)) {
            return;
        }

        mediaTypes.forEach(mediaType => {
            switch (mediaType) {
            case MEDIA_TYPE.AUDIO:
                dispatch(setAudioMuted(false, true));
                break;
            case MEDIA_TYPE.VIDEO:
                dispatch(setVideoMuted(false, VIDEO_MUTISM_AUTHORITY.USER, true));
            }
        });
    };
}
