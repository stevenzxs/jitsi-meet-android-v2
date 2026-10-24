import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewStyle } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import i18next, { DEFAULT_LANGUAGE } from '../../../base/i18n/i18next';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowRight } from '../../../base/icons/svg';
import { updateSettings } from '../../../base/settings/actions';
import { useNativeTheme } from '../../../base/ui/NativeThemeContext';
import Switch from '../../../base/ui/components/native/Switch';
import { Text, TouchableHighlight, View } from '../../../base/ui/components/native/ThemedPrimitives';
import { navigate } from '../../../mobile/navigation/components/settings/SettingsNavigationContainerRef';
import { screen } from '../../../mobile/navigation/routes';

import FormRow from './FormRow';
import FormSection from './FormSection';
import ThemeSelect from './ThemeSelect';
import styles from './styles';


const GeneralSection = () => {
    const { t } = useTranslation();
    const theme = useNativeTheme();
    const dispatch = useDispatch();
    const {
        disableSelfView,
    } = useSelector((state: IReduxState) => state['features/base/settings']);

    const { language = DEFAULT_LANGUAGE } = i18next;

    const onSelfViewToggled = useCallback((enabled?: boolean) =>
        dispatch(updateSettings({ disableSelfView: enabled }))
    , [ dispatch, updateSettings ]);

    const navigateToLanguageSelect = useCallback(() => {
        navigate(screen.settings.language);
    }, [ navigate, screen ]);

    const languageAccessibilityLabel = `${t('settings.language')}, ${t(`languages:${language}`)}`;

    return (
        <FormSection>
            <FormRow label = 'settings.theme'>
                <ThemeSelect />
            </FormRow>
            <FormRow label = 'videothumbnail.hideSelfView'>
                <Switch
                    checked = { Boolean(disableSelfView) }
                    onChange = { onSelfViewToggled } />
            </FormRow>
            <FormRow label = 'settings.language'>
                <View style = { styles.languageButtonContainer as ViewStyle }>
                    <TouchableHighlight
                        accessibilityLabel = { languageAccessibilityLabel }
                        accessibilityRole = 'button'
                        onPress = { navigateToLanguageSelect }
                        underlayColor = { theme.palette.ui03 }>
                        <View style = { styles.languageButton as ViewStyle }>
                            <Text
                                style = { styles.languageText }>{t(`languages:${language}`)}</Text>
                            <Icon
                                size = { 24 }
                                src = { IconArrowRight } />
                        </View>
                    </TouchableHighlight>
                </View>
            </FormRow>
        </FormSection>
    );
};

export default GeneralSection;
