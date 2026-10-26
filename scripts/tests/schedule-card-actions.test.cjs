const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function load() {
    const file = 'react/features/cloudmeet/scheduleActions.ts';
    assert.ok(fs.existsSync(file), 'missing schedule card actions');
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports,
        () => ({ CLOUDMEET_ORIGIN: 'https://example.test' }));
    return module.exports;
}

test('invitation matches public intermediary and never shares management credentials', () => {
    const text = load().scheduleInvite({ roomName: '123456789', subject: '讨论 & 计划', password: '123456',
        hostKey: 'host-secret', creatorRecoveryKey: 'recovery-secret', token: 'jwt-secret' });
    assert.match(text, /主题：讨论 & 计划/);
    assert.match(text, /会议号：123456789/);
    assert.match(text, /密码：123456/);
    assert.doesNotMatch(text, /host-secret|recovery-secret|jwt-secret/);
    const link = new URL(text.split('\n').find(x => x.startsWith('会议链接：')).slice(5));
    assert.equal(link.origin, 'https://example.test');
    assert.equal(link.pathname, '/cm/invite');
    assert.equal(link.searchParams.get('subject'), '讨论 & 计划');
    assert.deepEqual([...link.searchParams.keys()].sort(), ['room', 'subject']);
});

test('unknown password never implies passwordless entry; known empty password is distinct', () => {
    const api = load();
    const unknown = api.scheduleInvite({ roomName: '123456789', subject: '' });
    assert.match(unknown, /主题：我的会议/);
    assert.match(unknown, /按提示输入会议密码/);
    assert.doesNotMatch(unknown, /^密码：/m);
    assert.match(api.scheduleInvite({ roomName: '123456789', subject: '', password: '' }), /打开链接即可/);
});

test('cancel sends scoped DELETE header and accepts successful empty response', async () => {
    await load().cancelSchedule({ roomName: '123456789', hostKey: 'private' }, async (url, options) => {
        assert.equal(url, 'https://example.test/mapi/open/desktop/meetings/123456789');
        assert.equal(options.method, 'DELETE');
        assert.equal(options.headers['X-Host-Key'], 'private');
        assert.equal(options.body, undefined);
        assert.ok(options.signal);
        return { ok: true, text: async () => '' };
    });
});

test('cancel fails closed for absent credentials, invalid room, network and business failures', async () => {
    const api = load();
    await assert.rejects(api.cancelSchedule({ roomName: '123456789' }, async () => assert.fail()), /密钥/);
    await assert.rejects(api.cancelSchedule({ roomName: '../other', hostKey: 'key' }, async () => assert.fail()), /会议号/);
    for (const response of [{ ok: false, text: async () => '' },
        { ok: true, text: async () => JSON.stringify({ code: 40304, message: '密钥已失效' }) }]) {
        await assert.rejects(api.cancelSchedule({ roomName: '123456789', hostKey: 'key' }, async () => response));
    }
    await assert.rejects(api.cancelSchedule({ roomName: '123456789', hostKey: 'key' }, async () => { throw Error('offline'); }), /offline/);
});

test('successful cancellation excludes stale refresh rows but failed cancellation leaves them', async () => {
    const api = load(); const cancelled = new Set(); const row = { roomName: '123456789', hostKey: 'key' };
    const remove = async request => { await api.cancelSchedule(row, request); cancelled.add(row.roomName); };
    await assert.rejects(remove(async () => { throw Error('offline'); }));
    assert.deepEqual(api.withoutCancelled([row], cancelled), [row]);
    await remove(async () => ({ ok: true, text: async () => '' }));
    assert.deepEqual(api.withoutCancelled([row], cancelled), []);
});

test('screen wires three wrapping actions, confirmation, copy feedback and stale response filter', () => {
    const source = fs.readFileSync('react/features/cloudmeet/ScheduledMeetings.native.tsx', 'utf8');
    for (const key of ['enter', 'copyInvite', 'copied', 'cancelSchedule']) assert.match(source, new RegExp(`cloudmeet\\.${key}`));
    assert.doesNotMatch(source, /labelKey = 'cloudmeet.joinAsHost'/);
    assert.match(source, /style = \{ styles.row \}/);
    assert.match(source, /取消预定会议/);
    assert.match(source, /style: 'destructive'/);
    assert.match(source, /Clipboard.setString\(scheduleInvite\(meeting\)\)/);
    assert.match(source, /withoutCancelled\(rows, cancelled.current\)/);
    assert.match(source, /await cancelSchedule\(meeting\)[\s\S]*cancelled.current.add/);
    assert.match(source, /operation.current/);
    assert.doesNotThrow(() => require('@babel/core').transformFileSync('react/features/cloudmeet/ScheduledMeetings.native.tsx'));
    const zh = JSON.parse(fs.readFileSync('lang/main-zh-CN.json', 'utf8')).cloudmeet;
    assert.equal(zh.enter, '进入'); assert.equal(zh.copyInvite, '复制邀请'); assert.equal(zh.cancelSchedule, '取消');
});
