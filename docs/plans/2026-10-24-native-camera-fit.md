# Android Camera Fit Implementation Plan

**Goal:** Show the full camera frame on the Android main stage without changing thumbnail cropping, screenshare gestures, or media quality settings.

**Architecture:** Pass an optional objectFit rendering preference through the video track. Native ParticipantView requests contain only for the main stage (identified by its existing zoomEnabled prop). Keep actual pinch zoom restricted to desktop tracks. Web ignores this native-only preference.

**Tech Stack:** React Native, TypeScript, react-native-webrtc, node:test.

## Approved design
- Prefer full-frame contain with letterboxing over cover cropping on the main stage.
- Do not globally change cover, enable camera zoom, or raise bitrate/resolution.
- Preserve screen sharing and thumbnail behavior.

## Execution
1. Add regression tests covering native stage/thumbnail preference, propagation, and camera vs screenshare gestures; observe failure before implementation.
2. Add optional objectFit props and wire native main-stage contain. Run tests and targeted ESLint.
3. Build Android Release offline and install with adb install -r, preserving data.
4. Collect live Electron outbound and Android inbound video statistics if a test session is available; otherwise explicitly record the missing live evidence. Do not infer actual quality from configured limits.

## Acceptance
- Main-stage camera uses contain; thumbnails still use cover.
- Desktop sharing remains contain with existing zoom gestures.
- All repository script tests pass; Release builds and installs.
- No backend, Electron, codec, bitrate, or resolution configuration changes.
- No push/deployment as part of this change.
