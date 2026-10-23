import React from 'react';
import { StyleSheet, View } from 'react-native';

import ThemeOption from './ThemeOption';

const styles = StyleSheet.create({
    group: { flexDirection: 'row', gap: 8 }
});

/**
 * Persistent theme selection, available both before and during a conference.
 *
 * @returns {ReactElement} Theme selector.
 */
export default function ThemeSelect() {
    return (
        <View
            accessibilityRole = 'radiogroup'
            style = { styles.group }>
            <ThemeOption mode = 'dark' />
            <ThemeOption mode = 'light' />
        </View>
    );
}
