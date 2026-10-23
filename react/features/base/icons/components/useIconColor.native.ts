import { useContext } from 'react';

import { useNativeTheme } from '../../ui/NativeThemeContext';
import { NativeForegroundContext } from '../../ui/components/native/ThemedPrimitives';
import { resolveNativeColor } from '../../ui/nativeTheme';

/**
 * Keep video/action icons readable while adapting unscoped default icons.
 *
 * @param {string} color - Existing color.
 * @returns {string} Themed color.
 */
export default function useIconColor(color?: string) {
    const theme = useNativeTheme();
    const foreground = useContext(NativeForegroundContext);

    if (!color || color === 'white' || color.toUpperCase() === '#FFFFFF') {
        return foreground ?? theme.palette.icon01;
    }

    return resolveNativeColor(color, theme.mode);
}
