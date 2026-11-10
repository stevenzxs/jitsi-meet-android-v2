const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { DOMImplementation } = require('@xmldom/xmldom');
const NS = 'urn:cloudmeet:host-control:1';
function setup(failStorage = false, lostAck = false, recovery = false) {
    const timers = [];
    const context = { exports: {}, Date, Promise, require,
        setTimeout: f => { timers.push(f); return timers.length; }, clearTimeout: () => {} };
    vm.runInNewContext(ts.transpile(fs.readFileSync('react/features/cloudmeet/hostTransfer.ts', 'utf8'),
        { module: ts.ModuleKind.CommonJS }), context);
    const calls = [];
    let handler;
    const doc = new DOMImplementation().createDocument(null, 'root');
    const roomJid = '123456789@muc.meet.jitsi';
    const connection = { connected: true, jid: 'target@meet.jitsi/resource',
        addHandler: h => { handler = h; return h; }, deleteHandler: () => calls.push('delete'),
        sendIQ: (iq, ok, fail) => {
            const command = iq.childNodes[0];
            if (recovery && command.localName === 'recover') {
                calls.push('recover');
                const reply = doc.createElement('iq'); reply.setAttribute('from', roomJid);
                const challenge = doc.createElementNS(NS, 'challenge');
                for (const [ k, v ] of Object.entries({ roomName: '123456789', operationId: 'operation1',
                    targetSession: connection.jid, expectedRoomInstance: 'old-instance', roomInstance: 'new-instance',
                    nonce: 'nonce01234567890123456789', expiresAt: String(Date.now()/1000+60) })) challenge.setAttribute(k,v);
                reply.appendChild(challenge);ok(reply);return;
            }
            if (recovery && command.localName === 'rebind') {
                calls.push('rebind');assert.equal(command.getAttribute('proof'),'signed-proof');
                const reply = doc.createElement('iq'); reply.setAttribute('from', roomJid);
                const result = doc.createElementNS(NS, 'rebind');result.setAttribute('operationId','operation1');
                result.setAttribute('state','roles-committed');reply.appendChild(result);ok(reply);return;
            }
            calls.push('ack');
            if (lostAck) { fail(null); return; }
            assert.equal(iq.getAttribute('xmlns'), 'jabber:client');
            const reply = doc.createElement('iq'); reply.setAttribute('from', roomJid);
            const ack = doc.createElementNS(NS, 'ack');
            ack.setAttribute('operationId', 'operation1'); ack.setAttribute('state', 'complete');reply.appendChild(ack);ok(reply);
        } };
    const conference = { isJoined: () => true, room: { roomjid: roomJid },
        getConnection: () => ({ xmpp: { connection } }) };
    const stop = context.exports.attachNativeHostTransfer({ conference, room: '123456789',
        persist: async () => { calls.push('persist'); if (failStorage) throw Error('storage failed'); },
        complete: async () => { calls.push('complete'); if(recovery && !calls.includes('rebind')) throw Error('pending fence'); },
        pending: recovery ? async () => ({ hostKey: 'saved-key', operationId: 'operation1', expiresAt: Date.now()+300000 }) : undefined,
        proof: async (key, message) => { assert.equal(key,'saved-key');assert.ok(message.startsWith('host-transfer-rebind-v1\n123456789\n'));return 'signed-proof'; },
        revoked: async () => calls.push('revoke'),
        onError: () => calls.push('error') });
    function message(from = roomJid) {
        const m = doc.createElement('message');m.setAttribute('from', from);m.setAttribute('type', 'normal');
        const c = doc.createElementNS(NS, 'credential');
        for (const [ k, v ] of Object.entries({ operationId: 'operation1',hostKey: 'new-key',identity: 'host-v1-'+'a'.repeat(43) })) c.setAttribute(k,v);
        m.appendChild(c);handler(m);
    }
    return { calls, message, stop, retry: () => timers.shift()() };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('native recipient persists before ack and completes only after verified room reply', async () => {
    const x=setup();x.message();await tick();assert.deepEqual(x.calls,['persist','ack','complete']);
});
test('native storage failure never acknowledges', async () => {
    const x=setup(true);x.message();await tick();assert.deepEqual(x.calls,['persist','error']);
});
test('participant spoof and stopped connection cannot deliver receipts', async () => {
    const x=setup();x.message('123456789@muc.meet.jitsi/peer');await tick();assert.deepEqual(x.calls,[]);
    x.stop();x.message();await tick();assert.deepEqual(x.calls,['delete']);
});
test('lost ack response reconciles through API completion fence without losing receipt', async () => {
    const x=setup(false,true);x.message();await tick();assert.deepEqual(x.calls,['persist','ack','complete']);
});
test('pending rejoin uses verified challenge and possession proof before rebind and ack', async () => {
    const x=setup(false,false,true);x.retry();await tick();
    assert.deepEqual(x.calls,['ack','complete','recover','rebind','ack','complete']);x.stop();
});
function outgoing(overrides = {}) {
    const context = { exports: {}, require, Date, Math, Promise };
    vm.runInNewContext(ts.transpile(fs.readFileSync('react/features/cloudmeet/hostTransfer.ts','utf8'),
        {module:ts.ModuleKind.CommonJS}),context);
    const calls=[];
    const doc=new DOMImplementation().createDocument(null,'root');
    const roomjid='123456789@muc.meet.jitsi';
    const room={roomjid,myroomjid:roomjid+'/source',members:{[roomjid+'/target']:{role:'participant',jid:'target@meet.jitsi/r'}}};
    const connection={connected:true,jid:'source@meet.jitsi/r',sendIQ:(iq,ok)=>{
        calls.push(iq);const response=doc.createElement('iq');response.setAttribute('from',roomjid);
        const result=doc.createElementNS(NS,'transfer');result.setAttribute('operationId',iq.childNodes[0].getAttribute('operationId'));
        result.setAttribute('state','roles-committed');response.appendChild(result);ok(response);
    }};
    const conference={room,isJoined:()=>true,isModerator:()=>true,getConnection:()=>({xmpp:{connection}}),...overrides};
    return {calls, run:()=>context.exports.requestNativeHostTransfer(conference,'target')};
}
test('native transfer uses custom IQ not grantOwner', async()=>{
    const x=outgoing();await x.run();assert.equal(x.calls.length,1);
    assert.equal(x.calls[0].childNodes[0].getAttribute('target'),'123456789@muc.meet.jitsi/target');
    assert.equal(x.calls[0].childNodes[0].namespaceURI,NS);
});
test('native non-host cannot submit transfer IQ',async()=>{
    const x=outgoing({isModerator:()=>false});await assert.rejects(x.run());assert.equal(x.calls.length,0);
});
