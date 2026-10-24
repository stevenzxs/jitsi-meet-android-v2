const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function load() {
    const module = { exports: {} };
    const filename = 'react/features/cloudmeet/endMeetingService.ts';
    assert.ok(fs.existsSync(filename), 'missing business end orchestration');
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports,
        () => ({ CLOUDMEET_ORIGIN: 'https://example.test' }));
    return module.exports;
}

test('business end succeeds before media end and uses scoped stored credentials', async () => {
    const calls = [];
    await load().endManagedMeeting('https://example.test/123456789?jwt=private', async room => {
        assert.equal(room, '123456789'); return 'secret';
    }, async (path, body) => calls.push([path, body]), async () => calls.push('media'));
    assert.deepEqual(calls, [['/open/desktop/meetings/123456789/end', {hostKey: 'secret'}], 'media']);
});

test('business failure prevents media end and can be retried', async () => {
    const api = load(); let media = 0;
    await assert.rejects(api.endManagedMeeting('https://example.test/123456789', async () => 'key',
        async () => { throw Error('offline'); }, async () => media++), /offline/);
    assert.equal(media, 0);
    await api.endManagedMeeting('https://example.test/123456789', async () => 'key', async () => {}, async () => media++);
    assert.equal(media, 1);
});

test('missing credentials fail closed and other servers never receive management credentials', async () => {
    const api = load(); let media = 0;
    await assert.rejects(api.endManagedMeeting('https://example.test/123456789', async () => undefined,
        async () => assert.fail(), async () => media++), /主持人/);
    await api.endManagedMeeting('https://other.test/123456789', async () => assert.fail(),
        async () => assert.fail(), async () => media++);
    assert.equal(media, 1);
});

test('duplicate end taps share one operation', async () => {
    const api = load(); let release; let count = 0;
    const pending = new Promise(resolve => { release = resolve; });
    const args = ['https://example.test/123456789', async () => 'key', async () => { count++; await pending; }, async () => {}];
    const a = api.endManagedMeeting(...args); const b = api.endManagedMeeting(...args);
    release(); await Promise.all([a, b]); assert.equal(count, 1);
});

test('end transport accepts the existing void API response without JSON parse failure', async () => {
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync('react/features/cloudmeet/meetingService.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', source)(module, module.exports);
    assert.equal(await module.exports.postMeetingApi('/open/desktop/meetings/123456789/end', {hostKey:'key'},
        async () => ({ok:true, status:200, text:async () => ''})), undefined);
});

test('quick credentials survive serialized vault writes and legacy schedules remain readable', async () => {
    let value = JSON.stringify({creatorId:'owner', meetings:[{roomName:'987654321',hostKey:'scheduled'}]});
    const module = {exports:{}};
    const source = ts.transpileModule(fs.readFileSync('react/features/cloudmeet/scheduleStorage.native.ts','utf8'), {
        compilerOptions:{module:ts.ModuleKind.CommonJS}
    }).outputText;
    new Function('module','exports','require',source)(module,module.exports,name => name === 'react-native'
        ? {NativeModules:{MeetingPlanner:{read:async () => value, write:async next => {value=next;}}}} : {});
    await Promise.all(['123456789','123456788'].map(roomName => module.exports.persistQuickMeeting({roomName,hostKey:roomName,creatorRecoveryKey:'recovery'})));
    assert.equal(JSON.parse(value).quickMeetings.length,2);
    assert.equal(await module.exports.readMeetingHostKey('123456789'),'123456789');
    assert.equal(await module.exports.readMeetingHostKey('987654321'),'scheduled');
    assert.equal(await module.exports.readMeetingHostKey('000000000'),undefined);
    assert.equal(JSON.parse(value).creatorId,'owner');
});

test('native end overrides generic action, leaves ordinary leave alone, and compiles with Babel', () => {
    const action = fs.readFileSync('react/features/base/conference/actions.native.ts','utf8');
    assert.match(action,/export function endConference/);
    assert.match(action,/await endManagedMeeting/);
    const menu = fs.readFileSync('react/features/toolbox/components/native/HangupMenu.tsx','utf8');
    assert.match(menu,/await dispatch\(endConference\(\)\)/);
    assert.match(menu,/Alert.alert\('结束会议失败'/);
    const quick = fs.readFileSync('react/features/cloudmeet/QuickMeetingPage.native.tsx','utf8');
    assert.ok(quick.indexOf('await persistQuickMeeting(draft)') < quick.indexOf('await createMeeting(draft'));
    for (const filename of ['react/features/base/conference/actions.native.ts','react/features/toolbox/components/native/HangupMenu.tsx','react/features/cloudmeet/endMeetingService.ts']) {
        assert.doesNotThrow(() => require('@babel/core').transformFileSync(filename));
    }
});
