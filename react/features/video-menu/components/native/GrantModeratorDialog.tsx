import React from 'react';
import { connect } from 'react-redux';
import { Alert } from 'react-native';

import { requestNativeHostTransfer } from '../../../cloudmeet/hostTransfer';
import { CLOUDMEET_ORIGIN } from '../../../cloudmeet/meetingService';
import { discardActiveMeetingHostKey } from '../../../cloudmeet/scheduleStorage.native';
import { getCurrentConferenceUrl } from '../../../base/connection/functions';

import ConfirmDialog from '../../../base/dialog/components/native/ConfirmDialog';
import { translate } from '../../../base/i18n/functions';
import AbstractGrantModeratorDialog, { abstractMapStateToProps }
    from '../AbstractGrantModeratorDialog';

/**
 * Dialog to confirm a remote participant kick action.
 */
class GrantModeratorDialog extends AbstractGrantModeratorDialog {
    override _onSubmit() {
        this.props.dispatch((dispatch, getState) => {
            const url = getCurrentConferenceUrl(getState());

            if (url?.startsWith(`${CLOUDMEET_ORIGIN}/`)) {
                const conference = getState()['features/base/conference'].conference;
                const room = url.slice(CLOUDMEET_ORIGIN.length + 1).split(/[?#]/)[0];

                void requestNativeHostTransfer(conference, this.props.participantID).then(() => {
                    if (/^\d{9}$/.test(room)) {
                        void discardActiveMeetingHostKey(room).catch(() => {
                            Alert.alert('主持人已转让', '本机旧凭据未能安全退役，请重启后核对权限。');
                        });
                    }
                }).catch(() => {
                    Alert.alert('主持人转让尚未确认', '请检查成员与会议状态，勿重复操作。');
                });
            } else {
                super._onSubmit();
            }
        });

        return true;
    }
    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        return (
            <ConfirmDialog
                descriptionKey = {
                    `将主持权限转让给 ${this.props.participantName || '该成员'}？转让完成后你将失去主持权限。`
                }
                onSubmit = { this._onSubmit } />
        );
    }
}

export default translate(connect(abstractMapStateToProps)(GrantModeratorDialog));
