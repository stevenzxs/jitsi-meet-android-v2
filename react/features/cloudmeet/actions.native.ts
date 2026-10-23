import { appNavigate } from '../app/actions.native';
import { IStore } from '../app/types';
import { updateSettings } from '../base/settings/actions';

/**
 * Enter the native room using the existing token-aware navigation.
 *
 * @param {string} url - Token-bearing URL (never log it).
 * @param {string} displayName - User-selected name.
 * @returns {Function} Redux thunk.
 */
export function enterCreatedMeeting(url: string, displayName: string) {
    return async (dispatch: IStore['dispatch']) => {
        dispatch(updateSettings({ displayName }));
        // This per-navigation override must not disable prejoin for ordinary joins.
        await dispatch(appNavigate(`${url}#config.prejoinConfig.enabled=false`));
    };
}
