# LOOP_QUEUE — autonomous loop-safe tasks

> This is the **source of truth for the `/loop`**. Each task is atomic, additive, and
> verifiable without a human looking at the screen. The loop does ONE unchecked task per
> iteration, verifies, commits, checks the box, and continues. When all are checked, STOP.
>
> **Out of scope for the loop** (need judgment / visual review — leave for hand work):
> onboarding/login focus-to-first-invalid-field, logo + StatusBar theme-awareness (MF-007b),
> and anything in Track 4 of PROGRESS.md. Do NOT attempt these here.

## The gate (run after every task; if it fails, REVERT the task and check it off as BLOCKED)
- `npx tsc --noEmit 2>&1 | grep -c "error TS"` **must equal 35** (frozen pre-existing baseline).
  If it rises, your change introduced a type error — revert.
- `npx eslint --quiet <each file you touched>` — the `N problems` count for each file **must not
  exceed its count before your change** (stash-diff to confirm). Autofix ONLY import-sort/prettier
  on files you touched, never broad fixes.
- Plus the per-task assertion listed on the task.
- Commit each completed task to the current branch (`feat/ux-remediation`) with a clear message
  and the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer. One commit per task.

## Conventions (from CLAUDE.md)
- a11y additions are **additive only** — add `accessibilityRole`/`accessibilityLabel`/
  `accessibilityState`/`hitSlop`; do not restyle, rename, or change behavior.
- Icon-only controls need a meaningful `accessibilityLabel`. Visual target may stay small if a
  `hitSlop` brings the effective target to ~44px.
- kebab-case files, theme tokens (no hardcoded hex), `@/` import aliases.

---

## Tasks

- [x] **L1 · MF-007a — dark muted token.** In `lib/theme.ts`, change `darkColors.text.muted`
  from `#686868` to `#8C8C8C` (raises dark-mode muted text to ≥4.5:1 AA). Token only.
  **Assert:** `grep -n '#8C8C8C' lib/theme.ts` matches the darkColors muted line; `#686868`
  no longer present as a text.muted value.

- [x] **L2 · MF-008 — type-scale floor.** Raise the floor in BOTH `tailwind.config.js`
  (`fontSize`) and `lib/theme.ts` (`typography.fontSize`): `xs` 11→13, `sm` 13→14, `base` 15→16.
  Leave lg/xl/2xl/3xl/4xl unchanged. Token only — do NOT touch any component.
  **Assert:** both files show `xs:"13px"`/`xs:13`, `sm:"14px"`/`sm:14`, `base:"16px"`/`base:16`.
  **Flag in commit body:** VISUAL REVIEW REQUIRED — larger base text may reflow/clip some
  fixed-height rows; not sim-verifiable here.

- [x] **L3 · MF-009 — set-tracker a11y.** In `components/set-tracker.tsx`, add
  `accessibilityRole="button"` + a meaningful `accessibilityLabel` (and `hitSlop` if the visual
  target is <44px) to every interactive `TouchableOpacity` (increment/decrement, complete, etc.).
  Additive only. **Assert:** every `<TouchableOpacity` in the file has an `accessibilityLabel`
  (`grep -c "<TouchableOpacity"` == `grep -c "accessibilityLabel"` is a reasonable proxy; verify by eye in the diff).

- [x] **L4 · MF-009 — adaptive-set-tracker a11y.** Same as L3 for
  `components/adaptive-set-tracker.tsx`. Do NOT touch the commented-out timer code (that's MF-003,
  a deferred product decision). Additive a11y only.

- [x] **L5 · MF-009 — calendar actions a11y.** In `components/calendar/sections/action-buttons.tsx`
  (and any icon-only controls in `components/calendar/sections/calendar-view.tsx`), add
  role/label/hitSlop to interactive controls. Additive only.

- [x] **L6 · MF-018 — pull-to-refresh tint drift.** Replace hardcoded `tintColor="#fff"` /
  `tintColor="#ffffff"` on RefreshControl with a theme color via `useThemeColors()`
  (e.g. `colors.text.primary` or `colors.brand.primary` per context). Repo-wide.
  **Assert:** `grep -rn 'tintColor="#fff"' app components` returns nothing.

---

## Loop log (the loop appends one line per task: ID — DONE/BLOCKED — commit sha — note)
- L1 — DONE — dark text.muted #686868→#8C8C8C; tsc 35, lib/theme.ts lint unchanged (2)
- L2 — DONE — type floor xs/sm/base 11/13/15→13/14/16 (tailwind+theme); tsc 35. ⚠ VISUAL REVIEW
- L3 — DONE — set-tracker.tsx 9/9 touchables labeled + hitSlop on small ones; tsc 35, lint 0
- L4 — DONE — adaptive-set-tracker.tsx 11/11 labeled + hitSlop; tsc 35, lint unchanged (13, pre-existing timer code). Did NOT touch commented MF-003 timer.
- L5 — DONE — calendar action-buttons 3/3 + calendar-view "Today" 1/1 labeled (+hitSlop on Today); tsc 35, lint 0
- L6 — DONE — workout.tsx RefreshControl tintColor "#fff"→colors.text.primary (x2); tsc 35, workout lint unchanged (31). No tintColor=#fff remains.

## ALL TASKS DONE — loop complete.
