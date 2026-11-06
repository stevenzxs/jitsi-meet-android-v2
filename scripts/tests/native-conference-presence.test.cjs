const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function loadMiddleware() {
    let factory;
    const calls = [];
    const source = ts.transpileModule(fs.readFileSync(
        'react/features/base/conference/middleware.native.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    const mocks = {
        '../../cloudmeet/meetingPresence': {
            startMeetingPresence: (...args) => {
                calls.push(args);
                return () => calls.push('stop');
            }
        },
        '../connection/functions': { getCurrentConferenceUrl: () => 'https://example.test/123456789' },
        '../redux/MiddlewareRegistry': { default: { register: value => { factory = value; } } },
        './actionTypes': Object.fromEntries(['CONFERENCE_JOINED', 'CONFERENCE_LEFT', 'CONFERENCE_FAILED']
            .map(name => [name, name])),
        './networkChangeIceRestart.native': {
            noteSessionNetwork() {}, resetNetworkChangeState() {}
        },
        './logger': { default: { warn() {} } }
    };
    const module = { exports: {} };
    new Function('module', 'exports', 'require', source)(module, module.exports,
        name => mocks[name] || {});
    const forwarded = [];
    const dispatch = factory({ getState: () => ({}), dispatch() {} })(action => {
        forwarded.push(action);
        return 'forwarded';
    });
    return { dispatch, calls, forwarded };
}

test('native join uses the SDK myUserId API without throwing out of the presence handler', () => {
    const sdk = fs.readFileSync('node_modules/lib-jitsi-meet/dist/esm/JitsiConference.js', 'utf8');
    assert.match(sdk, /\bmyUserId\(\)\s*\{/);
    const { dispatch, calls, forwarded } = loadMiddleware();
    const action = { type: 'CONFERENCE_JOINED', conference: { myUserId: () => 'android-id' } };
    assert.equal(dispatch(action), 'forwarded');
    assert.equal(calls[0][1], 'android-id');
    assert.deepEqual(forwarded, [action]);
    dispatch({ type: 'CONFERENCE_LEFT' });
    assert.equal(calls[1], 'stop');
});
