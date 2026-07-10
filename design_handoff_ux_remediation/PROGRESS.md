# MastersFit UX Remediation — Working Plan & Progress

> Source of truth for the remediation effort. Derived from `BACKLOG.md` (the 25-ticket
> merge) after code-verification against the live checkout and three product decisions.
> This file is the **loop's checklist**: each iteration picks the next unchecked
> loop-track ticket, implements it, verifies, commits, and checks the box.

## Decisions made (2026-06-30)
- **Success/status color:** Break monochrome **only for completion**. Introduce ONE reserved
  success accent, used nowhere else. Candidate values (confirm on device before porting):
  - light `--color-success: #1B7A4B` (green; on white reads AA), check on `#FFFFFF`
  - dark  `--color-success: #34C77B` (lighter green for near-black surfaces)
  - All OTHER statuses keep the monochrome + non-color-cue scheme from `colors.proposed.css`.
- **Timers (MF-003):** Undecided — deferred. Evaluate the half-state in the simulator, then
  choose restore-vs-remove. Not on the loop track until decided. **Re-confirmed deferred
  2026-07-09** — reviewed and chose to keep deferring rather than an oversight.
- **Delivery:** Loop commits to a **single batch feature branch**; reviewed as a batch (not PR-per-ticket).

## Hard precondition (gate — nothing loops until green)
- [ ] **G0 — Green baseline.** `tsc --noEmit` currently fails on ~5 pre-existing errors
      (`lib/workouts.ts`, `types/api/logs.types.ts`, `types/calendar.types.ts`); `npm run lint`
      also red. Clear to green (per the agreed lint-backlog plan) so the loop has a real
      pass/fail gate. **The loop is unsafe without this.**

---

## Track 1 — Quick wins (do now, by hand, ~half a day)
Real bugs, low-risk, no design debate. Build momentum + confidence.
- [x] **MF-001 · P0** — Added a `card` **color** token to `tailwind.config.js` + `createThemeVars`
      in `lib/theme.ts`, defaulting to each theme's `surface` (`themeColors.card ?? surface`) so all
      10 themes resolve and `bg-card` is no longer dropped. `card?` knob left on the palette type for
      MF-010 to widen the tonal step later. *(grep check for undefined color classes still TODO.)*
