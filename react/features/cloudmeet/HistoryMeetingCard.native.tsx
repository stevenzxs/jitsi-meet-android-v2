import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useDispatch } from 'react-redux';

import { appNavigate } from '../app/actions';
import { IStore } from '../app/types';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';

import { IMeetingHistory, historyLines, historyStatus } from './historyService';
import staticStyles from './historyStyles.native';
import { joinMeeting, postMeetingApi } from './meetingService';
import { readMeetingHostKey } from './scheduleStorage.native';

/**
 * Avatar-free server history card; only running meetings can be entered.
 *
 * @param {Object} props - Server record and interaction state.
 * @returns {ReactElement} Three-row meeting card.
 */
export default function HistoryMeetingCard({ meeting, disabled }: { disabled: boolean; meeting: IMeetingHistory; }) {
    const styles = useNativeScreenOptions(staticStyles);
    const dispatch = useDispatch<IStore['dispatch']>();
    const [ now, setNow ] = useState(Date.now);
    const [ joining, setJoining ] = useState(false);
    const entering = useRef(false);
    const lines = historyLines(meeting, now);
    const running = historyStatus(meeting, now) === 'RUNNING';

    useEffect(() => {
        const end = Date.parse(meeting.scheduledEndTime || '');
        const update = () => setNow(Date.now());
        const timer = Number.isFinite(end) && end > Date.now()
            ? setTimeout(update, Math.min(end - Date.now() + 1, 2147483647)) : undefined;
        const subscription = AppState.addEventListener('change', state => state === 'active' && update());

        return () => {
            clearTimeout(timer);
            subscription.remove();
        };
    }, [ meeting.scheduledEndTime, now ]);

    const join = useCallback(async () => {
        if (disabled || entering.current || historyStatus(meeting) !== 'RUNNING') {
            setNow(Date.now());

            return;
        }
        entering.current = true;
        setJoining(true);
        try {
            const url = await joinMeeting(meeting.roomName, '', postMeetingApi, readMeetingHostKey);

            if (historyStatus(meeting) === 'RUNNING') {
                dispatch(appNavigate(url));
            }
        } catch (error) {
            Alert.alert('无法进入会议', error instanceof Error ? error.message : '请刷新历史记录后重试');
        } finally {
            entering.current = false;
            setJoining(false);
            setNow(Date.now());
        }
    }, [ disabled, dispatch, meeting ]);
    const showActions = useCallback(() => {
        if (!disabled) {
            Alert.alert(meeting.subject || '未命名会议', lines.join('\n'), [
                { text: '复制会议号', onPress: () => Clipboard.setString(meeting.roomName) },
                { text: '取消', style: 'cancel' }
            ]);
        }
    }, [ disabled, lines, meeting ]);

    return (
        <TouchableOpacity
            accessibilityLabel = { `${meeting.subject || '未命名会议'}，${lines[1]}` }
            accessibilityRole = 'button'
            disabled = { disabled || joining }
            onLongPress = { showActions }
            onPress = { running ? join : showActions }
            style = { styles.card }>
            <View style = { styles.heading }>
                <Text
                    numberOfLines = { 2 }
                    style = { styles.title }>{ meeting.subject || '未命名会议' }</Text>
                <Text style = { [ styles.status, running && styles.live ] }>{ lines[1].replace('会议状态：', '') }</Text>
            </View>
            <Text style = { styles.room }>会议号  { meeting.roomName.replace(/(\d{3})(?=\d)/g, '$1 ') }</Text>
            <View style = { styles.footer }>
                <Text style = { styles.detail }>{ lines[2].replace('计划时间：', '计划 ') }</Text>
                <Text style = { styles.detail }>{ lines[3].replace('计划时长：', '计划时长 ') }</Text>
            </View>
        </TouchableOpacity>
    );
}
