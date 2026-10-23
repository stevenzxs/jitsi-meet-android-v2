const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
test('home shortcuts use a single row with desktop bolt and plus icons', () => {
    const path = 'react/features/cloudmeet/MeetingShortcuts.native.tsx';
    assert.ok(fs.existsSync(path), 'shortcut component exists');
    const source = fs.readFileSync(path, 'utf8');
    assert.match(source, /flexDirection: 'row'/);
    assert.match(source, /M13.3 2/);
    assert.match(source, /M10 4h4v6/);
    assert.ok(source.indexOf("'cloudmeet.create'") < source.indexOf("'cloudmeet.join'"));
    assert.match(source, /accessibilityRole = 'button'/);
    assert.match(source, /fill = '#FFFFFF'/);
});
