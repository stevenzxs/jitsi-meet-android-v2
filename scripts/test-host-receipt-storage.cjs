const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup() {
    let value = JSON.stringify({ creatorId: 'device1', meetings: [], quickMeetings: [] });
    let origin = 'https://jks.whclaw.top';
    let token = true;
    const service = { get CLOUDMEET_ORIGIN() { return origin; },
        postMeetingApi: async () => token ? { token: 'verified-jwt' } : Promise.reject(Error('pending fence')) };
    const context = { exports: {}, require: name => {
        if (name === 'react-native') return { NativeModules: { MeetingPlanner: {
            read: async () => value, write: async v => { value = v; }
        } } };
        if (name === './meetingService') return service;
        return {};
    } };
    vm.runInNewContext(ts.transpile(fs.readFileSync('react/features/cloudmeet/scheduleStorage.native.ts', 'utf8'),
        { module: ts.ModuleKind.CommonJS }), context);
    return { ...context.exports, origin: v => { origin = v; }, token: v => { token = v; } };
}
const room = '123456789';
const receipt = { hostKey: 'rotated-key', operationId: 'operation1', expiresAt: Date.now() + 300000 };
test('pending receipts never authorize management writes; API confirmation is required', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt);
    assert.equal(await s.readMeetingHostKey(room), undefined);
    s.token(false); await assert.rejects(s.completeHostReceipt(room, receipt));
    assert.equal(await s.readMeetingHostKey(room), undefined);
    s.token(true); await s.completeHostReceipt(room, receipt);
    assert.equal(await s.readMeetingHostKey(room), receipt.hostKey);
});
test('receipt from one server origin must never appear on another origin', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt); await s.completeHostReceipt(room, receipt);
    s.origin('https://different.example'); assert.equal(await s.readMeetingHostKey(room), undefined);
});
test('duplicate completed receipt must not downgrade active authority', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt); await s.completeHostReceipt(room, receipt);
    await s.persistHostReceipt(room, receipt); assert.equal(await s.readMeetingHostKey(room), receipt.hostKey);
});
test('revocation of another operation cannot erase current receipt', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt); await s.completeHostReceipt(room, receipt);
    await s.revokeHostReceipt(room, 'other-operation'); assert.equal(await s.readMeetingHostKey(room), receipt.hostKey);
    await s.revokeHostReceipt(room, receipt.operationId); assert.equal(await s.readMeetingHostKey(room), undefined);
});
test('server rejection tombstones only the exact active host key', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt); await s.completeHostReceipt(room, receipt);
    await s.discardMeetingHostKey(room, 'different-key'); assert.equal(await s.readMeetingHostKey(room), receipt.hostKey);
    await s.discardMeetingHostKey(room, receipt.hostKey); assert.equal(await s.readMeetingHostKey(room), undefined);
});
test('successful outgoing transfer tombstones the current active receipt', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt); await s.completeHostReceipt(room, receipt);
    await s.discardActiveMeetingHostKey(room); assert.equal(await s.readMeetingHostKey(room), undefined);
});
test('joinable pending receipt activates only after an explicit token success fence', async () => {
    const s = setup(); await s.persistHostReceipt(room, receipt);
    assert.equal(await s.readMeetingHostKey(room), undefined);
    const joinable = await s.readJoinableHostReceipt(room);
    assert.equal(joinable.hostKey, receipt.hostKey);
    assert.equal(joinable.operationId, receipt.operationId);
    assert.equal(joinable.active, false);
    await s.activateHostReceipt(room, receipt);
    assert.equal(await s.readMeetingHostKey(room), receipt.hostKey);
});
