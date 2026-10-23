import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import Icon from '../../../base/icons/components/Icon';
import { IconRaiseHand } from '../../../base/icons/svg';
import { View } from '../../../base/ui/components/native/ThemedPrimitives';

import styles from './styles';

export const RaisedHandIndicator = () => (
    <View style = { styles.raisedHandIndicator as StyleProp<ViewStyle> }>
        <Icon
            size = { 16 }
            src = { IconRaiseHand }
            style = { styles.raisedHandIcon } />
    </View>
);
