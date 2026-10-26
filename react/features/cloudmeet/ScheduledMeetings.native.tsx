/* eslint-disable react/jsx-no-bind */
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';

import { IStore } from '../app/types';
import Icon from '../base/icons/components/Icon';
import { IconCalendar } from '../base/icons/svg';
import { useNativeTheme } from '../base/ui/NativeThemeContext';
import Button from '../base/ui/components/native/Button';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, View } from '../base/ui/components/native/ThemedPrimitives';
import { BUTTON_MODES, BUTTON_TYPES } from '../base/ui/constants.native';

import { enterCreatedMeeting } from './actions.native';
import staticStyles from './plannerStyles.native';
import { cancelSchedule, scheduleInvite, withoutCancelled } from './scheduleActions';
import { IScheduleRow, IScheduledMeeting, fetchSchedules, scheduleRows, scheduledHostUrl } from './scheduleService';
import { getPlannerIdentity, persistSchedule, readPlanner } from './scheduleStorage.native';

/**
 * Installation-scoped schedules; server refresh errors remain visible.
 *
 * @returns {ReactElement} Scheduled meeting list.
 */
export default function ScheduledMeetings() {
    const styles = useNativeScreenOptions(staticStyles);
    const theme = useNativeTheme();
    const dispatch = useDispatch<IStore['dispatch']>();
    const [ meetings, setMeetings ] = useState<IScheduleRow[]>([]);
    const [ pending, setPending ] = useState<IScheduledMeeting[]>([]);
    const [ message, setMessage ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ refreshing, setRefreshing ] = useState(false);
    const [ copiedRoom, setCopiedRoom ] = useState('');
    const copyTimer = useRef<ReturnType<typeof setTimeout>>();
    const cancelled = useRef(new Set<string>());
    const operation = useRef(false);
    const refreshSession = useRef({ active: false, loading: false });

    useEffect(() => () => clearTimeout(copyTimer.current), []);

    const refresh = useCallback(async (showIndicator = true) => {
        const session = refreshSession.current;

        if (!session.active || session.loading) {
            return;
        }
        session.loading = true;
        setRefreshing(showIndicator);
        try {
            const creatorId = await getPlannerIdentity();
            const planner = await readPlanner();

            session.active && setPending(withoutCancelled(planner.meetings.filter(item => !item.saved), cancelled.current));
            if (!session.active) {
                return;
            }
            const records = await fetchSchedules(creatorId);
            const rows = scheduleRows(records, planner.meetings, creatorId);

            session.active && setMeetings(withoutCancelled(rows, cancelled.current));
            session.active && setPending(withoutCancelled(planner.meetings.filter(item => !item.saved
                && !records.some(record => record.creatorId === creatorId && record.roomName === item.roomName)), cancelled.current));
            session.active && setMessage('');
        } catch (error) {
            session.active && setMessage(`同步失败，保留已有记录：${error instanceof Error ? error.message : '请检查网络'}`);
        } finally {
            session.loading = false;
            session.active && setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        const session = { active: true, loading: false };

        refreshSession.current = session;
        void refresh(false);

        return () => {
            session.active = false;
        };
    }, [ refresh ]));

    const join = async (meeting: IScheduleRow) => {
        if (operation.current) {
            return;
        }
        operation.current = true;
        setBusy(true);
        try {
            const url = await scheduledHostUrl(meeting, meeting.displayName);

            await dispatch(enterCreatedMeeting(url, meeting.displayName));
        } catch (error) {
            Alert.alert('入会失败', error instanceof Error ? error.message : '请重试');
        } finally {
            operation.current = false;
            setBusy(false);
        }
    };
    const retry = async (meeting: IScheduledMeeting) => {
        if (operation.current) {
            return;
        }
        operation.current = true;
        setBusy(true);
        try {
            await persistSchedule(meeting);
            await refresh(false);
        } catch (error) {
            Alert.alert('预定确认失败', error instanceof Error ? error.message : '请重试');
        } finally {
            operation.current = false;
            setBusy(false);
        }
    };
    const copy = (meeting: IScheduleRow) => {
        if (operation.current || meeting.end <= Date.now()) {
            return;
        }
        try {
            Clipboard.setString(scheduleInvite(meeting));
            clearTimeout(copyTimer.current);
            setCopiedRoom(meeting.roomName);
            copyTimer.current = setTimeout(() => setCopiedRoom(''), 1800);
        } catch (_) {
            Alert.alert('复制失败', '无法写入剪贴板，请重试');
        }
    };
    const cancel = async (meeting: IScheduleRow) => {
        if (operation.current) {
            return;
        }
        operation.current = true;
        setBusy(true);
        try {
            await cancelSchedule(meeting);
            cancelled.current.add(meeting.roomName);
            setMeetings(rows => withoutCancelled(rows, cancelled.current));
            setPending(rows => withoutCancelled(rows, cancelled.current));
            await refresh(false);
        } catch (error) {
            Alert.alert('取消失败', error instanceof Error ? error.message : '请重试');
        } finally {
            operation.current = false;
            setBusy(false);
        }
    };
    const confirmCancel = (meeting: IScheduleRow) => {
        if (operation.current || !meeting.hostKey) {
            return;
        }
        Alert.alert('取消预定会议', `确定取消「${meeting.subject || '我的会议'}」吗？取消后会议将保留在历史记录中。`, [
            { text: '再想想', style: 'cancel' },
            { text: '取消会议', style: 'destructive', onPress: () => void cancel(meeting) }
        ]);
    };

    return (
        <ScrollView
            alwaysBounceVertical = { true }
            contentContainerStyle = { [ styles.panel, styles.refreshableContent ] }
            refreshControl = {
                <RefreshControl
                    colors = { [ theme.palette.action01 ] }
                    onRefresh = { refresh }
                    progressBackgroundColor = { theme.palette.ui01 }
                    refreshing = { refreshing }
                    tintColor = { theme.palette.action01 } />
            }
            style = { styles.screen }>
            { Boolean(message) && <Text style = { styles.hint }>{ message }</Text> }
            { !message && !meetings.length && !pending.length && (
                <View style = { styles.emptyState }>
                    <Icon
                        color = { theme.palette.icon02 }
                        size = { 56 }
                        src = { IconCalendar } />
                    <Text style = { styles.emptyStateText }>暂无预定会议</Text>
                </View>
            ) }
            { meetings.map(meeting => (
                <View
                    key = { meeting.roomName }
                    style = { styles.card }>
                    <Text style = { styles.title }>{ meeting.subject || '我的会议' }</Text>
                    <Text
                        selectable = { true }
                        style = { styles.label }>会议号：{ meeting.roomName }</Text>
                    <Text style = { styles.label }>{ new Date(meeting.start).toLocaleString() } · { meeting.durationMinutes }分钟</Text>
                    <Text style = { styles.hint }>已预定</Text>
                    { !meeting.hostKey && <Text style = { styles.hint }>本机未保存主持人密钥，无法以主持人身份加入。</Text> }
                    <View style = { styles.row }>
                        <Button
                            disabled = { busy || !meeting.hostKey || meeting.end <= Date.now() }
                            labelKey = 'cloudmeet.enter'
                            onClick = { () => join(meeting) }
                            type = { BUTTON_TYPES.PRIMARY } />
                        <Button
                            disabled = { busy || meeting.end <= Date.now() }
                            labelKey = { copiedRoom === meeting.roomName ? 'cloudmeet.copied' : 'cloudmeet.copyInvite' }
                            onClick = { () => copy(meeting) }
                            type = { BUTTON_TYPES.SECONDARY } />
                        <Button
                            disabled = { busy || !meeting.hostKey }
                            labelKey = 'cloudmeet.cancelSchedule'
                            mode = { BUTTON_MODES.TEXT }
                            onClick = { () => confirmCancel(meeting) }
                            type = { BUTTON_TYPES.DESTRUCTIVE } />
                    </View>
                </View>
            )) }
            { Boolean(pending.length) && <Text style = { styles.title }>待确认预定</Text> }
            { pending.map(meeting => (
                <View
                    key = { `pending-${meeting.roomName}` }
                    style = { styles.card }>
                    <Text style = { styles.title }>{ meeting.subject || '我的会议' }</Text>
                    <Text style = { styles.label }>会议号：{ meeting.roomName }</Text>
                    <Text style = { styles.hint }>保存结果待确认。重试先验证原会议，仅服务端明确不存在时才重新提交。</Text>
                    <Button
                        disabled = { busy }
                        labelKey = 'cloudmeet.retrySchedule'
                        onClick = { () => retry(meeting) }
                        type = { BUTTON_TYPES.SECONDARY } />
                </View>
            )) }
        </ScrollView>
    );
}
