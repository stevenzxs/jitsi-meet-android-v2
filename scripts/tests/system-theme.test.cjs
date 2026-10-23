const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('native system theme controls both bars and survives inset updates', () => {
    const modulePath = 'android/sdk/src/main/java/org/jitsi/meet/sdk/SystemThemeModule.java';
    assert.ok(fs.existsSync(modulePath), 'native system theme module exists');
    const source = fs.readFileSync(modulePath, 'utf8');
    for (const method of ['setAppearanceLightStatusBars', 'setAppearanceLightNavigationBars',
        'setNavigationBarColor', 'setStatusBarColor', 'onHostResume']) {
        assert.ok(source.includes(method), method);
    }
    const activity = fs.readFileSync('android/sdk/src/main/java/org/jitsi/meet/sdk/JitsiMeetActivity.java', 'utf8');
    assert.ok(!activity.includes('view.setBackgroundColor(JitsiMeetView.BACKGROUND_COLOR)'));
    assert.ok(activity.includes('SystemThemeModule.apply'));
});

test('theme selector uses sun and moon vectors with accessible labels', () => {
    const option = fs.readFileSync('react/features/settings/components/native/ThemeOption.tsx', 'utf8');
    assert.ok(option.includes('ThemeIcon'));
    assert.ok(option.includes('accessibilityLabel = { label }'));
    assert.ok(!option.includes('<Text'));
});

test('selected theme uses a blue icon, never a selected blue background', () => {
    const option = fs.readFileSync('react/features/settings/components/native/ThemeOption.tsx', 'utf8');
    assert.ok(option.includes('color = { selected ? theme.palette.action01 : theme.palette.text01 }'));
    assert.ok(option.includes('backgroundColor: theme.palette.ui02'));
    assert.ok(!option.includes('backgroundColor: selected'));
});
