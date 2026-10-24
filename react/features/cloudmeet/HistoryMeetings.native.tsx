import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { GestureResponderEvent, RefreshControl } from 'react-native';

import Icon from '../base/icons/components/Icon';
import { IconRestore } from '../base/icons/svg';
import { useNativeTheme } from '../base/ui/NativeThemeContext';
import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { FlatList, Text, View } from '../base/ui/components/native/ThemedPrimitives';

import HistoryMeetingCard from './HistoryMeetingCard.native';
import { IMeetingHistory, fetchMeetingHistory } from './historyService';
import staticStyles from './historyStyles.native';
import { getPlannerIdentity } from './scheduleStorage.native';

const meetingKey = (meeting: IMeetingHistory) => meeting.roomName;

/**
 * Display server history directly, independently of local attendance records.
 *
 * @param {Object} props - Existing list interaction props.
 * @returns {ReactElement} History list with silent focus sync and pull-to-refresh.
 */
export default function HistoryMeetings(props: {
    disabled: boolean;
    onListContainerPress?: (e?: GestureResponderEvent) => void;
}) {
    const styles = useNativeScreenOptions(staticStyles);
    const theme = useNativeTheme();
    const [ meetings, setMeetings ] = useState<IMeetingHistory[]>([]);
    const [ message, setMessage ] = useState('');
    const [ refreshing, setRefreshing ] = useState(false);
    const sessionRef = useRef({ active: false, loading: false });
    const renderMeeting = useCallback(({ item }: { item: IMeetingHistory; }) => (
        <HistoryMeetingCard
            disabled = { props.disabled }
            meeting = { item } />
    ), [ props.disabled ]);
    const refresh = useCallback(async (showIndicator = true) => {
        const session = sessionRef.current;

        if (!session.active || session.loading) {
            return;
        }
        session.loading = true;
        setRefreshing(showIndicator);
        try {
            const creatorId = await getPlannerIdentity();
            const records = await fetchMeetingHistory(creatorId);

            if (session.active) {
                setMeetings(records);
                setMessage('');
            }
        } catch (error) {
            session.active && setMessage(`同步失败，保留已有记录：${error instanceof Error ? error.message : '请检查网络'}`);
        } finally {
            session.loading = false;
            session.active && setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        const session = { active: true, loading: false };

        sessionRef.current = session;
        void refresh(false);

        return () => {
            session.active = false;
        };
    }, [ refresh ]));

    return (
        <View style = { styles.screen }>
            { Boolean(message) && <Text
                accessibilityRole = 'alert'
                style = { styles.message }>{ message }</Text> }
            <FlatList
                ListEmptyComponent = {
                    <View style = { styles.empty }>
                        <Icon
                            color = { theme.palette.icon02 }
                            size = { 56 }
                            src = { IconRestore } />
                        <Text style = { styles.emptyTitle }>{ message ? '暂时无法读取历史会议' : '暂无历史会议' }</Text>
                    </View>
                }
                contentContainerStyle = { styles.content }
                data = { meetings }
                extraData = { props.disabled }
                keyExtractor = { meetingKey }
                refreshControl = {
                    <RefreshControl
                        colors = { [ theme.palette.action01 ] }
                        onRefresh = { refresh }
                        progressBackgroundColor = { theme.palette.ui01 }
                        refreshing = { refreshing }
                        tintColor = { theme.palette.action01 } />
                }
                renderItem = { renderMeeting } />
        </View>
    );
}
