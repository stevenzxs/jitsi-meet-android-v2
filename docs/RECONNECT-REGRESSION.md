# Android reconnect regression

Run `npm run test:reconnect` after installation (postinstall applies the pinned
lib-jitsi-meet patch). Tests execute methods from the installed dependency rather
than maintaining a separate implementation.

## Automated gates

- A late XMPP resume after the 65-second media reachability timeout re-arms recovery.
- Cancelled tasks, departed rooms and replaced media sessions cannot restart media.
- Repeated connected notifications cannot create duplicate reachability requests.
- Successful current JVB establishment resets the ICE retry budget for independent outages.
- Consecutive failed recoveries remain limited to three; stale establishment events
  cannot reset the current session's budget.

## Device acceptance (not replaced by unit tests)

Use an explicit instance client configuration; preserve application data and trust.
In a fresh diagnostic meeting establish Android camera/audio RTP to installed Electron.
Disable both Android Wi-Fi and mobile data for 90, 25, 65, 90 seconds, allowing
at least 65 seconds of recovery observation between rounds. Restore networking in
`finally`. Do not interrupt server networking or unrelated user meetings.

For every round record XMPP participant identity, room, Jingle restart/accept,
and new inbound RTP byte/packet and decoded-frame growth over multiple samples.
Frozen old RTP entries and the receiving client's own connected ICE are not proof
of recovered Android media. An automatic conference reload with a new identity
is a separate result, not a pass for same-session recovery.

When a new stream starts and then freezes, compare its counters with Android
capture/encode logs and the JVB receiver bandwidth allocator. Record bridge
conference ID as well as XMPP participant IDs: a recreated bridge conference is
not the same recovery context even when XMPP identities remain unchanged.
Collect padding/probing RTP separately from video carrying decoded frames; loss
on a zero-frame probing SSRC alone does not prove camera packet loss. A fresh
receiver rejoin is a diagnostic control, never a substitute for recovery passing.

Check both video directions, mute/camera controls and clean leave. Record exact
APK/MSI versions and hashes, source commits, deployed Web asset and same-origin
page/iframe. Explicitly list untested background/network-switch/share/soak cases;
do not claim broader acceptance from this reconnect suite.
