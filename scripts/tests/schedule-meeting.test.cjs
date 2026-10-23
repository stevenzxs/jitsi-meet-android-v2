const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
function service() {
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync('react/features/cloudmeet/scheduleService.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports, () => ({}));
    return module.exports;
}
const details = () => ({ subject: '', displayName: '测试', start: Date.now() + 3600000, durationMinutes: 60, password: '' });
const draft = { roomName: '123456789', hostKey: 'secret', creatorRecoveryKey: 'recovery' };
test('schedule validates future time and supported duration before network', async () => {
    const m = service();
    for (const value of [{ ...details(), start: 0 }, { ...details(), durationMinutes: 17 }, { ...details(), displayName: '' }]) {
        await assert.rejects(m.saveSchedule(draft, value, 'owner', async () => assert.fail('network called')));
    }
});
test('schedule saves exact ISO start, password and scoped credentials without token request', async () => {
    const m = service(); const input = details(); let calls = 0;
    await m.saveSchedule(draft, input, 'owner', async (path, body) => {
        calls++; assert.equal(path, '/open/desktop/meetings/schedule');
        assert.equal(body.scheduledStartTime, new Date(input.start).toISOString());
        assert.equal(body.creatorId, 'owner'); assert.equal(body.hostKey, draft.hostKey);
        return { roomName: draft.roomName };
    });
    assert.equal(calls, 1);
});
test('schedule rejects server failure rather than claiming local success', async () => {
    await assert.rejects(service().saveSchedule(draft, details(), 'owner', async () => { throw Error('offline'); }), /offline/);
});
test('host entry requires nonempty signed token and never anonymous fallback', async () => {
    const m = service();
    await assert.rejects(m.scheduledHostUrl(draft, '测试', async () => ({})), /主持人/);
    const url = await m.scheduledHostUrl(draft, '测试', async () => ({ token: 'signed' }));
    assert.match(url, /jwt=signed/); assert.ok(!url.includes(draft.hostKey));
});
test('three shortcut entries align left and scheduled list replaces CloudMeet calendar', () => {
    const source = fs.readFileSync('react/features/cloudmeet/MeetingShortcuts.native.tsx', 'utf8');
    assert.match(source, /justifyContent: 'flex-start'/);
    assert.match(source, /cloudmeet.schedule/);
    const tabs = fs.readFileSync('react/features/mobile/navigation/components/welcome/components/WelcomePageTabs.tsx', 'utf8');
    assert.match(tabs, /ScheduledMeetings/);
});
test('lost save response is reconciled before retry without duplicate create', async () => {
    let stored = null; let creates = 0;
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync('react/features/cloudmeet/scheduleStorage.native.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports, name => {
        if (name === 'react-native') return { NativeModules: { MeetingPlanner: {
            read: async () => stored, write: async value => { stored = value; }
        } } };
        if (name === './meetingService') return { newMeetingDraft: () => ({ creatorRecoveryKey: 'owner' }) };
        if (name === './scheduleService') return {
            fetchSchedules: async () => [{ roomName: draft.roomName }],
            saveSchedule: async () => { creates++; throw Error('lost response'); }
        };
        return {};
    });
    const record = { ...draft, ...details(), saved: false };
    await assert.rejects(module.exports.persistSchedule(record), /lost response/);
    assert.equal(JSON.parse(stored).meetings[0].saved, false);
    await module.exports.persistSchedule(record);
    assert.equal(creates, 1);
    assert.equal(JSON.parse(stored).meetings[0].saved, true);
});
test('native planner encrypts credentials with Keystore instead of plaintext persistence', () => {
    const native = fs.readFileSync('android/sdk/src/main/java/org/jitsi/meet/sdk/MeetingPlannerModule.java', 'utf8');
    assert.match(native, /AndroidKeyStore/);
    assert.match(native, /AES\/GCM\/NoPadding/);
    assert.match(native, /DatePickerDialog/);
    assert.match(native, /TimePickerDialog/);
});
