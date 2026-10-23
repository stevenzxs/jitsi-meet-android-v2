import 'react-native-get-random-values';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState, IStore } from '../app/types';
import BaseTheme from '../base/ui/components/BaseTheme.native';
import Button from '../base/ui/components/native/Button';
import Input from '../base/ui/components/native/Input';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';
import { BUTTON_TYPES } from '../base/ui/constants.native';

import { enterCreatedMeeting } from './actions.native';
import { IMeetingDraft, createMeeting, newMeetingDraft } from './meetingService';

// Styles are consumed through the reactive theme resolver below.
/* eslint-disable react-native/no-unused-styles */
const staticStyles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BaseTheme.palette.ui01 },
    keyboard: { flex: 1 },
    panel: { padding: 24, gap: 24 },
    cancel: { paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' },
    cancelText: { fontSize: 16, color: BaseTheme.palette.link01 }
});
/* eslint-enable react-native/no-unused-styles */

/**
 * Full-screen quick meeting form with the existing native creation flow.
 *
 * @returns {ReactElement} Quick meeting page.
 */
export default function QuickMeetingPage({ navigation }: {
    navigation: StackNavigationProp<any>;
}) {
    const { t } = useTranslation();
    const styles = useNativeScreenOptions(staticStyles);
    const dispatch = useDispatch<IStore['dispatch']>();
    const displayName = useSelector((state: IReduxState) => state['features/base/settings'].displayName || '');
    const [ name, setName ] = useState(displayName);
    const [ subject, setSubject ] = useState('');
    const [ draft ] = useState<IMeetingDraft>(() => newMeetingDraft(bytes =>
        (globalThis as unknown as { crypto: { getRandomValues: (value: Uint8Array) => Uint8Array; }; })
            .crypto.getRandomValues(bytes)));
    const [ busy, setBusy ] = useState(false);
    const [ meetingUrl, setMeetingUrl ] = useState<string>();
    const [ locked, setLocked ] = useState(false);
    const submitting = useRef(false);
    const close = useCallback(() => {
        if (!submitting.current) {
            navigation.goBack();
        }
    }, [ navigation ]);
    const renderCancel = useCallback(() => (
        <TouchableOpacity
            accessibilityRole = 'button'
            disabled = { busy }
            onPress = { close }
            style = { styles.cancel }>
            <Text style = { styles.cancelText }>{ t('dialog.Cancel') }</Text>
        </TouchableOpacity>
    ), [ busy, close, styles, t ]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: t('cloudmeet.create'),
            headerTitleAlign: 'center',
            headerTitleContainerStyle: {
                position: 'absolute', left: 64, right: 64, top: 0, bottom: 0,
                alignItems: 'center', justifyContent: 'center', marginHorizontal: 0
            },
            headerLeft: renderCancel
        });

        return navigation.addListener('beforeRemove', event => {
            if (submitting.current) {
                event.preventDefault();
            }
        });
    }, [ navigation, renderCancel, t ]);
    const submit = useCallback(async () => {
        if (submitting.current) {
            return;
        }
        submitting.current = true;
        setBusy(true);
        setLocked(true);
        try {
            const url = meetingUrl || await createMeeting(draft, { displayName: name, subject });

            setMeetingUrl(url);
            submitting.current = false;
            await dispatch(enterCreatedMeeting(url, name.trim()));
        } catch (error) {
            Alert.alert('快速会议失败', error instanceof Error ? error.message : '请检查网络后重试');
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    }, [ dispatch, draft, meetingUrl, name, subject ]);

    return (
        <SafeAreaView
            edges = { [ 'bottom', 'left', 'right' ] }
            style = { styles.screen }>
            <KeyboardAvoidingView
                behavior = { Platform.OS === 'ios' ? 'padding' : undefined }
                style = { styles.keyboard }>
                <ScrollView
                    contentContainerStyle = { styles.panel }
                    keyboardShouldPersistTaps = 'handled'>
                    <View>
                        <Input
                            disabled = { locked }
                            label = '会议主题（可选）'
                            maxLength = { 40 }
                            onChange = { setSubject }
                            placeholder = '会议主题（可选）'
                            value = { subject } />
                    </View>
                    <View>
                        <Input
                            disabled = { locked }
                            label = '昵称'
                            maxLength = { 20 }
                            onChange = { setName }
                            placeholder = '请输入昵称'
                            value = { name } />
                    </View>
                    <Button
                        accessibilityLabel = { t('cloudmeet.create') }
                        disabled = { busy || !name.trim() }
                        labelKey = { busy ? 'cloudmeet.creating' : 'cloudmeet.create' }
                        onClick = { submit }
                        type = { BUTTON_TYPES.PRIMARY } />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
