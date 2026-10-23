import { NavigationIndependentTree } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback } from 'react';
import { Animated } from 'react-native';
import { connect } from 'react-redux';

import { IReduxState, IStore } from '../../../app/types';
import { getConferenceState } from '../../../base/conference/functions';
import { NavigationContainer, useNativeScreenOptions } from '../../../base/ui/components/native/ThemedNavigation';
import QuickMeetingPage from '../../../cloudmeet/QuickMeetingPage.native';
import DialInSummary from '../../../invite/components/dial-in-summary/native/DialInSummary';
import Prejoin from '../../../prejoin/components/native/Prejoin';
import UnsafeRoomWarning from '../../../prejoin/components/native/UnsafeRoomWarning';
import VisitorsQueue from '../../../visitors/components/native/VisitorsQueue';
// eslint-disable-next-line
// @ts-ignore
import WelcomePage from '../../../welcome/components/WelcomePage';
import { isWelcomePageEnabled } from '../../../welcome/functions';
import { _ROOT_NAVIGATION_READY } from '../actionTypes';
import { rootNavigationRef } from '../rootNavigationContainerRef';
import { screen } from '../routes';
import { settingsScreenOptions, conferenceNavigationContainerScreenOptions as static_conferenceNavigationContainerScreenOptions, connectingScreenOptions as static_connectingScreenOptions, dialInSummaryScreenOptions as static_dialInSummaryScreenOptions, navigationContainerTheme as static_navigationContainerTheme, preJoinScreenOptions as static_preJoinScreenOptions, unsafeMeetingScreenOptions as static_unsafeMeetingScreenOptions, visitorsScreenOptions as static_visitorsScreenOptions, welcomeScreenOptions as static_welcomeScreenOptions } from '../screenOptions';

import ConnectingPage from './ConnectingPage';
import ConferenceNavigationContainer
    from './conference/components/ConferenceNavigationContainer';

const RootStack = createStackNavigator();


interface IProps {

    /**
     * Redux dispatch function.
     */
    dispatch: IStore['dispatch'];

    /**
     * True if a room is already set at launch time (background SDK launch).
     */
    hasRoomOnLaunch: boolean;

    /**
    * Is welcome page available?
    */
    isWelcomePageAvailable: boolean;
}


const RootNavigationContainer = ({ dispatch, hasRoomOnLaunch, isWelcomePageAvailable }: IProps) => {
    const conferenceNavigationContainerScreenOptions = useNativeScreenOptions(static_conferenceNavigationContainerScreenOptions);
    const connectingScreenOptions = useNativeScreenOptions(static_connectingScreenOptions);
    const dialInSummaryScreenOptions = useNativeScreenOptions(static_dialInSummaryScreenOptions);
    const navigationContainerTheme = useNativeScreenOptions(static_navigationContainerTheme);
    const preJoinScreenOptions = useNativeScreenOptions(static_preJoinScreenOptions);
    const unsafeMeetingScreenOptions = useNativeScreenOptions(static_unsafeMeetingScreenOptions);
    const visitorsScreenOptions = useNativeScreenOptions(static_visitorsScreenOptions);
    const welcomeScreenOptions = useNativeScreenOptions(static_welcomeScreenOptions);
    const quickMeetingScreenOptions = useNativeScreenOptions({
        ...settingsScreenOptions,
        gestureEnabled: false,
        transitionSpec: {
            open: { animation: 'timing' as const, config: { duration: 200 } },
            close: { animation: 'timing' as const, config: { duration: 200 } }
        },
        cardStyleInterpolator: ({ current }: { current: { progress: Animated.AnimatedInterpolation<number>; }; }) => ({
            cardStyle: { opacity: current.progress }
        }),
        headerStyleInterpolator: ({ current }: { current: { progress: Animated.AnimatedInterpolation<number>; }; }) => ({
            leftButtonStyle: { opacity: current.progress },
            rightButtonStyle: { opacity: current.progress },
            titleStyle: { opacity: current.progress },
            backgroundStyle: { opacity: current.progress }
        })
    });
    // Background SDK launch goes straight to conference; normal launch shows the connecting spinner.
    const initialRouteName = isWelcomePageAvailable
        ? screen.welcome.main
        : hasRoomOnLaunch
            ? screen.conference.root
            : screen.connecting;
    const onReady = useCallback(() => {
        dispatch({
            type: _ROOT_NAVIGATION_READY,
            ready: true
        });
    }, [ dispatch ]);

    return (
        <NavigationIndependentTree>
            <NavigationContainer
                onReady = { onReady }
                ref = { rootNavigationRef }
                theme = { navigationContainerTheme }>
                <RootStack.Navigator
                    initialRouteName = { initialRouteName }>
                    <RootStack.Screen // @ts-ignore
                        component = { WelcomePage }
                        name = { screen.welcome.main }
                        options = { welcomeScreenOptions } />
                    <RootStack.Screen // @ts-ignore
                        component = { DialInSummary }
                        name = { screen.dialInSummary }
                        options = { dialInSummaryScreenOptions } />
                    <RootStack.Screen
                        component = { ConnectingPage }
                        name = { screen.connecting }
                        options = { connectingScreenOptions } />
                    <RootStack.Screen
                        component = { QuickMeetingPage }
                        name = { screen.quickMeeting }
                        options = { quickMeetingScreenOptions } />
                    <RootStack.Screen
                        component = { Prejoin }
                        name = { screen.preJoin }
                        options = { preJoinScreenOptions } />
                    <RootStack.Screen
                        component = { UnsafeRoomWarning }
                        name = { screen.unsafeRoomWarning }
                        options = { unsafeMeetingScreenOptions } />
                    <RootStack.Screen
                        component = { VisitorsQueue }
                        name = { screen.visitorsQueue }
                        options = { visitorsScreenOptions } />
                    <RootStack.Screen
                        component = { ConferenceNavigationContainer }
                        name = { screen.conference.root }
                        options = { conferenceNavigationContainerScreenOptions } />
                </RootStack.Navigator>
            </NavigationContainer>
        </NavigationIndependentTree>
    );
};

/**
 * Maps part of the Redux store to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {IProps}
 */
function mapStateToProps(state: IReduxState) {
    const { room } = getConferenceState(state);

    return {
        hasRoomOnLaunch: Boolean(room),
        isWelcomePageAvailable: isWelcomePageEnabled(state)
    };
}

export default connect(mapStateToProps)(RootNavigationContainer);
