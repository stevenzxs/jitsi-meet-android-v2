const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function load() {
    const module = { exports: {} };
    const file = 'react/features/cloudmeet/meetingPresence.ts';
    assert.ok(fs.existsSync(file), 'missing real-join presence reporter');
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports,
        () => ({ CLOUDMEET_ORIGIN: 'https://example.test' }));
    return module.exports;
}

test('only official numeric rooms report real participant IDs; stop cancels future reports', async () => {
    const api = load(); let tick; let cleared = false; const calls = [];
    const schedule = callback => { tick = callback; return () => { cleared = true; }; };
    const stop = api.startMeetingPresence('https://example.test/123456789?jwt=private', 'participant',
        async (path, body) => calls.push([path, body]), () => assert.fail(), schedule);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, [['/open/desktop/meetings/123456789/participants/join', { participantId: 'participant' }]]);
    await tick(); assert.equal(calls.length, 2); // also covers early entry crossing scheduled start
    stop(); await tick(); assert.equal(calls.length, 2); assert.ok(cleared);
    for (const url of ['https://other.test/123456789', 'https://example.test/other', undefined]) {
        api.startMeetingPresence(url, 'id', async () => assert.fail(), () => assert.fail(), () => assert.fail())();
    }
});

test('presence failures are handled and retries do not overlap', async () => {
    const api = load(); let tick; let release; let calls = 0; let warnings = 0;
    const stop = api.startMeetingPresence('https://example.test/123456789', 'id', async () => {
        calls++; await new Promise(resolve => { release = resolve; }); throw Error('secret must not be logged');
    }, () => warnings++, callback => { tick = callback; return () => {}; });
    await tick(); assert.equal(calls, 1);
    release(); await new Promise(resolve => setImmediate(resolve)); assert.equal(warnings, 1);
    const retry = tick(); assert.equal(calls, 2); release(); await retry;
    stop();
});

test('native middleware starts only after joined and stops on leave or failure', () => {
    const source = fs.readFileSync('react/features/base/conference/middleware.native.ts', 'utf8');
    assert.match(source, /startMeetingPresence/);
    assert.match(source, /myUserId\(\)/);
    assert.match(source, /case CONFERENCE_LEFT:[\s\S]*stopPresence\(\)/);
    assert.match(source, /case CONFERENCE_FAILED:[\s\S]*stopPresence\(\)/);
});
