const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('welcome tabs suppress press backgrounds and use theme blue for selected labels and icons', () => {
    const options = fs.readFileSync('react/features/welcome/constants.tsx', 'utf8');
    const tabs = fs.readFileSync('react/features/mobile/navigation/components/welcome/components/WelcomePageTabs.tsx', 'utf8');
    const icon = fs.readFileSync('react/features/welcome/components/TabIcon.tsx', 'utf8');

    assert.match(options, /tabBarButton:[\s\S]*<PlatformPressable[\s\S]*\{ \.\.\.props \}[\s\S]*pressColor = 'transparent'[\s\S]*pressOpacity = \{ 1 \}/);
    assert.match(options, /tabBarActiveBackgroundColor: 'transparent'/);
    assert.match(options, /tabBarInactiveBackgroundColor: 'transparent'/);
    assert.match(tabs, /tabBarActiveTintColor: theme.palette.action01/);
    assert.match(icon, /focused \? theme.palette.action01 : INACTIVE_TAB_COLOR/);
    assert.match(tabs, /onSettingsScreenFocused\(true\)/);
    assert.match(tabs, /onSettingsScreenFocused\(false\)/);
});
