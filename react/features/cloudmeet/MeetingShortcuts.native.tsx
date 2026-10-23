import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BaseTheme from '../base/ui/components/BaseTheme.native';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, paddingVertical: 24, gap: 16 },
    shortcut: { alignItems: 'center', padding: 8, gap: 12, flexShrink: 1 },
    icon: { width: 72, height: 72, borderRadius: 20, backgroundColor: BaseTheme.palette.action01, alignItems: 'center', justifyContent: 'center' },
    label: { color: BaseTheme.palette.text01, fontSize: 16, fontWeight: '600', textAlign: 'center' }
});

/**
 * Desktop-inspired meeting launchers, with theme-aware labels and fixed white glyphs.
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
        { label: 'cloudmeet.join', onPress: onJoin, path: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z' },
        { label: 'cloudmeet.schedule', onPress: onSchedule, path: 'M7 2h2v3h6V2h2v3h3v17H4V5h3V2zm-1 8v10h12V10H6zm2 2h3v3H8v-3z' }
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
                            height = { 38 }
                            viewBox = '0 0 24 24'
                            width = { 38 }>
                            <Path
                                d = { path }
                                fill = '#FFFFFF' />
                        </Svg>
                    </View>
                    <Text style = { styles.label }>{ t(label) }</Text>
                </TouchableOpacity>
            )) }
        </View>
    );
}
