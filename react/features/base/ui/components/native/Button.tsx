import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleProp } from 'react-native';
import { Button as NativePaperButton, Text } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';

import { useNativeStyles, useNativeTheme } from '../../NativeThemeContext';
import { BUTTON_MODES, BUTTON_TYPES } from '../../constants.native';
import { IButtonProps } from '../types';

import { NativeForegroundContext, TouchableHighlight } from './ThemedPrimitives';
import styles from './buttonStyles';


export interface IProps extends IButtonProps {
    color?: string | undefined;
    contentStyle?: Object | undefined;
    id?: string;
    labelStyle?: Object | undefined;
    mode?: any;
    style?: Object | undefined;
}

const Button: React.FC<IProps> = ({
    accessibilityLabel,
    color: buttonColor,
    contentStyle,
    disabled,
    icon,
    id,
    labelKey,
    labelStyle,
    mode = BUTTON_MODES.CONTAINED,
    onClick: onPress,
    style,
    type
}: IProps) => {
    const { t } = useTranslation();
    const themedStyles = useNativeStyles(styles);
    const theme = useNativeTheme();
    const { DESTRUCTIVE, PRIMARY, SECONDARY, TERTIARY } = BUTTON_TYPES;
    const { CONTAINED, TEXT } = BUTTON_MODES;

    let buttonLabelStyles;
    let buttonStyles;
    let color;
    let foreground;

    if (type === PRIMARY) {
        foreground = mode === TEXT ? theme.palette.action01 : '#FFFFFF';
        buttonLabelStyles = mode === TEXT
            ? themedStyles.buttonLabelPrimaryText
            : themedStyles.buttonLabelPrimary;
        color = mode === CONTAINED && theme.palette.action01;
    } else if (type === SECONDARY) {
        foreground = theme.palette.text04;
        buttonLabelStyles = themedStyles.buttonLabelSecondary;
        color = mode === CONTAINED && theme.palette.action02;
    } else if (type === DESTRUCTIVE) {
        foreground = mode === TEXT ? theme.palette.actionDanger : '#FFFFFF';
        buttonLabelStyles = mode === TEXT
            ? themedStyles.buttonLabelDestructiveText
            : themedStyles.buttonLabelDestructive;
        color = mode === CONTAINED && theme.palette.actionDanger;
    } else {
        color = buttonColor;
        buttonLabelStyles = styles.buttonLabel;
    }

    if (disabled) {
        foreground = theme.palette.text03;
        buttonLabelStyles = { ...themedStyles.buttonLabelDisabled, color: foreground };
        buttonStyles = { ...themedStyles.buttonDisabled, backgroundColor: theme.palette.ui08 };
    } else {
        buttonStyles = styles.button;
    }

    if (type === TERTIARY) {
        buttonLabelStyles = disabled
            ? themedStyles.buttonLabelTertiaryDisabled
            : themedStyles.buttonLabelTertiary;

        return (
            <TouchableHighlight
                accessibilityLabel = { t(accessibilityLabel ?? '') }
                disabled = { disabled }
                id = { id }
                onPress = { onPress }
                style = { [
                    buttonStyles,
                    style
                ] as StyleProp<object> }>
                <Text
                    style = { [
                        buttonLabelStyles,
                        labelStyle
                    ] as StyleProp<object> }>{ t(labelKey ?? '') }</Text>
            </TouchableHighlight>
        );
    }

    return (
        <NativeForegroundContext.Provider value = { foreground }>
            <NativePaperButton
                accessibilityLabel = { t(accessibilityLabel ?? '') }
                buttonColor = { color }
                children = { t(labelKey ?? '') }
                contentStyle = { [
                    styles.buttonContent,
                    contentStyle
                ] as StyleProp<object> }
                disabled = { disabled }
                icon = { icon as IconSource | undefined }
                id = { id }
                labelStyle = { [
                    buttonLabelStyles,
                    foreground && { color: foreground },
                    labelStyle
                ] as StyleProp<object> }
                mode = { mode }
                onPress = { onPress }
                style = { [
                    buttonStyles,
                    style
                ] as StyleProp<object> }
                textColor = { foreground } />
        </NativeForegroundContext.Provider>
    );
};

export default Button;
