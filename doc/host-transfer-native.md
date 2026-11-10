# Native host-control integration

The native conference receives private `urn:cloudmeet:host-control:1` credentials
only from its exact authenticated bare room JID. Peer occupants, wrong namespaces,
stopped connections and malformed operation/identity values cannot supply a receipt.

Keystore-backed planner writes and readback precede acknowledgement. Pending
receipts do not authorize business writes. Completion requires successful API
host-token issuance, including when the IQ completion reply was lost. Receipts
are scoped by configured server origin and room. Duplicate delivery must not
downgrade completed authority; revocation matches the exact operation.

The retry path first retries receipt completion, then validates a room/session
challenge before generating a native HMAC-SHA256 key-possession proof and rebind.
Private keys, tokens and stanza bodies must never enter Redux, URLs or logs.
Native menu confirmation invokes the custom transfer IQ instead of `grantOwner`.
Other server origins retain upstream behavior.

Run `node --test scripts/test-host-transfer.cjs scripts/test-host-receipt-storage.cjs`.
These tests replace transport/storage boundaries and do not prove device behavior.
Whole native typecheck currently reports10 unrelated global Window typing errors;
ESLint cannot read missing tsconfig.web.json. Neither check is reported as passing.

Release gate: new signed APK installed with data retained, paired installed
Electron product UI transfer in both directions, recipient ack, API key revocation,
lost-response/pending recovery and final test-meeting cleanup. Keep production
transfer disabled until compatible clients and backend gates are verified.
