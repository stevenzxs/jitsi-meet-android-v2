const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('meeting notification puts a live chronometer in custom content instead of the system header', () => {
    const source = fs.readFileSync('android/sdk/src/main/java/org/jitsi/meet/sdk/OngoingNotification.java', 'utf8');
    assert.match(source, /setShowWhen\(false\)/);
    assert.match(source, /setUsesChronometer\(false\)/);
    assert.match(source, /DecoratedCustomViewStyle/);
    assert.match(source, /setCustomContentView\(content\)/);
    assert.match(source, /setCustomBigContentView\(content\)/);
    assert.match(source, /setChronometer\(R.id.meeting_duration,.*true\)/);
    assert.match(source, /SystemClock.elapsedRealtime\(\)/);
    assert.match(source, /builder.addAction\(hangupAction\)/);
    assert.match(source, /builder.addAction\(audioAction\)/);
    const layout = fs.readFileSync('android/sdk/src/main/res/layout/ongoing_meeting_notification.xml', 'utf8');
    assert.match(layout, /<Chronometer/);
    assert.match(layout, /android:orientation="vertical"/);
    assert.match(layout, /@android:style\/TextAppearance.Material.Notification.Title/);
    assert.match(layout, /android:gravity="center_vertical"/);
    assert.ok(layout.indexOf('@string/ongoing_notification_title') < layout.indexOf('@+id/meeting_duration'));
});
