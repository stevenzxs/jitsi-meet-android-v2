import { StyleSheet } from 'react-native';

import BaseTheme from '../base/ui/components/BaseTheme.native';

export default StyleSheet.create({
    screen: { flex: 1, backgroundColor: BaseTheme.palette.ui01 },
    content: { flexGrow: 1, padding: 20, gap: 12 },
    card: { padding: 16, gap: 12, borderRadius: 12, backgroundColor: BaseTheme.palette.ui02 },
    heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    title: { flex: 1, fontSize: 18, fontWeight: '600', color: BaseTheme.palette.text01 },
    status: { fontSize: 12, color: BaseTheme.palette.text02, backgroundColor: BaseTheme.palette.ui03,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
    live: { color: BaseTheme.palette.action01 },
    room: { fontSize: 15, color: BaseTheme.palette.text01 },
    footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
    detail: { fontSize: 13, color: BaseTheme.palette.text02 },
    empty: { paddingTop: 64, alignItems: 'center', gap: 16 },
    emptyTitle: { fontSize: 16, color: BaseTheme.palette.text02, textAlign: 'center' },
    message: { padding: 16, fontSize: 14, color: BaseTheme.palette.text02 }
});
