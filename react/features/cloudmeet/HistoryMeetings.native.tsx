import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

import { useNativeScreenOptions } from '../base/ui/components/native/ThemedNavigation';
import { Text, View } from '../base/ui/components/native/ThemedPrimitives';
import RecentList from '../recent-list/components/RecentList.native';

import { IMeetingHistory, fetchMeetingHistory } from './historyService';
import staticStyles from './plannerStyles.native';
import { getPlannerIdentity } from './scheduleStorage.native';

/**
 * Enhance local history with installation-scoped server meeting facts.
 *
 * @param {Object} props - Existing list interaction props.
 * @returns {ReactElement} History list with silent focus sync and pull-to-refresh.
 */
export default function HistoryMeetings(props: {
    disabled: boolean;
    onListContainerPress?: (e?: GestureResponderEvent) => void;
}) {
    const styles = useNativeScreenOptions(staticStyles);
    const [ meetings, setMeetings ] = useState<IMeetingHistory[]>([]);
    const [ message, setMessage ] = useState('');
    const [ refreshing, setRefreshing ] = useState(false);
    const sessionRef = useRef({ active: false, loading: false });
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
                style = { styles.hint }>{ message }</Text> }
            <RecentList
                { ...props }
                meetings = { meetings }
                onRefresh = { refresh }
                refreshing = { refreshing } />
        </View>
    );
}
