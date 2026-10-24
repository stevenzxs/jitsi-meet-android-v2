import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { updateSettings } from '../../../base/settings/actions';
import Switch from '../../../base/ui/components/native/Switch';

import FormRow from './FormRow';
import FormSection from './FormSection';


const ConferenceSection = () => {
    const dispatch = useDispatch();
    const {
        startCarMode,
        startWithAudioMuted,
        startWithVideoMuted
    } = useSelector((state: IReduxState) => state['features/base/settings']);

    const switches = useMemo(() => [
        {
            label: 'settingsView.startCarModeInLowBandwidthMode',
            state: startCarMode,
            name: 'startCarMode'
        },
        {
            label: 'settingsView.startWithAudioMuted',
            state: startWithAudioMuted,
            name: 'startWithAudioMuted'
        },
        {
            label: 'settingsView.startWithVideoMuted',
            state: startWithVideoMuted,
            name: 'startWithVideoMuted'
        }
    ], [ startCarMode, startWithAudioMuted, startWithVideoMuted ]);

    const onSwitchToggled = useCallback((name: string) => (enabled?: boolean) => {

        // @ts-ignore
        dispatch(updateSettings({ [name]: enabled }));
    }, [ dispatch ]);

    return (
        <FormSection
            label = 'settingsView.conferenceSection'>
            {
                switches.map(({ label, state, name }) => (
                    <FormRow
                        key = { label }
                        label = { label }>
                        <Switch
                            checked = { Boolean(state) }
                            onChange = { onSwitchToggled(name) } />
                    </FormRow>
                ))
            }
        </FormSection>
    );
};

export default ConferenceSection;
