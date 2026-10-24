const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('native more menu omits shared video while preserving other meeting actions', () => {
    const source = fs.readFileSync('react/features/toolbox/components/native/OverflowMenu.tsx', 'utf8');
    assert.doesNotMatch(source, /SharedVideoButton|isSharedVideoButtonVisible/);
    for (const button of ['RecordButton', 'LiveStreamButton', 'WhiteboardButton', 'SettingsButton', 'SharedDocumentButton']) {
        assert.ok(source.includes(`<${button} `), `${button} must remain available`);
    }
});
