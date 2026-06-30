# Handoff: MastersFit UX/UI Remediation

## Overview
This package hands off a prioritized backlog of UX/UI fixes for the **MastersFit** mobile app (`rtp-cli/masters-fit-frontend`, React Native + Expo + NativeWind). It consolidates two independent reviews — a static code audit and a design/accessibility audit — into 25 deduped, file-referenced tickets, plus a working visual target for the four token-layer fixes.

This is **not** a fresh design to build from scratch. It is a remediation plan for an existing codebase: implement the tickets in `BACKLOG.md` against the live repo, using its established patterns (NativeWind classes, `lib/theme.ts` tokens, the component library under `components/`).

## How to work this handoff (for Claude Code)
1. Start with `BACKLOG.md` — the single source of truth. Tickets are `MF-001`…`MF-025`, grouped into epics, with **Priority**, **Source**, **Files**, **Problem**, and **Acceptance criteria**.
2. Work in the suggested sprint order at the bottom of the backlog: **correctness/trust (P0) → ergonomics & legibility (P1) → design-system consolidation → flow polish + a11y pass**.
3. For the token-layer tickets (MF-004, MF-005, MF-007, MF-008), the **visual target** is `token-fixes.html` and the **proposed values** are in `colors.proposed.css` / `typography.proposed.css`. Port those values into `lib/theme.ts` / `tailwind.config.js`; do not ship the CSS files themselves.
4. **Verify line numbers before editing.** Codex's citations are from `@main` and may have drifted; confirm against the current checkout.
5. Several tickets are best solved by building shared primitives first (MF-014–017) — doing so retires duplicated logic and styling drift (MF-002, MF-018) at the source rather than patching each call site.

## About the design files
The files in this bundle are **references, not production code**:
- `token-fixes.html` is an HTML prototype showing the intended *before → after* for the token fixes. Recreate the intent in React Native using the app's theme system — do not copy the HTML/CSS.
- `colors.proposed.css` / `typography.proposed.css` are **proposed token values** to port into `lib/theme.ts` and `tailwind.config.js`, not stylesheets to add to the app.

## Fidelity
**Mixed, by ticket:**
- The token-fix prototype (`token-fixes.html`) is **high-fidelity** — exact hex values, sizes, and the specific non-color status treatments are the target. Match them.
- Everything else in the backlog is **specification-level**: acceptance criteria describe required behavior/outcomes, not pixel layouts. Apply the codebase's existing components and design system to satisfy them.

## The four token-layer fixes (high-fidelity target)
See `token-fixes.html` rendered for the visual.

- **MF-004 — success ≠ primary.** `success` is currently `=== brand.primary` (`#0A0A0A`). Decouple it into its own token and give completion a reserved **form** (outlined ink + check + ring), not a new hue — monochrome character is preserved.
- **MF-005 — kill color-only status.** Every status (weekly bars, calendar dots, completion, selection) must carry a non-color cue: solid+✓ (complete), hatch fill (partial), ink outline ring (today), dashed outline (upcoming), flat line + label (rest), × glyph in danger (missed). Add a calendar legend.
- **MF-007 — dark-mode AA.** Raise `text.muted` dark from `#686868` (~3.7:1, FAIL) to `#8C8C8C` (~5.0:1, PASS). Drive status bar style + logo asset from theme mode instead of hardcoding.
- **MF-008 — type floor.** Raise `xs` 11→13px, `base` 15→16px; never combine the smallest size with muted color; honor OS Dynamic Type.

## Proposed design tokens
From `colors.proposed.css` / `typography.proposed.css` (light unless noted):
- `--color-success: #0A0A0A` (dark: `#FFFFFF`) — decoupled from primary; differentiation via form.
- Status palette: complete `#0A0A0A` · partial `#6B6B6B` · today `#0A0A0A` · upcoming `#C8C8C8` · rest `#E0E0E0` · missed `#DC2626` (each + a required non-color cue).
- `--color-text-muted` dark: `#686868` → `#8C8C8C`.
- `--text-xs` 11→13px, `--text-sm` 13→14px, `--text-base` 15→16px.

## Assets
No new assets required. MF-007 references the existing `assets/logo.png` (white, dark bg) and `assets/logo-dark.png` (black, light bg) — the fix is to select the correct one by theme.

## Files in this bundle
- `BACKLOG.md` — the 25-ticket remediation backlog (primary deliverable).
- `token-fixes.html` — before/after visual target for MF-004/005/007/008. Open in a browser.
- `colors.proposed.css` — proposed color/status/dark-mode token values to port.
- `typography.proposed.css` — proposed type-scale floor values to port.

## Source repo
`github.com/rtp-cli/masters-fit-frontend` @ `main`. Key files referenced across tickets: `lib/theme.ts`, `tailwind.config.js`, `app/(tabs)/workout.tsx`, `app/(tabs)/_layout.tsx`, `components/dashboard/dashboard-screen.tsx`, `components/dashboard/sections/*`, `components/adaptive-set-tracker.tsx`, `components/header.tsx`, `components/search/search-view.tsx`, `components/calendar/sections/*`, `components/login/login-screen.tsx`.
