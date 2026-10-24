import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureResponderEvent } from 'react-native';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../../../../app/types';
import { getServerURL } from '../../../../../base/settings/functions.native';
import { useNativeScreenOptions } from '../../../../../base/ui/components/native/ThemedNavigation';
import CalendarList from '../../../../../calendar-sync/components/CalendarList.native';
import { isCalendarEnabled } from '../../../../../calendar-sync/functions.native';
import HistoryMeetings from '../../../../../cloudmeet/HistoryMeetings.native';
import ScheduledMeetings from '../../../../../cloudmeet/ScheduledMeetings.native';
import { CLOUDMEET_ORIGIN } from '../../../../../cloudmeet/meetingService';
import RecentList from '../../../../../recent-list/components/RecentList.native';
import { calendarListTabBarOptions as static_calendarListTabBarOptions, recentListTabBarOptions as static_recentListTabBarOptions, settingsTabBarOptions as static_settingsTabBarOptions, tabBarOptions as static_tabBarOptions } from '../../../../../welcome/constants';
import { screen } from '../../../routes';
import SettingsNavigationContainer
    from '../../settings/components/SettingsNavigationContainer';

const WelcomePage = createBottomTabNavigator();

/**
 * The type of the React {@code Component} props of {@link WelcomePageTabs}.
 */
interface IProps {

    /**
     * Renders the lists disabled.
     */
    disabled: boolean;

    /**
     * Callback to be invoked when pressing the list container.
     */
    onListContainerPress?: (e?: GestureResponderEvent) => void;

    /**
     * Callback to be invoked when settings screen is focused.
     */
    onSettingsScreenFocused: Function;
}


const WelcomePageTabs = ({ disabled, onListContainerPress, onSettingsScreenFocused }: IProps) => {
    const calendarListTabBarOptions = useNativeScreenOptions(static_calendarListTabBarOptions);
    const recentListTabBarOptions = useNativeScreenOptions(static_recentListTabBarOptions);
    const settingsTabBarOptions = useNativeScreenOptions(static_settingsTabBarOptions);
    const tabBarOptions = useNativeScreenOptions(static_tabBarOptions);
    const { t } = useTranslation();
    const calendarEnabled = useSelector(isCalendarEnabled);
    const cloudMeetEnabled = useSelector((state: IReduxState) => getServerURL(state).replace(/\/$/, '') === CLOUDMEET_ORIGIN);
    const RecentListScreen = useCallback(() =>
        (
            cloudMeetEnabled ? <HistoryMeetings
                disabled = { disabled }
                onListContainerPress = { onListContainerPress } /> : <RecentList
                disabled = { disabled }
                onListContainerPress = { onListContainerPress } />
        ), [ cloudMeetEnabled, disabled, onListContainerPress ]);

    const CalendarListScreen = useCallback(() =>
        (
            cloudMeetEnabled ? <ScheduledMeetings /> : <CalendarList
                disabled = { disabled } />
        ), [ cloudMeetEnabled, disabled ]);

    const SettingsScreen = useCallback(() =>
        (
            <SettingsNavigationContainer
                isInWelcomePage = { true } />
        ), []);

    return (
        <WelcomePage.Navigator
            backBehavior = { 'none' }
            initialRouteName = { cloudMeetEnabled ? screen.welcome.tabs.calendar : screen.welcome.tabs.recent }
            screenOptions = {{
                ...tabBarOptions,
                headerShown: false
            }}>
            {
                (calendarEnabled || cloudMeetEnabled)
            && <WelcomePage.Screen
                listeners = {{
                    tabPress: () => {
                        onSettingsScreenFocused(false);
                    }
                }}
                name = { screen.welcome.tabs.calendar }
                options = {{
                    ...calendarListTabBarOptions,
                    title: t('welcomepage.calendar')
                }}>
                { CalendarListScreen }
            </WelcomePage.Screen>
            }
            <WelcomePage.Screen
                listeners = {{
                    tabPress: () => {
                        onSettingsScreenFocused(false);
                    }
                }}
                name = { screen.welcome.tabs.recent }
                options = {{
                    ...recentListTabBarOptions,
                    title: t('welcomepage.recentList')
                }}>
                { RecentListScreen }
            </WelcomePage.Screen>
            <WelcomePage.Screen
                listeners = {{
                    tabPress: () => {
                        onSettingsScreenFocused(true);
                    }
                }}
                name = { screen.settings.main }
                options = {{
                    ...settingsTabBarOptions,
                    title: t('welcomepage.settings')
                }}>
                { SettingsScreen }
            </WelcomePage.Screen>
        </WelcomePage.Navigator>
    );
};

export default WelcomePageTabs;
