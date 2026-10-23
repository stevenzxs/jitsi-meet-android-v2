/* eslint-disable lines-around-comment */

import { NavigationIndependentTree } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import AudioTranslationDialog
    from '../../../../../audio-translation/components/native/AudioTranslationDialog';
import { NavigationContainer, useNativeScreenOptions } from '../../../../../base/ui/components/native/ThemedNavigation';
import BreakoutRooms
// @ts-ignore
    from '../../../../../breakout-rooms/components/native/BreakoutRooms';
// @ts-ignore
import Chat from '../../../../../chat/components/native/Chat';
// @ts-ignore
import Conference from '../../../../../conference/components/native/Conference';
// @ts-ignore
import CarMode from '../../../../../conference/components/native/carmode/CarMode';
// @ts-ignore
import { arePollsDisabled } from '../../../../../conference/functions';
import CustomPanel from '../../../../../custom-panel/components/native/CustomPanel';
// @ts-ignore
import SharedDocument from '../../../../../etherpad/components/native/SharedDocument';
// @ts-ignore
import GifsMenu from '../../../../../gifs/components/native/GifsMenu';
import AddPeopleDialog
// @ts-ignore
    from '../../../../../invite/components/add-people-dialog/native/AddPeopleDialog';
// @ts-ignore
import ParticipantsPane from '../../../../../participants-pane/components/native/ParticipantsPane';
// @ts-ignore
import StartLiveStreamDialog from '../../../../../recording/components/LiveStream/native/StartLiveStreamDialog';
import RecordingTranscriptionDialog
// @ts-ignore
    from '../../../../../recording/components/Recording/native/RecordingTranscriptionDialog';
import SalesforceLinkDialog
// @ts-ignore
    from '../../../../../salesforce/components/native/SalesforceLinkDialog';
import SecurityDialog
// @ts-ignore
    from '../../../../../security/components/security-dialog/native/SecurityDialog';
import SpeakerStats
// @ts-ignore
    from '../../../../../speaker-stats/components/native/SpeakerStats';
import LanguageSelectorDialog
// @ts-ignore
    from '../../../../../subtitles/components/native/LanguageSelectorDialog';
import { isCCTabEnabled } from '../../../../../subtitles/functions.any';
import Whiteboard from '../../../../../whiteboard/components/native/Whiteboard';
// @ts-ignore
import { screen } from '../../../routes';
import { audioTranslationScreenOptions as static_audioTranslationScreenOptions, breakoutRoomsScreenOptions as static_breakoutRoomsScreenOptions, carmodeScreenOptions as static_carmodeScreenOptions, chatScreenOptions as static_chatScreenOptions, conferenceScreenOptions as static_conferenceScreenOptions, customPanelScreenOptions as static_customPanelScreenOptions, gifsMenuOptions as static_gifsMenuOptions, inviteScreenOptions as static_inviteScreenOptions, liveStreamScreenOptions as static_liveStreamScreenOptions, lobbyNavigationContainerScreenOptions as static_lobbyNavigationContainerScreenOptions, navigationContainerTheme as static_navigationContainerTheme, participantsScreenOptions as static_participantsScreenOptions, recordingScreenOptions as static_recordingScreenOptions, salesforceScreenOptions as static_salesforceScreenOptions, securityScreenOptions as static_securityScreenOptions, settingsNavigationContainerScreenOptions as static_settingsNavigationContainerScreenOptions, sharedDocumentScreenOptions as static_sharedDocumentScreenOptions, speakerStatsScreenOptions as static_speakerStatsScreenOptions, subtitlesScreenOptions as static_subtitlesScreenOptions, whiteboardScreenOptions as static_whiteboardScreenOptions } from '../../../screenOptions';
// @ts-ignore
import ChatNavigator from '../../chat/components/ChatNavigator';
// @ts-ignore
import LobbyNavigationContainer from '../../lobby/components/LobbyNavigationContainer';
// @ts-ignore
import SettingsNavigationContainer from '../../settings/components/SettingsNavigationContainer';
import {
    conferenceNavigationRef
    // @ts-ignore
} from '../ConferenceNavigationContainerRef';


