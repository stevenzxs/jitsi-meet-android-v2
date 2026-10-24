const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('profile card clips its themed press feedback to rounded corners', () => {
    const source = fs.readFileSync('react/features/settings/components/native/SettingsView.tsx', 'utf8');
    const styles = fs.readFileSync('react/features/settings/components/native/styles.ts', 'utf8');

    assert.match(source, /underlayColor = \{ theme.palette.ui03 \}/);
    assert.match(styles, /profileContainerWrapper: \{[^}]*borderRadius: BaseTheme.shape.borderRadius,[^}]*overflow: 'hidden'/s);
});

test('native profile edits display name without exposing or overwriting email', () => {
    const source = fs.readFileSync('react/features/settings/components/native/ProfileView.tsx', 'utf8');

    assert.doesNotMatch(source, /email|Email|gavatarMessage/);
    assert.match(source, /dispatch\(updateSettings\(\{\s*displayName\s*\}\)\)/);
    assert.match(source, /onChange = \{ onDisplayNameChanged \}/);
});
