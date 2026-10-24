const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('history empty state uses a themed history icon and one label matching schedules', () => {
    const source = fs.readFileSync('react/features/cloudmeet/HistoryMeetings.native.tsx', 'utf8');
    const styles = fs.readFileSync('react/features/cloudmeet/historyStyles.native.ts', 'utf8');
    assert.match(source, /color = \{ theme.palette.icon02 \}\s*size = \{ 56 \}\s*src = \{ IconRestore \}/);
    assert.match(source, /暂无历史会议/);
    assert.doesNotMatch(source, /本机身份创建过的历史会议会显示在这里/);
    assert.match(styles, /empty: \{ paddingTop: 64, alignItems: 'center', gap: 16 \}/);
    assert.match(styles, /emptyTitle: \{ fontSize: 16, color: BaseTheme.palette.text02, textAlign: 'center' \}/);
});
