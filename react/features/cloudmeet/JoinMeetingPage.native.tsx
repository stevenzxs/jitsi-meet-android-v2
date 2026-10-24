import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { appNavigate } from '../app/actions.native';
import { IStore } from '../app/types';
import BaseTheme from '../base/ui/components/BaseTheme.native';
import Button from '../base/ui/components/native/Button';
import Input from '../base/ui/components/native/Input';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';
import { BUTTON_TYPES } from '../base/ui/constants.native';

import { stageJoinPassword } from './joinPassword.native';
import { joinMeeting } from './meetingService';

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
 * Validate an existing business meeting and enter without a second join screen.
 *
 * @returns {ReactElement} Join meeting page.
 */
export default function JoinMeetingPage({ navigation }: { navigation: StackNavigationProp<any>; }) {
    const { t } = useTranslation();
    const styles = useNativeScreenOptions(staticStyles);
    const dispatch = useDispatch<IStore['dispatch']>();
    const [ room, setRoom ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ busy, setBusy ] = useState(false);
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
            headerTitle: t('cloudmeet.join'),
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
        Keyboard.dismiss();
        let clearJoinPassword: (() => void) | undefined;

        try {
            const url = await joinMeeting(room, password);

            clearJoinPassword = stageJoinPassword(url, password);
            submitting.current = false;
            await dispatch(appNavigate(`${url}#config.prejoinConfig.enabled=false`));
        } catch (error) {
            clearJoinPassword?.();
            Alert.alert('加入会议失败', error instanceof Error ? error.message : '请检查网络后重试');
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    }, [ dispatch, password, room ]);

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
                            accessibilityLabel = '会议号'
                            autoCapitalize = 'none'
                            disabled = { busy }
                            label = '会议号'
                            onChange = { setRoom }
                            placeholder = '请输入九位会议号'
                            value = { room } />
                    </View>
                    <View>
                        <Input
                            disabled = { busy }
                            label = '会议密码（如有）'
                            onChange = { setPassword }
                            onSubmitEditing = { submit }
                            placeholder = '会议密码（如有）'
                            secureTextEntry = { true }
                            value = { password } />
                    </View>
                    <Button
                        accessibilityLabel = { t('cloudmeet.join') }
                        disabled = { busy || !room.trim() }
                        labelKey = { busy ? 'cloudmeet.joining' : 'cloudmeet.join' }
                        onClick = { submit }
                        type = { BUTTON_TYPES.PRIMARY } />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
