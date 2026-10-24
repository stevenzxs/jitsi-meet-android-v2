# Hide Settings Server Address Implementation Plan

**Goal:** Remove the native conference settings server address row without changing the configured meeting endpoint.

**Architecture:** Remove the address input and its local editing effects from ConferenceSection. Preserve all three conference switches and leave connection settings, defaults and persisted values untouched.

**Tech Stack:** React Native, TypeScript, node:test.

## Steps
1. Add a regression check to `scripts/tests/profile-settings.test.cjs` asserting no address input or serverURL writes remain and all conference switches remain.
2. Run the targeted test and observe failure before implementation.
3. Remove unused input imports, address state, callbacks and cleanup effect from `react/features/settings/components/native/ConferenceSection.tsx`.
4. Run the script suite, native ESLint and `git diff --check`.

No automatic commit, push, build or installation in this task.
