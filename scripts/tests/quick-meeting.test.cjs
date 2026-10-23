const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
test('only created meeting navigation skips prejoin and splash uses launcher icon', () => {
    const actions = fs.readFileSync('react/features/cloudmeet/actions.native.ts', 'utf8');
    assert.match(actions, /config\.prejoinConfig\.enabled=false/);
    const layout = fs.readFileSync('android/app/src/main/res/layout/launch_screen.xml', 'utf8');
    assert.match(layout, /android:src="@mipmap\/ic_launcher"/);
});
test('quick meeting overrides platform motion with opacity-only transitions', () => {
    const root = fs.readFileSync('react/features/mobile/navigation/components/RootNavigationContainer.tsx', 'utf8');
    const options = root.slice(root.indexOf('const quickMeetingScreenOptions'), root.indexOf('// Background SDK'));
    assert.match(options, /cardStyle: \{ opacity: current.progress \}/);
    assert.match(options, /headerStyleInterpolator:/);
    assert.match(options, /duration: 200/);
    assert.doesNotMatch(options, /translate|scale|transform:/);
});
test('quick meeting is a registered full screen instead of a welcome dialog', () => {
    const welcome = fs.readFileSync('react/features/welcome/components/WelcomePage.native.tsx', 'utf8');
    const root = fs.readFileSync('react/features/mobile/navigation/components/RootNavigationContainer.tsx', 'utf8');
    assert.match(welcome, /navigation.navigate\(screen.quickMeeting\)/);
    assert.doesNotMatch(welcome, /CreateMeetingDialog|createDialogVisible/);
    assert.match(root, /name = \{ screen.quickMeeting \}/);
});
test('quick meeting page has centered title, cancel header and existing business flow', () => {
    const path = 'react/features/cloudmeet/QuickMeetingPage.native.tsx';
    assert.ok(fs.existsSync(path), 'full quick meeting page must exist');
    const page = fs.readFileSync(path, 'utf8');
    assert.doesNotMatch(page, /\bModal\b/);
    assert.match(page, /headerTitleAlign: 'center'/);
    assert.match(page, /headerLeft:/);
    assert.match(page, /dialog.Cancel/);
    assert.match(page, /createMeeting\(draft/);
    assert.match(page, /enterCreatedMeeting\(url/);
    const lang = JSON.parse(fs.readFileSync('lang/main-zh-CN.json', 'utf8'));
    assert.equal(lang.cloudmeet.create, '快速会议');
});
