const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname,
    '../node_modules/lib-jitsi-meet/dist/esm/JitsiConference.js'), 'utf8');
const method = name => text.slice(text.indexOf(`    ${name}(`), text.indexOf('\n    /**', text.indexOf(`    ${name}(`)));
function harness() {
    const session = { isP2P: false };
    let failures = 0, recoveries = 0;
    const c = {
        logger: { info() {}, warn() {}, error() {} },
        MAX_CONNECTION_RETRIES: 3, getJitterDelay: () => 1,
        setTimeout: fn => fn(),
        IceFailedHandling: class { start() { recoveries++; } },
        Statistics: { sendAnalyticsAndLog() {} },
        createJvbIceFailedEvent() {}, AnalyticsEvents: {},
        JitsiConferenceEvents: { CONFERENCE_FAILED: 'failed' }, JitsiConferenceErrors: {},
        isValidNumber: () => false
    };
    vm.runInNewContext(`globalThis.Subject = class {${method('_onIceConnectionFailed')}${method('_onIceConnectionEstablished')}}`, c);
    const subject = Object.assign(new c.Subject(), {
        _iceRestarts: 0, jvbJingleSession: session, p2pJingleSession: null,
        isIceRestartSupported: () => false, isP2PActive: () => true,
        eventEmitter: { emit(event) { if (event === 'failed') failures++; } },
        myUserId: () => 'test', options: { config: {} }
    });
    return { subject, session, get failures() { return failures; }, get recoveries() { return recoveries; } };
}
test('successful JVB recovery resets retry budget for later independent outages', () => {
    const h = harness();
    for (let i = 0; i < 4; i++) {
        h.subject._onIceConnectionFailed(h.session);
        h.subject._onIceConnectionEstablished(h.session);
    }
    assert.equal(h.failures, 0, 'independent recovered outages must not exhaust a lifetime budget');
    assert.equal(h.recoveries, 4);
});
test('consecutive unsuccessful ICE attempts remain bounded', () => {
    const h = harness();
    for (let i = 0; i < 4; i++) h.subject._onIceConnectionFailed(h.session);
    assert.equal(h.recoveries, 3);
    assert.equal(h.failures, 1);
});
test('stale JVB establishment cannot reset the current retry budget', () => {
    const h = harness();
    h.subject._iceRestarts = 3;
    h.subject._onIceConnectionEstablished({ isP2P: false });
    assert.equal(h.subject._iceRestarts, 3);
});
