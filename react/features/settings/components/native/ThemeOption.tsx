import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';

import { updateSettings } from '../../../base/settings/actions';
import { useNativeTheme } from '../../../base/ui/NativeThemeContext';
import { ThemeMode } from '../../../base/ui/nativeTheme';

import ThemeIcon from './ThemeIcon';

const styles = StyleSheet.create({
    option: {
        borderRadius: 8,
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center'
    }
});

const ThemeOption = ({ mode }: { mode: ThemeMode; }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const theme = useNativeTheme();
    const selected = theme.mode === mode;
    const onPress = useCallback(() => dispatch(updateSettings({ theme: mode })), [ dispatch, mode ]);
    const label = t(`settings.theme${mode === 'dark' ? 'Dark' : 'Light'}`);

    return (
        <TouchableOpacity
            accessibilityLabel = { label }
            accessibilityRole = 'radio'
            accessibilityState = {{ checked: selected }}
            onPress = { onPress }
            style = { [ styles.option, {
                backgroundColor: theme.palette.ui02
            } ] }
            testID = { `theme-${mode}` }>
            <ThemeIcon
                color = { selected ? theme.palette.action01 : theme.palette.text01 }
                mode = { mode } />
        </TouchableOpacity>
    );
};

export default ThemeOption;
