# MastersFit — UX/UI Remediation Backlog

> Consolidated from two independent reviews of `rtp-cli/masters-fit-frontend@main`:
> **[Codex]** — static code audit (file/line citations, correctness bugs).
> **[Claude]** — design/experience + accessibility audit (root-cause, audience framing).
> **[Both]** — flagged independently by both passes → highest confidence.
>
> **Audience constraint that re-weights everything:** "Masters" = masters-age athletes (often 40–60+). Legibility, contrast, and tap-target tickets are *core*, not polish.
>
> Format per ticket: **ID · Priority · Source** — title / **Files** / **Problem** / **Acceptance criteria**.
> Priorities: **P0** correctness & trust · **P1** ergonomics, a11y, semantics · **P2** consolidation & polish.

---

## EPIC A — Correctness & Trust (P0)

### MF-001 · P0 · [Codex] — Define or replace undefined `bg-card`
- **Files:** `tailwind.config.js:8-56`; usages `app/(tabs)/workout.tsx:1991,2262,2300,2407`, `components/calendar/sections/action-buttons.tsx:90` (also circuit/video/picker surfaces).
- **Problem:** `bg-card` is used on high-traffic surfaces but no `card` token is defined. NativeWind may drop the class, so critical workout cards, bottom action bars, and the calendar edit button render with inconsistent surfaces across themes.
- **Acceptance criteria:**
  - A `card` color token is added to `tailwind.config.js` mapped to a theme CSS variable (light + dark), **or** every `bg-card` is replaced with `bg-surface`/`bg-background` per design role.
  - No `bg-card` (or any other undefined color class) remains; add a lint/grep check.
  - Cards visibly separate from the page surface in both themes (see MF-010).

### MF-002 · P0 · [Codex] — Dashboard range filters silently mislabel/misfilter `6M` & `1Y`
- **Files:** `components/dashboard/dashboard-screen.tsx:319-330` (`filterDataByDateRange`); label fallthrough e.g. `components/dashboard/sections/weight-performance.tsx:35-40`. Affects Weight Performance, Strength Progress, General Fitness Progress.
- **Problem:** Enum exposes `1W/1M/3M/6M/1Y` and cards render all of them, but filter logic only handles `1W/1M/3M`; `6M`/`1Y` fall back to 30 days and subtitles fall through to "Last 1 week." Users see wrong, mislabeled analytics — directly erodes trust in progress data.
- **Acceptance criteria:**
  - `filterDataByDateRange` handles `6M` and `1Y` explicitly with correct windows.
  - A single `getTimeRangeLabel`/`formatTimeRangeLabel` helper drives all subtitles (no per-card fallthrough).
  - Cards only render ranges they actually support (supported-ranges prop) — no unsupported filters shown.

### MF-003 · P0 · [Codex] — Resolve half-disabled workout timers
- **Files:** `components/adaptive-set-tracker.tsx:104-165` (exercise timer commented out); `app/(tabs)/workout.tsx:2191-2234` (rest timer UI commented out, state/modal paths remain).
- **Problem:** Timer state and UI affordances imply timers work, but the logic is commented out. Mid-workout ambiguity about whether a timer is running is high-friction.
- **Acceptance criteria:** A product decision is made and the code matches it:
  - **If supported:** restore countdown, test pause/resume, haptics, notifications, and background/foreground handling for both exercise and rest timers.
  - **If not supported:** remove all timer controls, state, and modal paths; replace with explicit manual logging.
  - No dead timer state remains in either file.

---

## EPIC B — Color semantics & token layer (P0/P1)

### MF-004 · P0 · [Claude] — `success` token collides with `brand.primary`
- **Files:** `lib/theme.ts` (`success` === `brand.primary` === `#0A0A0A` light / `#FFFFFF` dark).
- **Problem:** Completion — the most rewarding moment in a fitness app — is visually identical to every other ink element (CTA, active tab, streak, selected state). This is the *root cause* behind several color-only-status symptoms (MF-005).
- **Acceptance criteria:**
  - `success` gets a distinct, reserved visual treatment that survives the monochrome system (e.g. a dedicated check-in-filled-pill pattern, or a single reserved accent for success only).
  - A completed item is distinguishable from a default primary element without reading the label.
  - Decision documented in the design system `readme.md`.

### MF-005 · P0 · [Both] — Remove color-only status encoding
- **Files:** `components/dashboard/sections/weekly-progress.tsx` (bars); calendar dots `components/calendar/...`; workout completion circles `app/(tabs)/workout.tsx`; selection states app-wide.
- **Problem:** Status (complete / partial / upcoming / rest; planned / completed / missed calendar dots) is encoded only by grayscale shade. Greys are hard to discriminate, fails WCAG 1.4.1, and is worst-case for the masters audience.
- **Acceptance criteria:**
  - Every status uses a **non-color cue** in addition to shade: label, icon, fill-vs-outline, or pattern.
  - Weekly progress bars show a value/label per bar and differentiate states by more than lightness.
  - Calendar adds a **legend** and distinguishes planned/completed/missed/rest by shape or icon, not just dot color.
  - Verify each status pair is distinguishable in grayscale screenshot.

