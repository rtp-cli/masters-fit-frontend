---
name: toggle-bug-icon
description: Use to show or hide the floating debug "bug" icon (the network-logger button) in the mobile app during development — "hide the bug icon", "disable the bug button", "show the bug icon", "bring back the debug button", "toggle the bug icon". It's distracting during UI/layout work, so this flips it off (and back on) with a single flag.
---

# Toggle the floating bug (network-logger) icon

The floating **bug icon** is the `FloatingNetworkLoggerButton` — a dev-only round button
(bottom-right) that opens the in-app network logger. It's mounted globally in
[`app/_layout.tsx`](../../../app/_layout.tsx) and only ever renders in dev builds
(`__DEV__` or a secret-tap debug activation), so it **never ships to production** — this
skill is purely about getting it out of the way while working on the app locally.

## The one thing this controls

A single boolean at the top of the component
[`components/ui/floating-network-logger-button.tsx`](../../../components/ui/floating-network-logger-button.tsx):

```tsx
// TEMP: hidden while redesigning the auth/welcome flow — the floating bug icon
// is distracting during layout work. Set back to false to restore it.
const TEMPORARILY_HIDDEN = true;
```

- `true`  → icon **hidden** everywhere (even in dev).
- `false` → icon restored to its **normal dev behavior** (shows in `__DEV__` / on secret-tap).

## What to do

1. Read `components/ui/floating-network-logger-button.tsx` and find the
   `const TEMPORARILY_HIDDEN = ...` line.
2. Set the value based on what the user asked:
   - **"hide" / "disable" / "turn off"** → `true`
   - **"show" / "enable" / "bring back" / "restore"** → `false`
   - **"toggle"** or ambiguous → flip whatever it currently is, and tell the user the new state.
3. If the flag is somehow missing (e.g. the component was reverted to the plain
   `if (!__DEV__ && !isDebugModeActivated)` guard), re-add the `TEMPORARILY_HIDDEN`
   constant and fold it into that same guard:
   ```tsx
   if (TEMPORARILY_HIDDEN || (!__DEV__ && !isDebugModeActivated)) {
     return null;
   }
   ```
   This keeps lint clean (no unreachable-code warning).
4. Do **not** touch the `<FloatingNetworkLoggerButton />` mount in `app/_layout.tsx`, the
   `useSecretActivationContext` gate, or the `/network-logger` route — the flag is the only
   knob.

## Verify

- Run `npm run lint` on the file — expect it clean (0 warnings).
- Reload the app in the simulator (press `r` in the Expo/Metro terminal). Confirm the
  bug icon disappeared (when hiding) or reappeared bottom-right (when showing).
- Tell the user the resulting state ("bug icon now hidden" / "bug icon restored").
