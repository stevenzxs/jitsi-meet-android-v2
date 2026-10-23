import React from 'react';
import { ViewStyle } from 'react-native';

import Icon from '../../../icons/components/Icon';
import styles from '../../../react/components/native/styles';
import { IIconButtonProps } from '../../../react/types';
import { useNativeTheme } from '../../NativeThemeContext';
import { BUTTON_TYPES } from '../../constants.native';
import BaseTheme from '../BaseTheme.native';

import { TouchableHighlight } from './ThemedPrimitives';


const IconButton: React.FC<IIconButtonProps> = ({
    accessibilityLabel,
    accessibilityRole = 'button',
    color: iconColor,
    disabled,
    id,
    onPress,
    size,
    src,
    style,
    tapColor,
    type
}: IIconButtonProps) => {
    const theme = useNativeTheme();
    const { DESTRUCTIVE, PRIMARY, SECONDARY, TERTIARY } = BUTTON_TYPES;

    let color;
    let underlayColor;
    let iconButtonContainerStyles;

    if (type === PRIMARY) {
        color = '#FFFFFF';
        iconButtonContainerStyles = styles.iconButtonContainerPrimary;
        underlayColor = theme.palette.action01;
    } else if (type === DESTRUCTIVE) {
        color = '#FFFFFF';
        iconButtonContainerStyles = [ styles.iconButtonContainerPrimary, { backgroundColor: theme.palette.actionDanger } ];
        underlayColor = theme.palette.actionDanger;
    } else if (type === SECONDARY) {
        color = theme.palette.icon04;
        iconButtonContainerStyles = [ styles.iconButtonContainerSecondary, { backgroundColor: theme.palette.action02 } ];
        underlayColor = theme.palette.action02Hover;
    } else if (type === TERTIARY) {
        color = iconColor;
        iconButtonContainerStyles = styles.iconButtonContainer;
        underlayColor = BaseTheme.palette.action03;
    } else {
        color = iconColor;
        underlayColor = tapColor;
    }

    if (disabled) {
        color = theme.palette.icon03;
        iconButtonContainerStyles = [ styles.iconButtonContainerDisabled, { backgroundColor: theme.palette.ui08 } ];
        underlayColor = 'transparent';
    }

    return (
        <TouchableHighlight
            accessibilityLabel = { accessibilityLabel }
            accessibilityRole = { accessibilityRole }
            disabled = { disabled }
            onPress = { onPress }
            style = { [
                iconButtonContainerStyles,
                style
            ] as ViewStyle[] }
            testID = { id }
            underlayColor = { underlayColor }>
            <Icon
                color = { color }
                size = { size ?? 20 }
                src = { src } />
        </TouchableHighlight>
    );
};

export default IconButton;