- [x] **MF-002 · P0** — Added explicit `6M`/`1Y` cases to `filterDataByDateRange`
      ([dashboard-screen.tsx:319](../components/dashboard/dashboard-screen.tsx#L319)); added single
      `formatTimeRangeLabel` helper in `utils/index.ts`; replaced the fallthrough ternaries in all 3
      analytics cards. *(supported-ranges prop deferred to MF-016 — all 5 ranges are now valid.)*

## Track 2 — Primitives (high leverage — build before the a11y retrofit)
Pulled forward from the backlog's Sprint 3. These are the *delivery mechanism* for MF-009,
MF-002 dedup, and MF-022 — fix once in a primitive, not at hundreds of call sites.
- [x] **MF-014 · P1** — New `components/icon-button.tsx`: fixed 44×44 target, `accessibilityRole`,
      required `accessibilityLabel`, hitSlop, disabled state, surface/ghost/primary variants.
      *(Retrofit of header/search/workout/calendar call sites happens in MF-009.)*
- [x] **MF-015 · P1** — Extended existing `components/button.tsx` (was 0 usages, per its own TODO)
      instead of a new `ActionButton`: added `accessibilityRole`/`accessibilityState`, a 44px
      `min-h` floor, and fixed `destructive` to use the `danger` token (was wrongly `bg-secondary`
      — also advances MF-013). API unchanged, so it's drop-in for the retrofit.
- [x] **MF-016 · P1** — New `components/segmented-control.tsx`: generic `SegmentedControl` (accessible,
      `selected` state) + `TimeRangeSegmentedControl` with a `supportedRanges` prop. **Retrofitted all
      3 analytics cards** to it — retires the duplicated segmented rows that let MF-002 slip in.
- [ ] **MF-017 · P2** — `AppCard` (extend existing `card.tsx`), `SectionHeader`, `EmptyState`
      (a `dashboard-empty-state.tsx` already exists to generalize), `MetricTile`, `ModalDialog`.

## Track 3 — Loop-safe (mechanical, verifiable by lint/tsc/grep + grayscale screenshot)
Safe to grind autonomously once G0 is green and primitives exist.
- [ ] **MF-007 · P1** — Dark `text.muted` `#686868 → #8C8C8C`; theme-drive StatusBar style + logo asset.
- [ ] **MF-008 · P1** — Type floor: `xs` 11→13, `sm` 13→14, `base` 15→16; honor Dynamic Type;
      never combine smallest size with muted color.
- [~] **MF-009 · P0** — A11y retrofit, IN PROGRESS. **Done:** header (2 icon buttons → `IconButton`),
      search clear + date controls (role/label/hitSlop/selected-state in place), workout round-chips
      (role/label/selected + hitSlop) and bottom action bar (roles + End-Workout disabled state).
      **Insight:** most icon controls are bespoke (inline/bordered/number-or-check), so `IconButton`
      only fit the header cleanly; the rest got a11y props in place. **Remaining (long tail, good
      /loop candidate):** set-tracker +/- buttons, calendar actions, settings/subscription rows, and
      the onboarding/login error `role="alert"` + focus-to-first-invalid-field.
- [ ] **MF-018 · P2** — Kill styling drift (hardcoded reds, `text-white`, `tintColor="#fff"`, inline shadows).
- [ ] **MF-024 · P2** — Strength-progress chart: relabel raw stats or compute from smoothed series.

## Track 4 — Human-in-loop (design fidelity / product decisions — pair on simulator)
Cannot be confirmed from a diff. Decision ① (success accent) gates MF-004/005.
- [ ] **MF-003 · P0** — Timers: decide restore-vs-remove (deferred), then implement; no dead state left.
- [x] **MF-004 · P0** — Decoupled `success` from `brand.primary` into its own palette token.
      Reserved green: light `#1B7A4B` / dark `#34C77B` (Original theme; other themes fall back to
      primary until reviewed). Check/text on the green uses `contentOnPrimary` (matching polarity).
      **Hue signed off on-device 2026-07-09** — round chips, exercise-overview completed badge,
      weekly bars, calendar dots. Also caught and migrated `workout-summary.tsx`'s completion
      checkmarks (icons + per-exercise badge), which were still hardcoded to `brand.primary` —
      a surface MF-005's rollout hadn't reached yet.
- [x] **MF-005 · P0** — Color-only-status sweep. **Done:** completion circles (MF-004);
      weekly-progress bars (complete = green + "✓ %" label, all bars already carry Rest/-/%/0% labels);
      calendar completed dots = green + a **legend** (Completed / Scheduled / Today); workout-summary
      checkmarks (see MF-004 note). **Selection-as-status audit, resolved 2026-07-09**: the
      selected/today day's dot was hardcoded to `selectedDotColor: contentOnPrimary`, so a
      completed day's dot went white the moment it was selected — the solid `brand.primary`
      selection fill needed guaranteed contrast, at the cost of erasing the status signal.
      Changed the selected-day treatment from a filled circle to a **ring** (`calendar-view.tsx`'s
      `stylesheet.day.basic.selected`: transparent background, 2px border, sized up to 36x36 so
      the border doesn't crowd the inner dot) and dropped the `selectedColor`/`selectedDotColor`
      overrides in `calendar-screen.tsx`'s `getMarkedDates` — the dot now keeps its real color
      regardless of selection. Signed off on-device. **Still open, not part of this pass:** true
      shape/icon-per-dot (needs a custom `dayComponent` — deferred, library limit); a broader
      app-wide selection-as-status sweep beyond the calendar (this pass only covered the one
      instance found).
- [ ] **MF-006 · P1** — Reserve solid ink for the single primary action per screen; document the rule.
- [ ] **MF-010 · P1** — Cards read as distinct (wider tonal step or default border); bright-environment check.
- [x] **MF-011 · P1** — Labeled the 3 bottom tabs (`tabBarShowLabel: true` + "Dashboard"/"Workout"/
      "Calendar", height bumped to fit). Non-color selected cue: active tab uses the **solid** icon,
      inactive uses **outline** (not just tint). *(Verify labels render under the custom tabBarButton.)*
- [ ] **MF-012 · P1** — Reduce in-session density; collapse overview after start; compact progress rail.
- [x] **MF-013 · P1** — Split the ambiguous "End Workout" into a 3-way dialog: **Continue Workout**
      (safe default) / **Finish & Save Progress** (saves partial, marks day done) / **Abandon Workout**
      (destructive, red) — wording + behavior mirror the existing tab-away dialog; Abandon calls
      `abandonWorkout` + routes to Dashboard, day stays resumable. *(Verify the destructive path on sim.)*
- [ ] **MF-019 · P2** — Search initial state + date-search discoverability.
- [ ] **MF-020 · P2** — Settings hierarchy (Account / Training Profile / Subscription / App).
- [ ] **MF-021 · P2** — Subscription clarity (monthly-equiv, terms, tokenized colors, restore state).
- [ ] **MF-022 · P2** — Calendar regen copy + dot legend (depends on MF-001/005/015).
- [ ] **MF-023 · P2** — Rest-day / no-plan empty states (uses `EmptyState`).
- [ ] **MF-025 · P2** — Onboarding review step before first plan generation.

---

## Dependency notes
- MF-016 supersedes the MF-002 hand-fix → after MF-016, MF-002's filter logic lives in one control.
- MF-009 should be delivered *through* MF-014/015/016, not as standalone call-site edits.
- MF-022 depends on MF-001 + MF-005 + MF-015. MF-023 depends on MF-017 (`EmptyState`).
- MF-010 pairs with MF-001 (surface separation is both a token and a tonal-step problem).

## Verification per ticket (loop gate)
1. `npm run lint` clean for touched files · 2. `tsc --noEmit` no NEW errors ·
3. grep check passes (no undefined color classes) · 4. for visual tickets, a grayscale
simulator screenshot of the changed screen attached to the batch review.
