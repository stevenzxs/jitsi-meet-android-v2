import React from 'react';
import { StyleProp, TextStyle } from 'react-native';

import { Text, View } from '../../../base/ui/components/native/ThemedPrimitives';

import { navigationStyles } from './styles';

interface ITabBarLabelCounterProps {
    activeUnreadNr?: boolean;
    isFocused: boolean;
    label: string;
    unreadCount?: number;
}

export const TabBarLabelCounter = ({ activeUnreadNr, isFocused, label, unreadCount }: ITabBarLabelCounterProps) => {
    const labelStyles = isFocused
        ? navigationStyles.unreadCounterDescriptionFocused
        : navigationStyles.unreadCounterDescription;

    return (
        <View
            style = {
                navigationStyles.unreadCounterContainer as StyleProp<TextStyle> }>
            <Text
                style = { labelStyles }>
                { label && label }
            </Text>
            {
                activeUnreadNr && (
                    <View
                        style = { navigationStyles.unreadCounterCircle as StyleProp<TextStyle> }>
                        <Text
                            style = { navigationStyles.unreadCounter as StyleProp<TextStyle> }>
                            { unreadCount }
                        </Text>
                    </View>
                )
            }
        </View>
    );
};
