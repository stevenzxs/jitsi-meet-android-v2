# Native Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent dark/light settings and adapt all native UI, including conference canvas, without changing media content or remounting calls.

**Architecture:** Redux base/settings stores the selection. A native theme context supplies semantic palettes and resolves legacy style objects into themed variants. Consumers subscribe to context so PureComponent and memo boundaries update without remounting.

**Tech Stack:** React Native, TypeScript, Redux, React Navigation, React Native Paper, Node test runner, Android Gradle.

## Implementation refinement

Static native styles are widespread, including shared components and navigation options.
Use explicit themed native primitives at native component import boundaries to subscribe
to context and resolve legacy style props, rather than mutable globals or remount keys.
Preserve forwarded refs and inherited foreground contrast on media/action surfaces.
Navigation option objects and Paper-only controls still need explicit themed resolution.
The primitive migration is generated from TypeScript AST import declarations and is
restricted to native UI modules; it never wraps RTCView or changes media tracks.

---

### Task 1: Theme model and regression tests

Files: `react/features/base/ui/nativeTheme.ts`, `react/features/base/ui/components/JitsiThemeProvider.native.tsx`, `react/features/base/settings/reducer.ts`, `scripts/tests/native-theme.test.cjs`.

1. Add failing Node tests for default dark, invalid persisted values, light palette contrast, semantic styles, and preserved media overlays.
2. Run `node --test scripts/tests/native-theme.test.cjs`; confirm failure.
3. Implement immutable dark/light themes, context and legacy style resolution; persist `theme` through existing settings registry.
4. Re-run tests; expect pass.

### Task 2: Settings control and app integration

Files: `react/features/settings/components/native/GeneralSection.tsx`, `react/features/app/components/App.native.tsx`, `lang/main.json`, `lang/main-zh-CN.json`, `react/features/mobile/navigation/`.

1. Wire provider inside the Redux boundary, without changing navigator keys.
2. Add an accessible dark/light selector dispatching `updateSettings({ theme })`.
3. Add English and simplified Chinese translations; other locales fall back to English.
4. Adapt navigation and status bar themes; check persistence registration.

### Task 3: Reactive styles and canvas

Files: native style consumers under `react/features/`, base participant/media styles, conference and filmstrip components.

1. Inventory static imports and hard-coded surfaces.
2. Migrate function components to context hooks and class components to theme subscriptions without changing component identity.
3. Resolve legacy style objects by semantic palette roles, with explicit exceptions for video overlays, action text and status colors.
4. Adapt video containers and inspect WebRTC native letterboxing support before changing it.
5. Run native TypeScript and changed-file ESLint; distinguish pre-existing failures from introduced errors.

### Task 4: Build and device verification

1. Run theme tests, JSON parsing, diff checks, and native TypeScript checks.
2. Build: `LIBRE_BUILD=true`, `gradlew.bat :app:assembleRelease --offline --console=plain` from `android/`.
3. `adb install -r` on the connected device; verify dark/light settings, screenshots, navigation and restart persistence.
4. Verify conference canvas and media behavior if a reachable meeting service is available; report untested paths explicitly.
5. Review final diff, record evidence and leave implementation unpushed unless requested.
