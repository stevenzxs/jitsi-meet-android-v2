import { DOMImplementation } from '@xmldom/xmldom';

const NS = 'urn:cloudmeet:host-control:1';

/** Native transfer replaces grantOwner; the server is the authority boundary. */
export async function requestNativeHostTransfer(conference: any, participantId: string): Promise<void> {
    const room = conference?.room;
    const wrapper = conference?.getConnection?.()?.xmpp?.connection;
    const connection = wrapper?._stropheConn ?? wrapper;
    const target = `${room?.roomjid}/${participantId}`;
    const member = room?.members?.[target];

    if (!conference?.isJoined() || !conference.isModerator() || !connection?.connected
        || !/^[A-Za-z0-9_-]{1,64}$/.test(participantId) || member?.role !== 'participant'
        || member.isFocus || (member.affiliation && member.affiliation !== 'none')
        || !/^[^\s@/]+@[^\s/]+\/[^\s]+$/.test(member.jid || '') || target === room.myroomjid) {
        throw new Error('主持人或接任成员身份尚未确认');
    }
    const operationId = `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    const doc = new DOMImplementation().createDocument(null, 'root', null);
    const iq = doc.createElementNS('jabber:client', 'iq');

    for (const [ k, v ] of Object.entries({ xmlns: 'jabber:client', type: 'set', to: room.roomjid, from: connection.jid })) {
        iq.setAttribute(k, v as string);
    }
    const command = doc.createElementNS(NS, 'transfer');

    command.setAttribute('xmlns', NS);
    command.setAttribute('operationId', operationId);
    command.setAttribute('target', target);
    iq.appendChild(command);
    const response: any = await new Promise((resolve, reject) => connection.sendIQ(iq, resolve,
        () => reject(new Error('转让尚未确认，请检查会议状态，勿重复操作')), 10000));
    const result: any = Array.from(response.childNodes || []).find((n: any) => n.localName === 'transfer' && n.namespaceURI === NS);

    if (!conference.isJoined() || response.getAttribute('from') !== room.roomjid
        || result?.getAttribute('operationId') !== operationId || result?.getAttribute('state') !== 'roles-committed') {
        throw new Error('转让结果尚未核实');
    }
}

export interface IHostReceipt {
    hostKey: string;
    operationId: string;
    expiresAt: number;
}

interface IOptions {
    conference: any;
    room: string;
    persist(receipt: IHostReceipt): Promise<void>;
    complete(receipt: IHostReceipt): Promise<void>;
    revoked(operation: string): Promise<void>;
    pending?(): Promise<IHostReceipt | undefined>;
    proof?(key: string, message: string): Promise<string>;
    onError(): void;
}

/** Bind private receipts to the real authenticated conference, never peer data. */
export function attachNativeHostTransfer(options: IOptions): () => void {
    const { conference, room } = options;
    const wrapper = conference.getConnection?.()?.xmpp?.connection;
    const connection = wrapper?._stropheConn ?? wrapper;
    const roomJid = conference.room?.roomjid;

    if (!/^\d{9}$/.test(room) || !roomJid?.startsWith(`${room}@`) || !connection?.connected
        || typeof connection.addHandler !== 'function' || typeof connection.sendIQ !== 'function') {
        return () => undefined;
    }
    let stopped = false;
    let queue: Promise<void> = Promise.resolve();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => !stopped && connection.connected && conference.isJoined()
        && conference.room?.roomjid === roomJid;
    const child = (stanza: any, name: string) => Array.from(stanza.children || stanza.childNodes || [])
        .find((node: any) => node.localName === name && node.namespaceURI === NS) as any;
    const request = (name: string, attributes: Record<string, string>) => {
        const doc = new DOMImplementation().createDocument(null, 'root', null);
        const iq = doc.createElementNS('jabber:client', 'iq');

        for (const [ key, value ] of Object.entries({ xmlns: 'jabber:client', type: 'set', to: roomJid, from: connection.jid })) {
            iq.setAttribute(key, value);
        }
        const command = doc.createElementNS(NS, name);

        command.setAttribute('xmlns', NS);
        for (const [ key, value ] of Object.entries(attributes)) command.setAttribute(key, value);
        iq.appendChild(command);

        return new Promise<any>((resolve, reject) => connection.sendIQ(iq, resolve,
            () => reject(new Error('Host receipt unconfirmed')), 10000));
    };
    const acknowledge = async (receipt: IHostReceipt) => {
        try {
            const response = await request('ack', { operationId: receipt.operationId });

            if (!current() || response.getAttribute('from') !== roomJid
                || child(response, 'ack')?.getAttribute('state') !== 'complete'
                || child(response, 'ack')?.getAttribute('operationId') !== receipt.operationId) {
                throw new Error('Unverified host receipt');
            }
        } catch {
            // /complete may have committed but its response was lost. Only the
            // authenticated API token fence may establish durable completion.
            if (!current()) return;
        }
        if (current()) await options.complete(receipt);
    };
    const handler = connection.addHandler((message: any) => {
        if (!current() || message.getAttribute('from') !== roomJid || message.getAttribute('type') !== 'normal') {
            return true;
        }
        const revoked = child(message, 'revoked');
        const credential = child(message, 'credential');

        if (revoked) {
            const operation = revoked.getAttribute('operationId');

            if (/^[A-Za-z0-9_-]{1,64}$/.test(operation || '')) {
                queue = queue.then(async () => {
                    if (current()) await options.revoked(operation);
                }).catch(() => options.onError());
            }

            return true;
        }
        const operationId = credential?.getAttribute('operationId');
        const hostKey = credential?.getAttribute('hostKey');
        const identity = credential?.getAttribute('identity');

        if (!/^[A-Za-z0-9_-]{1,64}$/.test(operationId || '') || !hostKey || hostKey.length > 128
            || !/^host-v1-[A-Za-z0-9_-]{43}$/.test(identity || '')) return true;
        const receipt = { hostKey, operationId, expiresAt: Date.now() + 300000 };

        queue = queue.then(async () => {
            if (!current()) return;
            await options.persist(receipt);
            if (!current()) return;
            await acknowledge(receipt);
        }).catch(() => options.onError());

        return true;
    }, NS, 'message');

    const retry = async () => {
        try {
            const pending = await options.pending?.();

            if (!current()) return;
            if (pending && pending.expiresAt > Date.now()) {
                try {
                    await acknowledge(pending);
                } catch {
                    const response = await request('recover', { operationId: pending.operationId });
                    const challenge = child(response, 'challenge');
                    const attr = (name: string) => challenge?.getAttribute(name) || '';
                    const expected = attr('expectedRoomInstance');
                    const instance = attr('roomInstance');
                    const nonce = attr('nonce');

                    if (!current() || response.getAttribute('from') !== roomJid
                        || attr('roomName') !== room || attr('operationId') !== pending.operationId
                        || attr('targetSession') !== connection.jid
                        || !/^[A-Za-z0-9_-]{1,128}$/.test(expected)
                        || !/^[A-Za-z0-9_-]{1,128}$/.test(instance) || instance === expected
                        || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce)
                        || !(Number(attr('expiresAt')) > Date.now() / 1000) || !options.proof) {
                        throw new Error('Unverified recovery challenge');
                    }
                    const proof = await options.proof(pending.hostKey, [ 'host-transfer-rebind-v1', room,
                        pending.operationId, connection.jid, expected, instance, nonce ].join('\n'));

                    if (!current()) return;
                    const rebound = await request('rebind', { operationId: pending.operationId, nonce, proof });

                    if (!current() || rebound.getAttribute('from') !== roomJid
                        || child(rebound, 'rebind')?.getAttribute('state') !== 'roles-committed'
                        || child(rebound, 'rebind')?.getAttribute('operationId') !== pending.operationId) {
                        throw new Error('Unverified recovery result');
                    }
                    await acknowledge(pending);
                }
            } else if (!pending && conference.isModerator?.()) {
                await request('claim', {});
            }
        } catch { if (current()) options.onError(); }
        finally { if (current()) timer = setTimeout(() => { queue = queue.then(retry); }, 5000); }
    };

    if (options.pending) timer = setTimeout(() => { queue = queue.then(retry); }, 5000);

    return () => { stopped = true; if (timer) clearTimeout(timer); connection.deleteHandler(handler); };
}
