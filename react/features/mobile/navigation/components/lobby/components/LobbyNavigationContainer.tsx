import { NavigationIndependentTree } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../../../../app/types';
import { NavigationContainer, useNativeScreenOptions } from '../../../../../base/ui/components/native/ThemedNavigation';
import LobbyChatScreen from '../../../../../lobby/components/native/LobbyChatScreen';
import LobbyScreen from '../../../../../lobby/components/native/LobbyScreen';
import { screen } from '../../../routes';
import { lobbyChatScreenOptions as static_lobbyChatScreenOptions, lobbyScreenOptions as static_lobbyScreenOptions, navigationContainerTheme as static_navigationContainerTheme } from '../../../screenOptions';
import { lobbyNavigationContainerRef } from '../LobbyNavigationContainerRef';

const LobbyStack = createStackNavigator();


const LobbyNavigationContainer = () => {
    const lobbyChatScreenOptions = useNativeScreenOptions(static_lobbyChatScreenOptions);
    const lobbyScreenOptions = useNativeScreenOptions(static_lobbyScreenOptions);
    const navigationContainerTheme = useNativeScreenOptions(static_navigationContainerTheme);
    const { isLobbyChatActive }
        = useSelector((state: IReduxState) => state['features/chat']);

    return (
        <NavigationIndependentTree>
            <NavigationContainer
                ref = { lobbyNavigationContainerRef }
                theme = { navigationContainerTheme }>
                <LobbyStack.Navigator
                    screenOptions = {{
                        presentation: 'modal'
                    }}>
                    <LobbyStack.Screen
                        component = { LobbyScreen }
                        name = { screen.lobby.main }
                        options = { lobbyScreenOptions } />
                    {
                        isLobbyChatActive
                        && <LobbyStack.Screen
                            component = { LobbyChatScreen }
                            name = { screen.lobby.chat }
                            options = { lobbyChatScreenOptions } />
                    }
                </LobbyStack.Navigator>
            </NavigationContainer>
        </NavigationIndependentTree>
    );

};

export default LobbyNavigationContainer;
