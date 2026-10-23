import { createContext, useContext } from 'react';

import BaseTheme from './components/BaseTheme.native';
import { LIGHT_PALETTE, ThemeMode, resolveNativeColor, resolveNativeStyles } from './nativeTheme';

const lightTheme = {
    ...BaseTheme,
    dark: false,
    mode: 'light' as ThemeMode,
    colors: {
        ...BaseTheme.colors,
        primary: LIGHT_PALETTE.action01,
        background: LIGHT_PALETTE.uiBackground,
        surface: LIGHT_PALETTE.ui01,
        onSurface: LIGHT_PALETTE.text01,
        onBackground: LIGHT_PALETTE.text01,
        onSurfaceVariant: LIGHT_PALETTE.text02,
        outline: LIGHT_PALETTE.ui03
    },
    palette: {
        ...Object.fromEntries(Object.entries(BaseTheme.palette).map(([ key, value ]) =>
            [ key, typeof value === 'string' ? resolveNativeColor(value, 'light') : value ])),
        ...LIGHT_PALETTE
    }
};

export const nativeThemes = {
    dark: { ...BaseTheme, dark: true, mode: 'dark' as ThemeMode },
    light: lightTheme
};

export const NativeThemeContext = createContext(nativeThemes.dark);

/**
 * Subscribe to theme updates without remounting conference components.
 *
 * @returns {Object} Current theme.
 */
export function useNativeTheme() {
    return useContext(NativeThemeContext);
}

/**
 * Return cached theme-dependent variants of existing style definitions.
 *
 * @param {T} styles - Existing styles.
 * @returns {T} Themed styles.
 */
export function useNativeStyles<T>(styles: T): T {
    return resolveNativeStyles(styles, useNativeTheme().mode);
}