### MF-006 · P1 · [Claude] — Reduce overload of pure ink across semantic roles
- **Files:** `lib/theme.ts`, primary button / tab bar / streak chip / option / icon-badge components.
- **Problem:** The same `#0A0A0A` carries CTA, active tab, streak, selected option, completed bar, and icon badge. When everything important is the same black, hierarchy flattens.
- **Acceptance criteria:**
  - Solid-ink fill is reserved for the **single primary action per screen**; other roles step down to outline/grey/secondary treatments.
  - A documented rule in `readme.md` for when solid ink is allowed.

### MF-007 · P1 · [Both] — Dark mode contrast & theme-awareness pass
- **Files:** `lib/theme.ts` (`text.muted` dark `#686868`); `components/login/login-screen.tsx:210-248` (`StatusBar style="dark"`, `logo-dark.png` hardcoded); `components/onboarding-form.tsx` (same header).
- **Problem:** (a) Muted text in dark mode ≈3.7:1 on `#0A0A0A` — below AA 4.5:1; used for dates/metadata. (b) Status bar style and logo asset are hardcoded regardless of theme → low-contrast icons / wrong logo on dark.
- **Acceptance criteria:**
  - Dark-mode `text.muted` raised to ≥4.5:1 (≈`#8C8C8C`+); re-audit all muted usages.
  - `StatusBar` style and logo source are driven by theme mode (or a single asset that works on both).
  - Light-mode muted (`#757575` ≈4.5:1, at the line) is **not** combined with the smallest type size (see MF-008).

---

## EPIC C — Accessibility & audience legibility (P0/P1)

### MF-008 · P1 · [Claude] — Raise type-scale floor for masters audience
- **Files:** `lib/theme.ts` (`fontSize.xs = 11`, base = 15); usages: dates, bar labels, metadata.
- **Problem:** 11px `xs`, often in muted grey, is a strain for the target age group.
- **Acceptance criteria:**
  - `xs` floor raised to 12–13px; secondary metadata uses `sm` minimum.
  - Smallest size is never combined with muted color.
  - Support OS Dynamic Type — no fixed-height containers clipping scaled text.

### MF-009 · P0 · [Both] — Accessibility metadata + 44×44 tap targets
- **Files:** `components/header.tsx:123-134` (`w-10 h-10` icon buttons); `components/search/search-view.tsx:603-620`; `app/(tabs)/workout.tsx:2140-2165` (`w-9 h-9` chips), `:2409-2474` (bottom actions); set increment buttons `w-8 h-8`; tab bar.
- **Problem:** Hundreds of `TouchableOpacity` with few `accessibilityRole`/`accessibilityLabel`/`hitSlop`; many 32–40px visual targets. Hard to operate while moving/sweaty/one-handed; weak screen-reader labels.
- **Acceptance criteria:**
  - All icon-only controls have `accessibilityRole="button"` + meaningful `accessibilityLabel`.
  - `accessibilityState={{disabled, selected, expanded}}` where relevant.
  - Minimum 44×44 interactive target everywhere (visual circle may stay smaller via `hitSlop`/larger touchable).
  - Validation errors announce via `accessibilityRole="alert"` and move focus to first invalid field (onboarding/login).
  - Best delivered via shared primitives — see MF-014/015/016.

### MF-010 · P1 · [Both] — Card surfaces must read as distinct
- **Files:** card component(s), `lib/theme.ts` surface tokens. (Pairs with MF-001.)
- **Problem:** Even with `bg-card` fixed, the `#FFF`→`#F9F9F9` tonal step is too subtle to reliably separate cards from the canvas, especially on lower-quality displays in sunlight (outdoor/gym use).
- **Acceptance criteria:** Cards separate via a wider tonal step **or** a default subtle border/`outlined` variant in dense screens; verified legible in a bright-environment / low-brightness check.

### MF-011 · P1 · [Claude] — Label the bottom tab bar
- **Files:** `app/(tabs)/_layout.tsx`.
- **Problem:** Three icon-only tabs (stats/barbell/calendar) hurt learnability for older users.
- **Acceptance criteria:** Each tab has a visible text label; selected state distinguished by more than color (MF-005).

---

## EPIC D — Workout execution ergonomics (P1)

### MF-012 · P1 · [Both] — Reduce in-session density; keep current task dominant
- **Files:** `app/(tabs)/workout.tsx` — current exercise card `:1987`, overview `:2299`.
- **Problem:** Hero media + header + current block + current exercise + set tracker + notes + circuit logging + full overview + sticky actions + modals all compete during exercise.
- **Acceptance criteria:**
  - "Today's Workout Plan" / full overview collapses by default after workout start; replaced by a compact progress rail.
  - Current exercise + logging + bottom actions are the dominant visual elements.
  - Notes move behind an expandable row unless previously used.
  - Active exercise is unmistakable; a slim session-progress indicator is present (not just "3 of 6" in subheader).

