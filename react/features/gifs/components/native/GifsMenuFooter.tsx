import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, TextStyle, ViewStyle } from 'react-native';

import { Text, View } from '../../../base/ui/components/native/ThemedPrimitives';

import styles from './styles';


/**
 * Implements the gifs menu footer component.
 *
 * @returns { JSX.Element} - The gifs menu footer component.
 */
const GifsMenuFooter = (): JSX.Element => {
    const { t } = useTranslation();

    return (
        <View style = { styles.credit as ViewStyle }>
            <Text style = { styles.creditText as TextStyle }>
                { t('poweredby') }
            </Text>
            <Image
                source = { require('../../../../../images/GIPHY_logo.png') } />
        </View>
    );
};

export default GifsMenuFooter;
