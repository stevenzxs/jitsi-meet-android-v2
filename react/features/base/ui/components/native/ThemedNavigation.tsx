import { NavigationContainer as NativeNavigationContainer } from '@react-navigation/native';
import React, { forwardRef } from 'react';

import { useNativeTheme } from '../../NativeThemeContext';
import { resolveNativeStyles } from '../../nativeTheme';

/**
 * Resolve existing screen option objects while keeping navigator identity stable.
 *
 * @param {T} options - Static navigation options.
 * @returns {T} Reactive options.
 */
export function useNativeScreenOptions<T>(options: T): T {
    return resolveNativeStyles(options, useNativeTheme().mode);
}

export const NavigationContainer = forwardRef<any, any>((props, ref) => {
    const theme = useNativeTheme();

    return (
        <NativeNavigationContainer
            { ...props }
            ref = { ref }
            theme = {{
                ...props.theme,
                dark: theme.dark,
                colors: {
                    ...props.theme?.colors,
                    primary: theme.palette.action01,
                    background: theme.palette.uiBackground,
                    card: theme.palette.ui01,
                    text: theme.palette.text01,
                    border: theme.palette.ui03,
                    notification: theme.palette.actionDanger
                }
            }} />
    );
});

NavigationContainer.displayName = 'ThemedNavigationContainer';
