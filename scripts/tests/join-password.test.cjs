const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function load() {
    const filename = 'react/features/cloudmeet/joinPassword.native.ts';
    assert.ok(fs.existsSync(filename), 'missing scoped join password handoff');
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports,
        () => ({ CLOUDMEET_ORIGIN: 'https://example.test' }));
    return module.exports;
}

test('join password is consumed once, scoped to origin and room, with expiry and cancellation', () => {
    const api = load();
    const url = 'https://example.test/123456789';
    api.stageJoinPassword(url, 'secret', 1000);
    assert.equal(api.consumeJoinPassword(`${url}?jwt=unused`, 1100), 'secret');
    assert.equal(api.consumeJoinPassword(url, 1101), undefined);
    for (const other of [ 'https://other.test/123456789', 'https://example.test/987654321', undefined ]) {
        api.stageJoinPassword(url, 'secret', 1000);
        assert.equal(api.consumeJoinPassword(other, 1100), undefined);
        assert.equal(api.consumeJoinPassword(url, 1101), undefined);
    }
    api.stageJoinPassword(url, 'secret', 1000);
    assert.equal(api.consumeJoinPassword(url, 301001), undefined);
    const clearOld = api.stageJoinPassword(url, 'old', 1000);
    const clearNew = api.stageJoinPassword(url, 'new', 1001);
    clearOld();
    assert.equal(api.consumeJoinPassword(url, 1002), 'new');
    api.stageJoinPassword(url, 'secret', 1000);
    // Cancellation belonging to the active attempt clears it.
    const clear = api.stageJoinPassword(url, 'secret', 1000);
    clear();
    clearNew();
    assert.equal(api.consumeJoinPassword(url, 1002), undefined);
});

test('validated join hands off password in memory and native conference passes it to media join', () => {
    const page = fs.readFileSync('react/features/cloudmeet/JoinMeetingPage.native.tsx', 'utf8');
    const native = fs.readFileSync('react/features/base/conference/actions.native.ts', 'utf8');
    const common = fs.readFileSync('react/features/base/conference/actions.any.ts', 'utf8');
    assert.match(page, /await joinMeeting\(room, password\)[\s\S]*stageJoinPassword\(url, password\)/);
    assert.match(page, /clearJoinPassword\?\.\(\)/);
    assert.match(native, /export function createConference/);
    assert.match(native, /consumeJoinPassword\(/);
    assert.match(common, /conference.join\(joinPassword \?\? password, replaceParticipant\)/);
});

test('native createConference forwards the consumed password to the shared join action', () => {
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync('react/features/base/conference/actions.native.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    let consumedUrl;
    const calls = [];
    new Function('module', 'exports', 'require', source)(module, module.exports, path => {
        if (path.endsWith('joinPassword.native')) {
            return { consumeJoinPassword: url => { consumedUrl = url; return url ? 'secret' : undefined; } };
        }
        if (path === './actions.any') {
            return { createConference: (...args) => { calls.push(args); return 'join-action'; } };
        }
        return {};
    });
    const url = new URL('https://example.test/123456789');
    const getState = () => ({ 'features/base/connection': { locationURL: url } });
    assert.equal(module.exports.createConference()(action => action, getState), 'join-action');
    assert.equal(consumedUrl, url.toString());
    assert.deepEqual(calls[0], [ undefined, 'secret' ]);
    module.exports.createConference('987654321')(action => action, getState);
    assert.equal(consumedUrl, undefined);
    assert.deepEqual(calls[1], [ '987654321', undefined ]);
});
