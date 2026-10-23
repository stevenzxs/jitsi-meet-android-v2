/* eslint-disable react/jsx-no-bind */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';

import { IStore } from '../app/types';
import Button from '../base/ui/components/native/Button';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';
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
    const dispatch = useDispatch<IStore['dispatch']>();
    const [ meetings, setMeetings ] = useState<IScheduledMeeting[]>([]);
    const [ message, setMessage ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ revision, setRevision ] = useState(0);

    useFocusEffect(useCallback(() => {
        let active = true;

        (async () => {
            try {
                const planner = await readPlanner();
                const current = planner.meetings.filter(item => item.start + item.durationMinutes * 60000 > Date.now());

                active && setMeetings(current);
                if (!current.length) {
                    active && setMessage('暂无本机预定会议');

                    return;
                }
                active && setMessage('正在同步预定状态…');
                const records = await fetchSchedules(planner.creatorId);
                const ids = new Set(records.map(item => item.roomName));

                active && setMeetings(current.filter(item => !item.saved || ids.has(item.roomName)));
                active && setMessage('');
            } catch (error) {
                active && setMessage(`同步失败，以下为本机记录：${error instanceof Error ? error.message : '请检查网络'}`);
            }
        })();

        return () => {
            active = false;
        };
    }, [ revision ]));

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
            contentContainerStyle = { styles.panel }
            style = { styles.screen }>
            <TouchableOpacity
                accessibilityRole = 'button'
                onPress = { () => setRevision(revision + 1) }
                style = { styles.choice }>
                <Text style = { styles.link }>刷新预定会议</Text>
            </TouchableOpacity>
            { Boolean(message) && <Text style = { styles.hint }>{ message }</Text> }
            { !message && !meetings.length && <Text style = { styles.hint }>暂无预定会议</Text> }
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
