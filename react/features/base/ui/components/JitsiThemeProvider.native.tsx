import * as React from 'react';
import { NativeModules, Platform, StatusBar } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { NativeThemeContext, nativeThemes } from '../NativeThemeContext';
import { normalizeThemeMode } from '../nativeTheme';

interface IProps {

    /**
    * The children of the component.
    */
    children: React.ReactNode;

    /** Only provide colors to overlay siblings without adding a full-screen Portal host. */
    contextOnly?: boolean;
}

/**
 * The theme provider for the mobile app.
 *
 * @param {Object} props - The props of the component.
 * @returns {React.ReactNode}
 */
export default function JitsiThemePaperProvider(props: IProps) {
    const mode = useSelector((state: IReduxState) => normalizeThemeMode(state['features/base/settings'].theme));
    const theme = nativeThemes[mode];

    React.useEffect(() => {
        if (!props.contextOnly && Platform.OS === 'android') {
            NativeModules.SystemTheme?.setTheme(mode);
        }
    }, [ mode, props.contextOnly ]);

    if (props.contextOnly) {
        return (
            <NativeThemeContext.Provider value = { theme }>
                { props.children }
            </NativeThemeContext.Provider>
        );
    }

    return (
        <NativeThemeContext.Provider value = { theme }>
            <PaperProvider theme = { theme }>
                <StatusBar
                    backgroundColor = { theme.palette.uiBackground }
                    barStyle = { theme.dark ? 'light-content' : 'dark-content' } />
                { props.children }
            </PaperProvider>
        </NativeThemeContext.Provider>
    );
}