const ConferenceStack = createStackNavigator();


const ConferenceNavigationContainer = () => {
    const audioTranslationScreenOptions = useNativeScreenOptions(static_audioTranslationScreenOptions);
    const breakoutRoomsScreenOptions = useNativeScreenOptions(static_breakoutRoomsScreenOptions);
    const carmodeScreenOptions = useNativeScreenOptions(static_carmodeScreenOptions);
    const chatScreenOptions = useNativeScreenOptions(static_chatScreenOptions);
    const conferenceScreenOptions = useNativeScreenOptions(static_conferenceScreenOptions);
    const customPanelScreenOptions = useNativeScreenOptions(static_customPanelScreenOptions);
    const gifsMenuOptions = useNativeScreenOptions(static_gifsMenuOptions);
    const inviteScreenOptions = useNativeScreenOptions(static_inviteScreenOptions);
    const liveStreamScreenOptions = useNativeScreenOptions(static_liveStreamScreenOptions);
    const lobbyNavigationContainerScreenOptions = useNativeScreenOptions(static_lobbyNavigationContainerScreenOptions);
    const navigationContainerTheme = useNativeScreenOptions(static_navigationContainerTheme);
    const participantsScreenOptions = useNativeScreenOptions(static_participantsScreenOptions);
    const recordingScreenOptions = useNativeScreenOptions(static_recordingScreenOptions);
    const salesforceScreenOptions = useNativeScreenOptions(static_salesforceScreenOptions);
    const securityScreenOptions = useNativeScreenOptions(static_securityScreenOptions);
    const settingsNavigationContainerScreenOptions = useNativeScreenOptions(static_settingsNavigationContainerScreenOptions);
    const sharedDocumentScreenOptions = useNativeScreenOptions(static_sharedDocumentScreenOptions);
    const speakerStatsScreenOptions = useNativeScreenOptions(static_speakerStatsScreenOptions);
    const subtitlesScreenOptions = useNativeScreenOptions(static_subtitlesScreenOptions);
    const whiteboardScreenOptions = useNativeScreenOptions(static_whiteboardScreenOptions);
    const isPollsDisabled = useSelector(arePollsDisabled);
    const _isPollsEnabled = !isPollsDisabled;
    const _isCCTabEnabled = useSelector(isCCTabEnabled);
    const { t } = useTranslation();

    let ChatScreen;
    let chatScreenName;
    let chatTitle;

    if (isPollsDisabled) {
        ChatScreen = Chat;
        chatScreenName = screen.conference.chat;
    } else {
        ChatScreen = ChatNavigator;
        chatScreenName = screen.conference.chatTabs.main;
    }

    if (_isPollsEnabled || _isCCTabEnabled) {
        const features = [
            _isPollsEnabled ? t('chat.titleWithPolls') : '',
            _isCCTabEnabled ? t('chat.titleWithCC') : ''
        ].filter(Boolean);

        chatTitle = `${t('chat.titleWithFeatures')} ${features.join(' and ')}`;
    } else {
        chatTitle = t('chat.title');
    }

    return (
        <NavigationIndependentTree>
            <NavigationContainer
                ref = { conferenceNavigationRef }
                theme = { navigationContainerTheme }>
                <ConferenceStack.Navigator
                    screenOptions = {{
                        presentation: 'modal'
                    }}>
                    <ConferenceStack.Screen
                        component = { Conference }
                        name = { screen.conference.main }
                        options = { conferenceScreenOptions } />
                    <ConferenceStack.Screen
                        component = { ChatScreen }
                        name = { chatScreenName }
                        options = {{
                            ...chatScreenOptions,
                            title: chatTitle
                        }} />
                    <ConferenceStack.Screen
                        component = { ParticipantsPane }
                        name = { screen.conference.participants }
                        options = {{
                            ...participantsScreenOptions,
                            title: t('participantsPane.title')
                        }} />
                    <ConferenceStack.Screen
                        component = { SecurityDialog }
                        name = { screen.conference.security }
                        options = {{
                            ...securityScreenOptions,
                            title: t('security.title')
                        }} />
                    <ConferenceStack.Screen
                        component = { RecordingTranscriptionDialog }
                        name = { screen.conference.recording }
                        options = {{
                            ...recordingScreenOptions,
                            title: t('dialog.recordAndTranscribe')
                        }} />
                    <ConferenceStack.Screen
                        component = { StartLiveStreamDialog }
                        name = { screen.conference.liveStream }
                        options = {{
                            ...liveStreamScreenOptions,
                            title: t('liveStreaming.title')
                        }} />
                    <ConferenceStack.Screen
                        component = { SpeakerStats }
                        name = { screen.conference.speakerStats }
                        options = {{
                            ...speakerStatsScreenOptions,
                            title: t('speakerStats.speakerStats')
                        }} />
                    <ConferenceStack.Screen
                        component = { SalesforceLinkDialog }
                        name = { screen.conference.salesforce }
                        options = {{
                            ...salesforceScreenOptions,
                            title: t('notify.linkToSalesforce')
                        }} />
                    <ConferenceStack.Screen
                        component = { GifsMenu }
                        name = { screen.conference.gifsMenu }
                        options = {{
                            ...gifsMenuOptions,
                            title: t('notify.gifsMenu')
                        }} />
                    <ConferenceStack.Screen
                        component = { LobbyNavigationContainer }
                        name = { screen.lobby.root }
                        options = {{
                            ...lobbyNavigationContainerScreenOptions,
                            title: t('lobby.title')
                        }} />
                    <ConferenceStack.Screen
                        component = { AddPeopleDialog }
                        name = { screen.conference.invite }
                        options = {{
                            ...inviteScreenOptions,
                            title: t('addPeople.add')
                        }} />
                    <ConferenceStack.Screen
                        component = { SharedDocument }
                        name = { screen.conference.sharedDocument }
                        options = {{
                            ...sharedDocumentScreenOptions,
                            title: t('documentSharing.title')
                        }} />
                    <ConferenceStack.Screen
                        // @ts-ignore
                        component = { SettingsNavigationContainer }
                        name = { screen.settings.main }
                        options = { settingsNavigationContainerScreenOptions } />
                    <ConferenceStack.Screen
                        // @ts-ignore
                        component = { CarMode }
                        name = { screen.conference.carmode }
                        options = {{
                            ...carmodeScreenOptions,
                            title: t('carmode.labels.title')
                        }} />
                    <ConferenceStack.Screen
                        component = { LanguageSelectorDialog }
                        name = { screen.conference.subtitles }
                        options = {{
                            ...subtitlesScreenOptions,
                            title: t('transcribing.subtitles')
                        }} />
                    <ConferenceStack.Screen
                        component = { AudioTranslationDialog }
                        name = { screen.conference.audioTranslation }
                        options = {{
                            ...audioTranslationScreenOptions,
                            title: t('toolbar.audioTranslation')
                        }} />
                    <ConferenceStack.Screen
                        component = { BreakoutRooms }
                        name = { screen.conference.breakoutRooms }
                        options = {{
                            ...breakoutRoomsScreenOptions,
                            title: t('breakoutRooms.title')
                        }} />
                    <ConferenceStack.Screen
                        // @ts-ignore
                        component = { Whiteboard }
                        name = { screen.conference.whiteboard }
                        options = {{
                            ...whiteboardScreenOptions,
                            title: t('whiteboard.screenTitle')
                        }} />
                    <ConferenceStack.Screen
                        component = { CustomPanel }
                        name = { screen.conference.customPanel }
                        options = {{
                            ...customPanelScreenOptions,
                            title: t('customPanel.title')
                        }} />
                </ConferenceStack.Navigator>
            </NavigationContainer>
        </NavigationIndependentTree>
    );
};

export default ConferenceNavigationContainer;
