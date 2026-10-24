const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('scheduled meetings use themed pull-to-refresh instead of a refresh button', () => {
    const source = fs.readFileSync('react/features/cloudmeet/ScheduledMeetings.native.tsx', 'utf8');
    assert.doesNotMatch(source, /刷新预定会议|setRevision|TouchableOpacity/);
    assert.match(source, /<RefreshControl/);
    assert.match(source, /refreshing = \{ refreshing \}/);
    assert.match(source, /onRefresh = \{ refresh \}/);
    assert.match(source, /alwaysBounceVertical/);
    assert.match(source, /styles.refreshableContent/);
    assert.match(fs.readFileSync('react/features/cloudmeet/plannerStyles.native.ts', 'utf8'), /refreshableContent: \{ flexGrow: 1 \}/);
    assert.match(source, /theme.palette.action01/);
    assert.match(source, /session.loading/);
    assert.match(source, /finally\s*\{/);
    assert.match(source, /setRefreshing\(false\)/);
    assert.match(source, /session.active = false/);
    assert.match(source, /useFocusEffect/);
});

test('automatic schedule sync is silent while pull-to-refresh keeps its indicator', () => {
    const source = fs.readFileSync('react/features/cloudmeet/ScheduledMeetings.native.tsx', 'utf8');

    assert.match(source, /async \(showIndicator = true\)/);
    assert.match(source, /setRefreshing\(showIndicator\)/);
    assert.match(source, /void refresh\(false\)/);
    assert.doesNotMatch(source, /正在同步预定状态/);
    assert.match(source, /同步失败，以下为本机记录/);
});

test('scheduled meeting empty state uses a themed calendar and centered label', () => {
    const source = fs.readFileSync('react/features/cloudmeet/ScheduledMeetings.native.tsx', 'utf8');
    const styles = fs.readFileSync('react/features/cloudmeet/plannerStyles.native.ts', 'utf8');

    assert.match(source, /!message && !meetings.length &&/);
    assert.match(source, /style = \{ styles.emptyState \}/);
    assert.match(source, /color = \{ theme.palette.icon02 \}/);
    assert.match(source, /size = \{ 56 \}/);
    assert.match(source, /src = \{ IconCalendar \}/);
    assert.match(source, /暂无本机预定会议<\/Text>/);
    assert.doesNotMatch(source, /setMessage\('暂无本机预定会议'\)/);
    assert.match(styles, /emptyState: \{ alignItems: 'center', paddingTop: 64, gap: 16 \}/);
});
