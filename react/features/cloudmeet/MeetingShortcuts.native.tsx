import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BaseTheme from '../base/ui/components/BaseTheme.native';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
    shortcut: { alignItems: 'center', padding: 8, gap: 8, flexShrink: 1, minWidth: 48, minHeight: 48 },
    icon: { width: 60, height: 60, borderRadius: 16, backgroundColor: BaseTheme.palette.action01, alignItems: 'center', justifyContent: 'center' },
    label: { ...BaseTheme.typography.bodyShortRegular, color: BaseTheme.palette.text01, fontWeight: '500', textAlign: 'center' }
});

/**
 * Compact meeting launchers, with theme-aware labels and consistent white outline glyphs.
 *
 * @param {Object} props - Existing navigation callbacks.
 * @returns {ReactElement} Three shortcuts in one left-aligned row.
 */
export default function MeetingShortcuts({ onCreate, onJoin, onSchedule }: {
    onCreate: () => void;
    onJoin: () => void;
    onSchedule: () => void;
}) {
    const { t } = useTranslation();
    const shortcuts = [
        { label: 'cloudmeet.create', onPress: onCreate, path: 'M13.3 2 5 13h6.2L9.9 22 19 10.2h-6.4z' },
        { label: 'cloudmeet.join', onPress: onJoin, path: 'M12 5v14M5 12h14' },
        { label: 'cloudmeet.schedule', onPress: onSchedule, path: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 13h2M14 13h2M8 17h2' }
    ];

    return (
        <View style = { styles.row }>
            { shortcuts.map(({ label, onPress, path }) => (
                <TouchableOpacity
                    accessibilityLabel = { t(label) }
                    accessibilityRole = 'button'
                    key = { label }
                    onPress = { onPress }
                    style = { styles.shortcut }>
                    <View style = { styles.icon }>
                        <Svg
                            height = { 30 }
                            viewBox = '0 0 24 24'
                            width = { 30 }>
                            <Path
                                d = { path }
                                fill = 'none'
                                stroke = '#FFFFFF'
                                strokeLinecap = 'round'
                                strokeLinejoin = 'round'
                                strokeWidth = { 2 } />
                        </Svg>
                    </View>
                    <Text style = { styles.label }>{ t(label) }</Text>
                </TouchableOpacity>
            )) }
        </View>
    );
}
