import React from 'react';
import { connect } from 'react-redux';
import { Alert } from 'react-native';

import { requestNativeHostTransfer } from '../../../cloudmeet/hostTransfer';
import { CLOUDMEET_ORIGIN } from '../../../cloudmeet/meetingService';
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
            if (getCurrentConferenceUrl(getState())?.startsWith(`${CLOUDMEET_ORIGIN}/`)) {
                const conference = getState()['features/base/conference'].conference;

                void requestNativeHostTransfer(conference, this.props.participantID).catch(() => {
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
