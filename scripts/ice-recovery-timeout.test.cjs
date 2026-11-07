const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

// Executes the installed dependency, not a duplicate recovery implementation.
const source = fs.readFileSync(path.join(__dirname,
    '../node_modules/lib-jitsi-meet/dist/esm/modules/connectivity/IceFailedHandling.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default class IceFailedHandling', 'class IceFailedHandling')
    + '\nglobalThis.Subject = IceFailedHandling;';

function harness() {
    let reject, resolve, restarts = 0, pings = 0;
    const timers = [];
    const connection = Object.assign(new EventEmitter(), {
        connected: false,
        addCancellableListener(event, fn) {
            this.on(event, fn);
            return () => this.off(event, fn);
        }
    });
    const conference = {
        room: {},
        xmpp: { connection, ping() {
            pings++;
            return new Promise((a, b) => { resolve = a; reject = b; });
        } },
        jvbJingleSession: { getIceConnectionState: () => 'failed' },
        _stopJvbSession() { restarts++; }
    };
    const context = {
        getLogger: () => ({ info() {}, warn() {}, error() {} }),
        RTCStats: { sendStatsEntry() {} }, RTCStatsEvents: {},
        window: { setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {} },
        XmppConnection: {
            Events: { CONN_STATUS_CHANGED: 'CONN_STATUS_CHANGED' },
            Status: { CONNECTED: 5, ATTACHED: 11 }
        }
    };
    vm.runInNewContext(source, context);
    const task = new context.Subject(conference);
    task.start();
    return {
        task, conference, connection,
        async timeout() { reject(undefined); await Promise.resolve(); },
        async online() {
            connection.connected = true;
            connection.emit('CONN_STATUS_CHANGED', 5);
            await Promise.resolve();
        },
        async success() { resolve(); await Promise.resolve(); timers.splice(0).forEach(fn => fn()); },
        get pings() { return pings; },
        get restarts() { return restarts; }
    };
}

test('normal signal recovery restarts failed media', async () => {
    const h = harness();
    await h.success();
    assert.equal(h.restarts, 1);
});

test('late XMPP recovery re-arms media recovery after the 65-second ping timeout', async () => {
    const h = harness();
    await h.timeout();
    await h.online();
    assert.equal(h.pings, 2, 'late signal recovery needs a fresh reachability check');
    await h.success();
    assert.equal(h.restarts, 1);
});

test('cancelled recovery must not restart after signal returns', async () => {
    const h = harness();
    await h.timeout();
    h.task.cancel();
    await h.online();
    assert.equal(h.pings, 1);
    assert.equal(h.restarts, 0);
});

test('replacement media session is never restarted by an old recovery task', async () => {
    const h = harness();
    await h.timeout();
    h.conference.jvbJingleSession = { getIceConnectionState: () => 'failed' };
    await h.online();
    assert.equal(h.pings, 1);
    assert.equal(h.restarts, 0);
});

test('late successful ping cannot restart a replacement session', async () => {
    const h = harness();
    h.conference.jvbJingleSession = { getIceConnectionState: () => 'failed' };
    await h.success();
    assert.equal(h.restarts, 0);
});

test('leaving the room suppresses delayed recovery', async () => {
    const h = harness();
    await h.timeout();
    h.conference.room = undefined;
    await h.online();
    assert.equal(h.restarts, 0);
});

test('repeated connected notifications schedule only one reachability check', async () => {
    const h = harness();
    await h.timeout();
    await h.online();
    await h.online();
    assert.equal(h.pings, 2);
    await h.success();
    assert.equal(h.restarts, 1);
});
