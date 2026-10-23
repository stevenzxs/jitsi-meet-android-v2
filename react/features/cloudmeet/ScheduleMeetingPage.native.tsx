/* eslint-disable react/jsx-no-bind */
import Clipboard from '@react-native-clipboard/clipboard';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, KeyboardAvoidingView, NativeModules, Platform, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState, IStore } from '../app/types';
import { useNativeTheme } from '../base/ui/NativeThemeContext';
import Button from '../base/ui/components/native/Button';
import Input from '../base/ui/components/native/Input';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';
import { BUTTON_TYPES } from '../base/ui/constants.native';

import { enterCreatedMeeting } from './actions.native';
import { newMeetingDraft } from './meetingService';
import staticStyles from './plannerStyles.native';
import { DURATIONS, IScheduledMeeting, scheduledHostUrl } from './scheduleService';
import { persistSchedule, randomBytes } from './scheduleStorage.native';

/**
 * Future meeting form backed by the official scheduling API.
 *
 * @returns {ReactElement} Schedule page.
 */
export default function ScheduleMeetingPage({ navigation }: { navigation: StackNavigationProp<any>; }) {
    const { t } = useTranslation();
    const theme = useNativeTheme();
    const styles = useNativeScreenOptions(staticStyles);
    const dispatch = useDispatch<IStore['dispatch']>();
    const displayName = useSelector((state: IReduxState) => state['features/base/settings'].displayName || '');
    const [ name, setName ] = useState(displayName);
    const [ subject, setSubject ] = useState('');
    const [ start, setStart ] = useState(() => Math.ceil((Date.now() + 60000) / 900000) * 900000);
    const [ duration, setDuration ] = useState(60);
    const [ enabled, setEnabled ] = useState(false);
    const [ password, setPassword ] = useState('');
    const [ visible, setVisible ] = useState(false);
    const [ draft ] = useState(() => newMeetingDraft(randomBytes));
    const [ busy, setBusy ] = useState(false);
    const [ frozen, setFrozen ] = useState<IScheduledMeeting>();
    const [ saved, setSaved ] = useState(false);
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
            <Text style = { styles.link }>{ t('dialog.Cancel') }</Text>
        </TouchableOpacity>
    ), [ busy, close, styles, t ]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: t('cloudmeet.schedule'), headerTitleAlign: 'center', headerLeft: renderCancel,
            headerTitleContainerStyle: {
                position: 'absolute', left: 64, right: 64, top: 0, bottom: 0,
                alignItems: 'center', justifyContent: 'center', marginHorizontal: 0
            }
        });

        return navigation.addListener('beforeRemove', event => {
            if (submitting.current) {
                event.preventDefault();
            }
        });
    }, [ navigation, renderCancel, t ]);
    const roll = () => setPassword(Array.from(randomBytes(new Uint8Array(6)), value => String(value % 10)).join(''));
    const pick = async (date: boolean) => {
        try {
            const result = await NativeModules.MeetingPlanner.pick(start, date, !theme.dark);

            result !== null && setStart(result);
        } catch (error) {
            Alert.alert('选择时间失败', error instanceof Error ? error.message : '请重试');
        }
    };
    const submit = async (join: boolean) => {
        if (submitting.current) {
            return;
        }
        if (!frozen && (start <= Date.now() || !name.trim() || (enabled && !password.trim()))) {
            Alert.alert('请检查预定信息', '请填写昵称、未来的开始时间，以及启用后的入会密码');

            return;
        }
        submitting.current = true;
        setBusy(true);
        Keyboard.dismiss();
        const meeting = frozen || { ...draft, subject, displayName: name.trim(), start, durationMinutes: duration,
            password: enabled ? password.trim() : '', saved: false };

        setFrozen(meeting);
        try {
            await persistSchedule(meeting);
            setSaved(true);
            if (join) {
                const url = await scheduledHostUrl(meeting, meeting.displayName);

                submitting.current = false;
                await dispatch(enterCreatedMeeting(url, meeting.displayName));
            } else {
                submitting.current = false;
                navigation.goBack();
                Alert.alert('预定成功', `会议号：${meeting.roomName}\n可在底部“预定会议”中查看`);
            }
        } catch (error) {
            Alert.alert('预定或入会未完成', error instanceof Error ? error.message : '请检查网络后重试');
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    };
    const date = new Date(start);
    const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const timeText = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    return (
        <SafeAreaView
            edges = { [ 'bottom', 'left', 'right' ] }
            style = { styles.screen }>
            <KeyboardAvoidingView
                behavior = { Platform.OS === 'ios' ? 'padding' : undefined }
                style = { styles.screen }>
                <ScrollView
                    contentContainerStyle = { styles.panel }
                    keyboardShouldPersistTaps = 'handled'>
                    <Input
                        disabled = { Boolean(frozen) }
                        label = '会议主题（可选）'
                        maxLength = { 40 }
                        onChange = { setSubject }
                        placeholder = '例如：项目周会'
                        value = { subject } />
                    <Input
                        disabled = { Boolean(frozen) }
                        label = '昵称'
                        maxLength = { 20 }
                        onChange = { setName }
                        placeholder = '请输入昵称'
                        value = { name } />
                    <Text style = { styles.label }>开始时间</Text>
                    <View style = { styles.row }>
                        <TouchableOpacity
                            accessibilityRole = 'button'
                            disabled = { Boolean(frozen) }
                            onPress = { () => pick(true) }
                            style = { styles.choice }>
                            <Text style = { styles.label }>{ dateText }</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole = 'button'
                            disabled = { Boolean(frozen) }
                            onPress = { () => pick(false) }
                            style = { styles.choice }>
                            <Text style = { styles.label }>{ timeText }</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style = { styles.label }>会议时长</Text>
                    <View style = { styles.row }>
                        { DURATIONS.map(value => (
                            <TouchableOpacity
                                accessibilityRole = 'button'
                                accessibilityState = {{ selected: value === duration }}
                                disabled = { Boolean(frozen) }
                                key = { value }
                                onPress = { () => setDuration(value) }
                                style = { [ styles.choice, value === duration && styles.selected ] }>
                                <Text style = { styles.label }>{ value < 60 ? `${value}分钟` : `${value / 60}小时` }</Text>
                            </TouchableOpacity>
                        )) }
                    </View>
                    <View style = { styles.row }>
                        <Text style = { styles.label }>入会密码</Text>
                        <Switch
                            accessibilityLabel = '启用入会密码'
                            disabled = { Boolean(frozen) }
                            onValueChange = { value => {
                                setEnabled(value);
                                value ? roll() : setPassword('');
                            } }
                            value = { enabled } />
                    </View>
                    { enabled && <View style = { styles.panel }>
                        <Input
                            disabled = { Boolean(frozen) }
                            label = '入会密码'
                            maxLength = { 16 }
                            onChange = { setPassword }
                            secureTextEntry = { !visible }
                            value = { password } />
                        <View style = { styles.row }>
                            <TouchableOpacity
                                accessibilityRole = 'button'
                                disabled = { Boolean(frozen) }
                                onPress = { roll }
                                style = { styles.choice }>
                                <Text style = { styles.link }>随机</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                accessibilityRole = 'button'
                                onPress = { () => setVisible(!visible) }
                                style = { styles.choice }>
                                <Text style = { styles.link }>{ visible ? '隐藏密码' : '显示密码' }</Text>
                            </TouchableOpacity>
                        </View>
                    </View> }
                    <Text style = { styles.label }>主持人密钥</Text>
                    <Text
                        selectable = { true }
                        style = { styles.label }>{ draft.hostKey }</Text>
                    <TouchableOpacity
                        accessibilityRole = 'button'
                        onPress = { () => {
                            Clipboard.setString(draft.hostKey);
                            Alert.alert('已复制');
                        } }
                        style = { styles.choice }>
                        <Text style = { styles.link }>复制密钥</Text>
                    </TouchableOpacity>
                    <Text style = { styles.hint }>请妥善保管，泄露密钥等于授予主持人权限。本机凭据加密保存，清除应用数据后无法恢复。</Text>
                    { frozen && <Text style = { styles.hint }>{ saved ? '已预定，可重试加入或返回列表。' : '提交后信息已锁定，重试将核对原会议，避免重复预定。' }</Text> }
                    <Button
                        disabled = { busy || !name.trim() }
                        labelKey = { busy ? 'cloudmeet.saving' : saved ? 'cloudmeet.backToList' : 'cloudmeet.schedule' }
                        onClick = { () => submit(false) }
                        type = { BUTTON_TYPES.SECONDARY } />
                    <Button
                        disabled = { busy || !name.trim() }
                        labelKey = { busy ? 'cloudmeet.saving' : 'cloudmeet.scheduleAndJoin' }
                        onClick = { () => submit(true) }
                        type = { BUTTON_TYPES.PRIMARY } />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
