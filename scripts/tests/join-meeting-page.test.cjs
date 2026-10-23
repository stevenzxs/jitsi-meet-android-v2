const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
test('join form is a root screen with the quick meeting fade transition', () => {
    const root = fs.readFileSync('react/features/mobile/navigation/components/RootNavigationContainer.tsx', 'utf8');
    assert.match(root, /component = \{ JoinMeetingPage \}\s*name = \{ screen.joinMeeting \}\s*options = \{ quickMeetingScreenOptions \}/);
});
test('welcome opens join page and hides inline form in CloudMeet mode', () => {
    const source = fs.readFileSync('react/features/welcome/components/WelcomePage.native.tsx', 'utf8');
    assert.match(source, /navigation.navigate\(screen.joinMeeting\)/);
    assert.match(source, /!this.props.cloudMeetEnabled && this._renderRoomNameInput\(\)/);
    assert.match(source, /!this.state.isSettingsScreenFocused && <MeetingShortcuts[\s\S]*onJoin = \{ this._onOpenJoin \}/);
});
test('join page preserves ordinary prejoin, locks submission and retains editable form after errors', () => {
    const source = fs.readFileSync('react/features/cloudmeet/JoinMeetingPage.native.tsx', 'utf8');
    assert.match(source, /headerTitleAlign: 'center'/);
    assert.match(source, /dialog.Cancel/);
    assert.match(source, /joinMeeting\(room, password\)/);
    assert.match(source, /dispatch\(appNavigate\(url\)\)/);
    assert.doesNotMatch(source, /enterCreatedMeeting|prejoinConfig/);
    assert.match(source, /submitting.current/);
    assert.match(source, /beforeRemove/);
    assert.match(source, /secureTextEntry = \{ true \}/);
    assert.match(source, /useState\(''\)/);
});
