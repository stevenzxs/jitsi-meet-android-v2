const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function load(file, dependencies = {}) {
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(`react/features/cloudmeet/${file}`, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports, name => dependencies[name] || {});
    return module.exports;
}
const now = Date.now();
const record = (roomName = '123456789', extra = {}) => ({ roomName, creatorId: 'owner', subject: '远端主题',
    status: 'SCHEDULED', scheduledStartTime: new Date(now + 60000).toISOString(),
    scheduledEndTime: new Date(now + 3660000).toISOString(), ...extra });

test('server source displays uncached records, updates fields and never trusts returned credentials', () => {
    const api = load('scheduleService.ts');
    const result = api.scheduleRows([record(), record('987654321')], [
        { roomName: '123456789', subject: '旧主题', hostKey: 'local-key', password: 'local-password' }
    ], 'owner', now);
    assert.equal(result.length, 2);
    assert.equal(result[0].subject, '远端主题');
    assert.equal(result[0].start, now + 60000);
    assert.equal(result[0].durationMinutes, 60);
    assert.equal(result[0].hostKey, 'local-key');
    assert.equal(result[1].hostKey, undefined);
    const untrusted = api.scheduleRows([record('987654321', { hostKey: 'remote-secret', password: 'remote-password' })], [], 'owner', now);
    assert.equal(untrusted[0].hostKey, undefined);
    assert.equal(untrusted[0].password, undefined);
});

test('server rows filter identity/status/expiry, deduplicate and sort by server start', () => {
    const api = load('scheduleService.ts');
    const records = [record('111111111', { scheduledStartTime: new Date(now + 120000).toISOString() }),
        record(), record(), record('222222222', { creatorId: 'other' }),
        ...['RUNNING', 'ENDED', 'CANCELLED'].map((status, i) => record(`33333333${i}`, { status })),
        record('444444444', { scheduledStartTime: new Date(now - 60000).toISOString(), scheduledEndTime: new Date(now).toISOString() })];
    assert.deepEqual(api.scheduleRows(records, [], 'owner', now).map(x => x.roomName), ['123456789', '111111111']);
    assert.deepEqual(api.scheduleRows([], [{ roomName: '123456789', saved: true }], 'owner', now), []);
    assert.throws(() => api.scheduleRows([record('123456789', { scheduledStartTime: 'bad' })], [], 'owner', now), /格式/);
});

test('schedule screen always requests server and keeps pending drafts separate from formal rows', () => {
    const source = fs.readFileSync('react/features/cloudmeet/ScheduledMeetings.native.tsx', 'utf8');
    assert.match(source, /getPlannerIdentity/);
    assert.match(source, /scheduleRows\(records/);
    assert.doesNotMatch(source, /if \(!current.length\)|ids.has|setMeetings\(current/);
    assert.match(source, /待确认预定/);
    assert.match(source, /本机未保存主持人密钥/);
    assert.match(source, /保留已有记录/);
});

function storage(post, saved = false) {
    let value = JSON.stringify({ creatorId: 'owner', meetings: [{ roomName: '123456789', hostKey: 'key',
        creatorRecoveryKey: 'recovery', displayName: '测试', start: now + 60000, durationMinutes: 60, saved }] });
    const api = load('scheduleStorage.native.ts', {
        'react-native': { NativeModules: { MeetingPlanner: { read: async () => value, write: async next => { value = next; } } } },
        './meetingService': { postMeetingApi: post },
        './scheduleService': { fetchSchedules: async () => [], saveSchedule: async () => post('/schedule', {}) }
    });
    return { api, read: () => JSON.parse(value).meetings[0] };
}

test('lost response reconciliation uses host authorization even when no longer in visible list', async () => {
    const calls = [];
    const vault = storage(async path => { calls.push(path); return { token: 'private' }; });
    await vault.api.persistSchedule(vault.read());
    assert.deepEqual(calls, ['/open/desktop/meetings/123456789/host-token']);
    assert.equal(vault.read().saved, true);
});

test('only explicit not-found permits recreate; network or invalid host credentials never do', async () => {
    for (const code of [undefined, 40304, 50001]) {
        const calls = [];
        const vault = storage(async path => { calls.push(path); throw Object.assign(Error('unconfirmed'), { code }); });
        await assert.rejects(vault.api.persistSchedule(vault.read()), /unconfirmed/);
        assert.equal(calls.length, 1);
        assert.equal(vault.read().saved, false);
    }
    const calls = [];
    const vault = storage(async path => {
        calls.push(path);
        if (path.endsWith('host-token')) throw Object.assign(Error('missing'), { code: 40401 });
    });
    await vault.api.persistSchedule(vault.read());
    assert.deepEqual(calls, ['/open/desktop/meetings/123456789/host-token', '/schedule']);
    assert.equal(vault.read().saved, true);
});

test('closed or expired after host validation confirms creation without recreating', async () => {
    for (const code of [40901, 40902]) {
        const vault = storage(async () => { throw Object.assign(Error('closed'), { code }); });
        await vault.api.persistSchedule(vault.read());
        assert.equal(vault.read().saved, true);
    }
});

test('meeting transport preserves numeric business error codes for safe reconciliation', async () => {
    const api = load('meetingService.ts');
    await assert.rejects(api.postMeetingApi('/test', {}, async () => ({ ok: false,
        json: async () => ({ code: 40401, message: 'missing' }) })), error => error.code === 40401);
});

test('presence transport accepts empty successful responses', async () => {
    const api = load('meetingService.ts');
    assert.equal(await api.postMeetingApi('/open/desktop/meetings/123456789/participants/join', { participantId: 'id' },
        async () => ({ ok: true, text: async () => '' })), undefined);
});

test('schedule fetching rejects blank identity before making any request', async () => {
    await assert.rejects(load('scheduleService.ts').fetchSchedules('  '), /身份/);
});
