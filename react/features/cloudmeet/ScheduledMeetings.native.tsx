/* eslint-disable react/jsx-no-bind */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';

import { IStore } from '../app/types';
import Icon from '../base/icons/components/Icon';
import { IconCalendar } from '../base/icons/svg';
import { useNativeTheme } from '../base/ui/NativeThemeContext';
import Button from '../base/ui/components/native/Button';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, View } from '../base/ui/components/native/ThemedPrimitives';
import { BUTTON_TYPES } from '../base/ui/constants.native';

import { enterCreatedMeeting } from './actions.native';
import staticStyles from './plannerStyles.native';
import { IScheduledMeeting, fetchSchedules, scheduledHostUrl } from './scheduleService';
import { persistSchedule, readPlanner } from './scheduleStorage.native';

/**
 * Installation-scoped schedules; server refresh errors remain visible.
 *
 * @returns {ReactElement} Scheduled meeting list.
 */
export default function ScheduledMeetings() {
    const styles = useNativeScreenOptions(staticStyles);
    const theme = useNativeTheme();
    const dispatch = useDispatch<IStore['dispatch']>();
    const [ meetings, setMeetings ] = useState<IScheduledMeeting[]>([]);
    const [ message, setMessage ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ refreshing, setRefreshing ] = useState(false);
    const refreshSession = useRef({ active: false, loading: false });

    const refresh = useCallback(async (showIndicator = true) => {
        const session = refreshSession.current;

        if (!session.active || session.loading) {
            return;
        }
        session.loading = true;
        setRefreshing(showIndicator);
        try {
            const planner = await readPlanner();
            const current = planner.meetings.filter(item => item.start + item.durationMinutes * 60000 > Date.now());

            session.active && setMeetings(current);
            if (!current.length) {
                session.active && setMessage('');

                return;
            }
            if (!session.active) {
                return;
            }
            const records = await fetchSchedules(planner.creatorId);
            const ids = new Set(records.map(item => item.roomName));

            session.active && setMeetings(current.filter(item => !item.saved || ids.has(item.roomName)));
            session.active && setMessage('');
        } catch (error) {
            session.active && setMessage(`同步失败，以下为本机记录：${error instanceof Error ? error.message : '请检查网络'}`);
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

    const join = async (meeting: IScheduledMeeting) => {
        if (busy) {
            return;
        }
        setBusy(true);
        try {
            await persistSchedule(meeting);
            const url = await scheduledHostUrl(meeting, meeting.displayName);

            await dispatch(enterCreatedMeeting(url, meeting.displayName));
        } catch (error) {
            Alert.alert('入会失败', error instanceof Error ? error.message : '请重试');
        } finally {
            setBusy(false);
        }
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
            { !message && !meetings.length && (
                <View style = { styles.emptyState }>
                    <Icon
                        color = { theme.palette.icon02 }
                        size = { 56 }
                        src = { IconCalendar } />
                    <Text style = { styles.emptyStateText }>暂无本机预定会议</Text>
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
                    { !meeting.saved && <Text style = { styles.hint }>保存结果待确认，点击重试会先核对服务端，不会直接创建新会议。</Text> }
                    <Button
                        disabled = { busy }
                        labelKey = { meeting.saved ? 'cloudmeet.joinAsHost' : 'cloudmeet.retrySchedule' }
                        onClick = { () => join(meeting) }
                        type = { BUTTON_TYPES.PRIMARY } />
                </View>
            )) }
        </ScrollView>
    );
}
