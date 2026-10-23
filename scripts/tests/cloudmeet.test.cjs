const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function model() {
    const path = 'react/features/cloudmeet/meetingService.ts';
    assert.ok(fs.existsSync(path), 'CloudMeet service must exist');
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', source)(module, module.exports);
    return module.exports;
}

test('draft uses nine digits and cryptographically supplied host/recovery credentials', () => {
    const { newMeetingDraft } = model();
    const draft = newMeetingDraft(bytes => require('node:crypto').randomFillSync(bytes));
    assert.match(draft.roomName, /^\d{9}$/);
    assert.match(draft.hostKey, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
    assert.ok(draft.creatorRecoveryKey.length >= 32);
});

test('create must register then acquire token before returning native meeting URL', async () => {
    const m = model();
    const calls = [];
    const draft = m.newMeetingDraft(bytes => require('node:crypto').randomFillSync(bytes));
    const url = await m.createMeeting(draft, { displayName: '测试', subject: '测试会议' }, async (path, body) => {
        calls.push([path, body]);
        return path.endsWith('host-token') ? { token: 'signed.jwt.value' } : { roomName: draft.roomName };
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0][0], '/open/desktop/meetings');
    assert.equal(calls[1][0], `/open/desktop/meetings/${draft.roomName}/host-token`);
    assert.equal(calls[0][1].hostKey, calls[1][1].hostKey);
    assert.equal(new URL(url).searchParams.get('jwt'), 'signed.jwt.value');
    assert.ok(!url.includes(draft.hostKey));
});

test('registration failure or empty token never falls back to anonymous create', async () => {
    const m = model();
    const draft = m.newMeetingDraft(bytes => require('node:crypto').randomFillSync(bytes));
    await assert.rejects(m.createMeeting(draft, { displayName: '测试' }, async () => { throw Error('offline'); }), /offline/);
    await assert.rejects(m.createMeeting(draft, { displayName: '测试' }, async () => ({})), /主持人/);
});

test('retry after token failure does not register the same meeting twice', async () => {
    const m = model();
    const draft = m.newMeetingDraft(bytes => require('node:crypto').randomFillSync(bytes));
    let registrations = 0;
    let tokenCalls = 0;
    const post = async path => {
        if (path.endsWith('host-token')) {
            if (++tokenCalls === 1) throw Error('temporary outage');
            return { token: 'signed.jwt.value' };
        }
        registrations++;
        return { roomName: draft.roomName };
    };
    await assert.rejects(m.createMeeting(draft, { displayName: '测试' }, post));
    await m.createMeeting(draft, { displayName: '测试' }, post);
    assert.equal(registrations, 1);
});

test('join validates a formatted nine digit ID and awaits business validation', async () => {
    const m = model();
    let called = false;
    const url = await m.joinMeeting('123-456-789', '', async path => {
        assert.equal(path, '/open/desktop/meetings/123456789/join-check');
        called = true;
        return { roomName: '123456789' };
    });
    assert.ok(called);
    assert.equal(url, `${m.CLOUDMEET_ORIGIN}/123456789`);
    await assert.rejects(m.joinMeeting('not-a-room', '', async () => ({})), /九位/);
    await assert.rejects(m.joinMeeting('123456789', '', async () => { throw Error('expired'); }), /expired/);
});

test('HTTP and business errors are explicit failures; success envelopes unwrap', async () => {
    const { postMeetingApi } = model();
    await assert.rejects(postMeetingApi('/test', {}, async () => ({ ok: false, json: async () => ({ message: '会议不存在' }) })), /会议不存在/);
    await assert.rejects(postMeetingApi('/test', {}, async () => ({ ok: true, json: async () => ({ code: 500, msg: '拒绝' }) })), /拒绝/);
    assert.deepEqual(await postMeetingApi('/test', {}, async () => ({ ok: true, json: async () => ({ code: 200, data: { ok: true } }) })), { ok: true });
});

test('official certificate matches Electron identity and is domain scoped', () => {
    const { X509Certificate, createHash } = require('node:crypto');
    const certificate = new X509Certificate(fs.readFileSync('android/app/src/main/res/raw/cloudmeet_official.pem'));
    assert.equal(createHash('sha256').update(certificate.raw).digest('hex').toUpperCase(),
        'CC896427E1F03EA481BDE4D1A4102189E6988ED0C4671B00E44A0917BBFF4FF5');
    assert.equal(certificate.checkIP('118.193.36.35'), '118.193.36.35');
    const config = fs.readFileSync('android/app/src/main/res/xml/network_security_config.xml', 'utf8');
    assert.match(config, /<domain-config cleartextTrafficPermitted="false">\s*<domain includeSubdomains="false">118\.193\.36\.35<\/domain>\s*<trust-anchors>\s*<certificates src="@raw\/cloudmeet_official"/);
});