### MF-013 · P1 · [Both] — Clarify finish vs abandon language
- **Files:** workout end flow / dialog in `app/(tabs)/workout.tsx`.
- **Problem:** "End Workout" is ambiguous between saving partial progress and discarding.
- **Acceptance criteria:** Distinct, explicit actions — "Finish Early" (save partial) vs "Discard Workout" (destructive, danger-styled, confirm). Destructive action uses `danger` token + confirmation.

---

## EPIC E — Design-system consolidation (P1/P2)

> These primitives, built with accessibility baked in, resolve MF-009 and much of the styling drift at the source. Build once, retrofit screens.

### MF-014 · P1 · [Both] — `IconButton` primitive
- 44×44 target, `accessibilityRole="button"`, required label, `hitSlop`, disabled state. Retrofit header, search, workout controls, calendar actions.

### MF-015 · P1 · [Both] — `ActionButton` primitive
- Variants: primary / secondary / destructive; loading; icon-left. Replaces ad-hoc buttons and `bg-card`-dependent calendar edit button. Maps to the design system's `Button`.

### MF-016 · P1 · [Both] — `SegmentedControl` primitive
- Supported-options prop, selected state, accessible role/state. **Resolves MF-002's duplication** — extract `TimeRangeSegmentedControl` + `formatTimeRangeLabel` used by all analytics cards.

### MF-017 · P2 · [Both] — `AppCard`, `SectionHeader`, `EmptyState`, `MetricTile`, `ModalDialog`
- `AppCard`: surface/background/card variants, border, radius, padding. `EmptyState`: icon/title/body/primary+secondary action (standardize the 3 empty patterns: full-screen, card, inline). `MetricTile`: label/value/trend/semantic color — also **fixes metric unit inconsistency** ("12" vs "4.5 h"). `ModalDialog`: one accessible pattern replacing duplicated modal button layouts.

### MF-018 · P2 · [Codex] — Kill styling drift
- **Files:** hard-coded error reds, `text-white` in subscription, `tintColor="#fff"` pull-to-refresh, inline shadows.
- **Acceptance criteria:** Common color/spacing moved to tokens/primitives; only semantically-external brand colors (e.g. YouTube red) may stay hardcoded.

---

## EPIC F — Flow-specific polish (P2)

### MF-019 · P2 · [Codex] — Search initial state & date-search discoverability
- **Files:** `components/search/search-view.tsx:573-620`.
- **AC:** Initial state with two clear actions (search exercises / browse by date); accessible label + visible selected date on the calendar icon; "Searching…" indicator near input; recent exercises/dates chips when data exists.

### MF-020 · P2 · [Codex] — Settings hierarchy
- **AC:** Group into Account / Training Profile / Subscription / App with per-section edit affordances; developer/debug content hidden unless activated.

### MF-021 · P2 · [Codex] — Subscription clarity
- **AC:** Show monthly-equivalent for annual; renewal/cancel terms near subscribe; tokenized text colors (not `text-white`); accessible, explicit restore-purchases state.

### MF-022 · P2 · [Both] — Calendar regeneration copy + dot legend
- **AC:** Separate "Regenerate this day" vs "Regenerate week"; consistent primary/secondary button styles (depends on MF-001/015); dot legend (depends on MF-005).

### MF-023 · P2 · [Claude] — Rest-day / no-plan empty states
- **Problem:** Dashboard always assumes an active workout; copy guidelines reference a rest-day message that has no surface.
- **AC:** Design rest-day and no-plan-yet states (uses `EmptyState`, MF-017); reinforce "recovery is part of training" tone.

### MF-024 · P2 · [Codex] — Chart semantics labeling
- **Files:** `components/dashboard/sections/strength-progress.tsx`.
- **AC:** Either compute summary stats from the same smoothed series, or relabel raw stats as "Latest Session Avg" / "Session Growth."

### MF-025 · P2 · [Codex] — Onboarding review step
- **AC:** Add a review step before first plan generation so users feel in control of AI output; keep current progressive flow; add sparing "why this matters" microcopy for health/limitations.

---

## Suggested sequencing (mirrors both roadmaps)

- **Sprint 1 — Correctness & Trust:** MF-001, MF-002, MF-003, MF-004, MF-005, MF-007, MF-009.
- **Sprint 2 — Ergonomics & legibility:** MF-006, MF-008, MF-010, MF-011, MF-012, MF-013.
- **Sprint 3 — Design-system consolidation:** MF-014 → MF-018 (retrofit screens as primitives land).
- **Sprint 4 — Flow polish + full a11y pass:** MF-019 → MF-025, then VoiceOver/TalkBack audit.

## Verification notes
- Codex findings are static-audit only (no simulator/screenshots); line numbers are from `@main` and may drift — confirm before editing.
- Token-layer tickets (MF-004, MF-005, MF-007, MF-008) can be prototyped in the MastersFit design-system project first, then ported.
- Repo-wide `npm run lint` / `tsc --noEmit` reportedly fail on pre-existing issues — clean baseline tooling before/alongside Sprint 1 so CI can gate these fixes.
