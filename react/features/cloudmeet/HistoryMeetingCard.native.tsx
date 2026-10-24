import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';

import { appNavigate } from '../app/actions';
import { IStore } from '../app/types';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, TouchableOpacity, View } from '../base/ui/components/native/ThemedPrimitives';

import { IMeetingHistory, historyLines } from './historyService';
import staticStyles from './historyStyles.native';
import { CLOUDMEET_ORIGIN } from './meetingService';

/**
 * Avatar-free server history card; only running meetings can be entered.
 *
 * @param {Object} props - Server record and interaction state.
 * @returns {ReactElement} Three-row meeting card.
 */
export default function HistoryMeetingCard({ meeting, disabled }: { disabled: boolean; meeting: IMeetingHistory; }) {
    const styles = useNativeScreenOptions(staticStyles);
    const dispatch = useDispatch<IStore['dispatch']>();
    const lines = historyLines(meeting);
    const join = useCallback(() => {
        if (!disabled && meeting.status === 'RUNNING') {
            dispatch(appNavigate(`${CLOUDMEET_ORIGIN}/${meeting.roomName}`));
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
            disabled = { disabled }
            onLongPress = { showActions }
            onPress = { meeting.status === 'RUNNING' ? join : showActions }
            style = { styles.card }>
            <View style = { styles.heading }>
                <Text
                    numberOfLines = { 2 }
                    style = { styles.title }>{ meeting.subject || '未命名会议' }</Text>
                <Text style = { [ styles.status, meeting.status === 'RUNNING' && styles.live ] }>{ lines[1].replace('会议状态：', '') }</Text>
            </View>
            <Text style = { styles.room }>会议号  { meeting.roomName.replace(/(\d{3})(?=\d)/g, '$1 ') }</Text>
            <View style = { styles.footer }>
                <Text style = { styles.detail }>{ lines[2].replace('计划时间：', '计划 ') }</Text>
                <Text style = { styles.detail }>{ lines[3].replace('计划时长：', '计划时长 ') }</Text>
            </View>
        </TouchableOpacity>
    );
}
