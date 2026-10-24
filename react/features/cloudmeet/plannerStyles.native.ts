import { StyleSheet } from 'react-native';

import BaseTheme from '../base/ui/components/BaseTheme.native';

export default StyleSheet.create({
    screen: { flex: 1, backgroundColor: BaseTheme.palette.ui01 },
    panel: { padding: 24, gap: 20 },
    refreshableContent: { flexGrow: 1 },
    emptyState: { alignItems: 'center', paddingTop: 64, gap: 16 },
    emptyStateText: { color: BaseTheme.palette.text02, fontSize: 16, textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    label: { color: BaseTheme.palette.text01, fontSize: 16 },
    hint: { color: BaseTheme.palette.text02, fontSize: 14 },
    choice: { padding: 12, borderRadius: 8, backgroundColor: BaseTheme.palette.ui03, minHeight: 48, justifyContent: 'center' },
    selected: { borderWidth: 2, borderColor: BaseTheme.palette.action01 },
    cancel: { paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' },
    link: { color: BaseTheme.palette.link01, fontSize: 16 },
    card: { padding: 16, gap: 12, borderRadius: 12, backgroundColor: BaseTheme.palette.ui02 },
    title: { color: BaseTheme.palette.text01, fontSize: 18, fontWeight: '600' }
});
