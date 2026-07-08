# Launch Readiness — Backlog

Priorities: **P0** = go/no-go blocker for store submission. **P1** = should land before launch.
**P2** = real gap, can slip to a fast-follow. **P3** = nice-to-have.

Evidence file:line references are as of the 2026-07-06 audit — re-verify against current code
before acting, files shift.

---

## Epic 0 — Security hotfix
- [x] **LR-001 · P0** — SQL injection in exercise search. `backend/src/services/search.service.ts`
      (was lines 456/475/484) string-interpolated raw `equipment`/`muscleGroups` query params
      (`backend/src/controllers/search.controller.ts:92-93,109-110`) into `sql.raw(ARRAY[...])`
      with no escaping. **Fixed 2026-07-06**: replaced with `sql.join(values.map(v => sql\`${v}\`), sql\`, \`)`
      — the same parameterized pattern already used elsewhere in the file for `IN` clauses.

## Epic 1 — Payments correctness & testing
- [ ] **LR-002 · P0** — RevenueCat prod/sandbox key separation. `frontend/.env` has one
      `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `..._GOOGLE_API_KEY` pair, both sandbox (`test_...`),
      no environment-based switching. A production EAS build ships with sandbox keys → cannot
      process real payments.
- [ ] **LR-003 · P0** — RevenueCat webhook has no auth check. `backend/.env` line 51
      `REVENUECAT_WEBHOOK_AUTH_HEADER` is empty; `subscription.controller.ts:92-122` accepts any
      caller. Anyone who finds the URL can grant/revoke subscriptions for any user.
- [ ] **LR-004 · P0** — No backend confirmation after purchase. `use-subscription-plans.ts:134-148`
      only updates local RevenueCat state after purchase; there's no `GET /subscriptions/status`
      endpoint for the frontend to confirm the backend is in sync. If the webhook is delayed, the
      user sees "Pro" locally but gets rejected by the API (looks like purchase failed).
- [ ] **LR-005 · P1** — Harden anonymous→identified purchase linking. Purchasing before
      `Purchases.logIn(userId)` produces an `$RCAnonymousID:...` app_user_id; recovery depends on a
      RevenueCat TRANSFER event (`subscription.controller.ts:823-868`, added in `ec3e463`). Needs
      an explicit sandbox test of: buy while anonymous → log in → confirm entitlement transfers.
- [ ] **LR-006 · P1** — Hardcoded `"pro"` planId fallback. `subscription.controller.ts:851`:
      `planId: plan?.planId || productId || "pro"`. If the product isn't found, access is granted
      against a planId that may not exist in the DB, breaking renewal lookups later.
- [ ] **LR-007 · P1** — Billing-issue notifications. Existing TODO,
      `subscription.controller.ts:750`: grace-period/billing-failure events don't notify the user.
      Silent churn risk.
- [ ] **LR-008 · P1** — Grace-period UI sync. `use-subscription-status.ts:104-105` derives grace
      period only from the local RevenueCat SDK entitlement; the backend's own
      `GRACE_PERIOD`/`BILLING_ISSUE` state (`subscription.service.ts:98-108`) isn't surfaced to the
      frontend, so the two can disagree.
- [ ] **LR-009 · P2** — Paywall hard-fails when `offerings.current` is null.
      `use-subscription-plans.ts:81-94` logs to Sentry but the UI just renders empty / infinite
      "Loading plans" — no retry or error state for the user.
- [ ] **LR-010 · P1** — Subscription/webhook test suite. Zero tests today for
      `subscription.controller.ts` or `subscription.service.ts` (webhooks, TRANSFER, BILLING_ISSUE,
      grace period transitions).
- [ ] **LR-052 · P3 (content, not code)** — Paywall benefit-bullet copy needs real work.
      Structural bug already fixed 2026-07-07 (`components/subscription/subscription-plans-list.tsx`
      no longer shows different feature lists for monthly vs. annual — Pro unlocks the same
      features regardless of billing period), but the actual bullet wording is still a
      placeholder (currently: "Unlimited workout regenerations," "AI-powered workout plans,"
      "Advanced analytics & insights"). Two bullets were dropped rather than guessed at —
      "Early access to new features" and "Priority customer support" — neither is a confirmed
      real capability; revisit if either becomes real and should be added back (as a shared
      benefit, not an annual-exclusive one).
- [ ] **LR-011 · P2** — Confirm the demo-account hardcoded Pro override
      (`use-subscription-status.ts:14,48-60`, `rtp+demo@mastersfit.ai`) can't mask a real webhook
      failure during QA — it's scoped to one email today, just needs a sanity check it stays that way.

## Epic 2 — Workout generation quality
- [ ] **LR-012 · P0** — No post-generation equipment validation. LLM is told the user's equipment
      (`workout-agent.service.ts:214-224`, `fanout-prompt-generator.ts:352-353`) but nothing checks
      the *output* — `exercisesToAdd` can introduce exercises requiring equipment the user doesn't
      have, and it ships straight to the DB via `createExerciseIfNotExists()`
      (`exercise.service.ts:36-52`, name-uniqueness check only).
- [ ] **LR-013 · P0** — No post-generation limitation/injury validation. `limitations` and
      `medicalNotes` are passed into the prompt (`fanout-prompt-generator.ts:294-297,386`) as
      instructions only — there's no downstream check that the LLM actually respected them. A
      contraindicated exercise ships if the LLM ignores the instruction.
- [ ] **LR-014 · P1** — No week-over-week progression. Generation has no call to fetch the prior
      week's workout/weights before building the prompt — every week is generated cold. No
      `getLastWorkoutWeek()`-style context exists anywhere in the flow.
- [ ] **LR-015 · P2** — Exercise data integrity on creation. `createExerciseIfNotExists()`
      (`exercise.service.ts:36-52`) doesn't validate `equipment`/`muscleGroups`/`difficulty` against
      known enums before insert — a hallucinated value can slip into the exercise library.
- [ ] **LR-049 · P0** — Exercise repetition & muscle-group imbalance. New finding from the user's
      own testing (2026-07-07): generation can repeat the same exercise too often, and overload a
      muscle group (e.g. leg volume) both **within a single workout** and **across consecutive
      days**. No balancing logic exists in exercise selection today. Likely needs: (a) a
      per-workout constraint (cap repeats of an exercise, cap muscle-group volume within a
      session) and (b) cross-day awareness — needs the same prior-week context as LR-014
      (progression) to avoid stacking heavy leg days back-to-back. Tag P0 alongside LR-012/013 —
      user's own framing: "this is where the rubber hits the road, will make or break the app."
- [ ] **LR-050 · P2 (needs scoping)** — "Progress monitoring" — ambiguous, capturing both
      readings rather than guessing: (a) generation-side, already covered by LR-014
      (week-over-week progression); (b) user-facing — a way to *see* progress over time (trends,
      PRs, volume history). Unclear if (b) already exists in the dashboard/analytics screens or
      needs building — check `components/dashboard/`, `workout-analytics.service.ts` before
      sizing.
- [ ] **LR-016 · P2** — Revisit the removed profile-completeness guard. Commit `3229a60` dropped a
      check for required profile fields (`availableDays`, `workoutDuration`, `environment`) from
      `prompts.service.ts` (~line 210) in favor of downstream fallbacks. Decide if it should come
      back properly rather than relying on fallback defaults.

- [ ] **LR-053 · P2** — Serial-fallback generation path has stricter, inconsistent validation.
      Found 2026-07-08 while investigating LR-016: `generatePrompt` (the serial fallback used when
      the fast fan-out path fails, `backend/src/services/prompts.service.ts` ~line 132) still
      guards on `availableDays`/`workoutDuration`/`environment` being present and throws if not.
      Unlike the fan-out path, `buildClaudePrompt` (`prompt-generator.ts` ~line 695) assigns
      `const workoutDuration = profile.workoutDuration` with no fallback and uses it raw in ~15
      places — so a profile with a missing field can succeed via fan-out but throw if it ever falls
      back to serial generation. Fixing properly means adding the same kind of default
      (`profile.workoutDuration || 30`) throughout `buildClaudePrompt` and removing its guard too —
      not done here, real regression risk (undefined interpolated into prompts) if rushed.

## Epic 3 — Workout generation performance
Distinct from Epic 2 (quality) — this is about latency/cost, not correctness. Prior work already
closed the queue/lock-stall problem (see memory `project_workout_generation_queue`): Bull
`lockDuration` tuned to 2 min, per-phase timing added, queue wait fixed (135s → ~1-25s on a
settled instance). **Don't re-litigate that — it's done.** What's still open:
- [ ] **LR-035 · P1** — Curate/dedupe the exercise catalog. **Correction 2026-07-08**: the
      "107 total exercise rows" figure below was **local only** — production (Neon) actually has
      **2,081 rows**, grown independently (265 from the original 2025-06-03 seed, 1,535 from a
      single-day bulk import on 2025-07-08 that didn't dedupe against the existing catalog, ~270
      trickled in gradually since via real generation traffic). Production has **266 exact-name
      duplicate groups (316 redundant rows)** plus ~2,700 near-duplicate pairs at various
      confidence tiers — see `EXERCISE_CURATION_CANDIDATES_PROD.md` (new, generated directly
      against Neon) for the full breakdown and a recommended dedup approach; the original
      `EXERCISE_CURATION_CANDIDATES.md` only ever covered local's small catalog and understates
      the real scope of this ticket substantially. `getFilteredExercises`
      (`workout-agent.service.ts:104-140`) filters by equipment/environment but caps at
      `limit: 200` — i.e. for most users, the *entire* filtered catalog gets embedded verbatim as
      exercise context (`formatExerciseContext`, ~4 000 tokens per the existing comment at
      `workout-agent.service.ts:451`). A smaller, deduplicated catalog (merging near-duplicate
      "variations") directly shrinks this block for every generation, not just an edge case.
      Worth doing *before* LR-012 (equipment validation) — a curated canonical list makes that
      validation simpler too.
- [ ] **LR-056 · P1** — (new, 2026-07-08) Harden `createExerciseIfNotExists` against the
      check-then-insert race that likely contributed to LR-035's duplication: `exercises.name` has
      only a plain index (`idx_exercises_name`), no unique constraint, so concurrent fan-out
      day-generation calls introducing the same new exercise name for the first time can both pass
      the "not found" check and both insert. Add a unique index on `lower(name)` (only possible
      once LR-035's existing duplicates are cleaned up) and switch the insert to rely on it (e.g.
      `ON CONFLICT DO NOTHING`) instead of trusting the check alone. Low volume today (~270 rows
      added over the last year via this path) but unbounded without a DB-level guard.
- [ ] **LR-036 · P2** — Per-day LLM call floor. Confirmed 12-20s per day call, and the slowest
      day gates the whole parallel fan-out phase (`project_workout_generation_queue` memory,
      steady-state ~27-40s total). Investigate whether a smaller per-day output schema or a
      smaller embedded exercise slice per call (vs. the full filtered catalog) reduces this floor
      — flagged as a roadmap item previously, not yet attempted.
- [ ] **LR-037 · P2** — Revisit the ~800ms stagger between parallel day calls in the fan-out —
      noted previously as a possible further shave, not yet tried.
- [ ] **LR-038 · P3** — Week-regen navigation gap: user can't reach the weekly-regenerate UI
      without first triggering a daily regen (surfaced when "today" was a non-workout day).
      Generation-flow-specific; UX fix, not a backend perf fix.

## Epic 4 — Test coverage foundation
- [ ] **LR-017 · P0** — Backend auth controller has zero tests (token refresh, password reset,
      waiver logic) — `auth.controller.ts` (~20.5 KB, untested).
- [ ] **LR-018 · P0** — Backend subscription controller/webhooks — ties to LR-010, tracked once
      there for dedup.
- [ ] **LR-019 · P1** — Tests for the post-generation validation layer once LR-012/LR-013 land —
      build these together, not as an afterthought.
- [ ] **LR-020 · P1** — Frontend has 0 test files, no Jest/Vitest config at all (re-confirmed
      2026-07-07). `package.json` already has `eslint-plugin-testing-library` as a dependency with
      nothing using it — a breadcrumb that React Native Testing Library was the intended choice at
      some point but never followed through. Decide the minimal strategy below; LR-044–048 are the
      breakdown once decided.
  - [ ] **LR-044 · P1** — Stand up Jest + React Native Testing Library config. No tests required
        yet — just get `npm test` running green as the starting gate (mirrors the `tsc`/lint gates
        already used for the UX remediation effort).
  - [ ] **LR-045 · P1** — Unit tests for the highest-blast-radius code first: `lib/api.ts`
        token-refresh/retry logic, `use-subscription-status.ts`, `use-subscription-plans.ts` — ties
        directly to the payment test gaps in LR-010/LR-018, do these together.
  - [ ] **LR-046 · P2** — Component/screen smoke tests for critical flows: onboarding completion,
        paywall renders with purchase button reachable, active workout session start/complete.
  - [ ] **LR-047 · P2** — Decide on-device E2E tooling (Maestro vs. Detox) for flows unit tests
        can't reach: real sandbox purchase flow, health-permission grants, push notifications.
        Maestro is lighter to bootstrap for Expo; Detox is more mature but heavier setup — open
        decision, not pre-decided here.
  - [ ] **LR-048 · P3** — No CI today (solo dev, per the lint-backlog plan). Decide whether a
        GitHub Actions test-on-push step is worth adding now, or tests stay a manual
        run-before-each-release habit for the time being.
- [ ] **LR-021 · P2** — At minimum, a scripted manual QA checklist for the purchase flow
      (sandbox buy → restore → cancel → grace period) if full automation is too costly pre-launch.
- [ ] **LR-054 · P3** — Backend `tsc` backlog cleanup (deferred, same spirit as the frontend
      lint-backlog plan — not urgent, tracked so it isn't forgotten). **66 pre-existing errors**
      as of 2026-07-08 (`cd backend && npm run tsc`), none introduced by anything in this backlog —
      confirmed via stash-diff at every step of the L1-L21 loop, none are new. Per-file breakdown
      (top offenders): `logs.controller.ts` (8), `workout.service.ts` (7), `profile.routes.ts` (7),
      `search.routes.ts` (5), `analytics.controller.ts` (5). **26 of the 66 (39%) share one root
      cause**: `Request<...>` not narrowing to `AuthenticatedRequest` (`userId: number | undefined`
      vs. required `number`) across nearly every `*.routes.ts` file — one shared-type fix would
      likely clear most of these at once, the highest-leverage single fix in this backlog. Two
      specific ones worth a closer look before just batch-fixing (flagged during triage, not
      confirmed as real bugs): `logs.controller.ts`'s repeated `PlanDayLog.totalTimeMinutes missing`
      (~7 occurrences — could mean real data is missing somewhere, not just a stale type) and
      `notification.service.ts:21`'s `'substring' does not exist on type 'never'` (a "never" type
      error can flag real dead code, or can hide an actual runtime possibility TS has been told to
      ignore — worth confirming which before touching it).
- [ ] **LR-055 · P3** — Frontend `tsc` backlog cleanup (same deferred spirit as LR-054). **35
      pre-existing errors** as of 2026-07-08 (`npx tsc --noEmit`) — this is the same number that's
      been frozen as the UX remediation loop's regression gate since 2026-07-01
      (`design_handoff_ux_remediation/LOOP_QUEUE.md`); G0 clean-baseline was never done, per that
      project's own memory. Per-file breakdown: `use-workout-session.ts` alone accounts for **15 of
      35 (43%)** — by far the single highest-leverage file to look at first, mostly
      `WorkoutBlockWithExercise`/`WorkoutBlockWithExercises` shape mismatches (`exercises` vs.
      `exercise`, missing `isSkipped`) suggesting a drizzle relation/type drift similar in spirit to
      LR-054's backend findings. Rest: `lib/analytics.ts` (6, `Error` not assignable to
      `LogContext`), `health-metrics-carousel.tsx` (4), `lib/workouts.ts` (3,
      `PlanDayWithBlocks`/`WorkoutWithDetails` mismatches), plus one each in
      `types/calendar.types.ts` (`UserProfile` not exported from `./api`),
      `types/api/logs.types.ts` (`ApiResponse` not found), `waiver-context.tsx`,
      `background-job-context.tsx`, and two in `workout-repeat-picker.tsx`/`workout-repeat-modal.tsx`.

## Epic 5 — Search quality
- [ ] **LR-022 · P1** — No fuzzy/typo-tolerant matching — `search.service.ts` uses `ILIKE`
      substring matching only (e.g. "bencg press" won't find "bench press"). Consider Postgres
      `pg_trgm`.
- [ ] **LR-023 · P2** — Hardcoded 20-result cap, no pagination (`search.service.ts` ~lines 378,
      420, 505; `search-view.tsx:190-221`).
- [ ] **LR-024 · P2** — Workout date search only accepts exact `YYYY-MM-DD`, 1-year hard lookback
      (`search-view.tsx:706`) — no "today"/"last week"/range queries.
- [ ] **LR-025 · P3** — No search telemetry/instrumentation — can't tell what users fail to find.
- [ ] **LR-057 · P2** — (new, 2026-07-08, found via user report + screenshot while testing prod)
      `searchExercises` (`search.service.ts` ~line 411) has **no `ORDER BY`** — results return in
      whatever order Postgres's query plan picks, not by match quality. Confirmed: searching
      "pull-up" surfaces "Strict Pull-Up"/"Jumping Pull-Up"/assisted variants ahead of what a user
      would expect to see first. Needs a relevance ordering (exact name match, then
      starts-with, then contains, then `similarity()` score desc) rather than unordered. Also
      surfaced production's "Strict Pull-Up" vs. "Strict Pull-Ups" exact-duplicate pair — see
      LR-035/`EXERCISE_CURATION_CANDIDATES_PROD.md`.

## Epic 6 — UI/UX (tracked separately)
Not duplicated here — see `../design_handoff_ux_remediation/PROGRESS.md` Track 4: MF-005 tail,
MF-006, MF-010, MF-012, MF-019–025, and the deferred MF-003 timers decision.

**Track 5 — Workout logging & interaction redesign (not yet scoped).** Captured 2026-07-07 —
these are off-the-top-of-the-head examples from the user, not an exhaustive list; more will
surface once this area gets real attention:
- Review workout-logging interactions specifically.
- Minimize data entry during a workout.
- Gesture-based interactions (e.g. swipe) as alternatives to manual entry/taps.
- [ ] **LR-051 · P2** — Scoping/design pass for this track (mirrors LR-039's role for Epic 10) —
      once scoped, break into concrete tickets (MF-0XX to fold into the remediation doc, or LR-0XX
      here — decide when it's scoped).

## Epic 7 — Platform parity
- [ ] **LR-026 · P1** — Android Health Connect: no error handling if the Health Connect app isn't
      installed (`utils/health.ts:87-99` requests perms with no install-check/fallback) — likely
      crashes rather than degrading gracefully.
- [ ] **LR-027 · P2** — Android Health Connect is read-only; iOS HealthKit can write workouts back.
      Decide if read-only is acceptable for v1 or needs parity.
- [ ] **LR-028 · P2** — Stale push tokens never purged. Existing TODO,
      `notification.service.ts:362` — delivery degrades over time as users reinstall.
- [ ] **LR-029 · P2** — No user-facing reminder scheduling. Backend can send notifications but
      there's no settings screen to configure them — the `remindersEnabled` profile field exists
      unused.
- [ ] **LR-030 · P3** — No retry mechanism for failed push sends.

## Epic 8 — Observability
- [ ] **LR-031 · P0 (cheap)** — Confirm `EXPO_PUBLIC_SENTRY_DSN` is actually set for production EAS
      build profiles, not just local `.env`. It's missing from `.env.example`, so a fresh
      production build could silently ship with error reporting disabled (falls back to a console
      warning, per `lib/sentry.ts`).

## Epic 9 — Store submission readiness
Gated on Epic 1 and Epic 2 P0 items landing first.
- [ ] **LR-032 · P0** — Apple subscription UX compliance pass: restore-purchases button reachable,
      pricing/terms disclosure meets App Store Review Guideline 3.1.2 before submitting for review.
- [ ] **LR-033 · P1** — Full TestFlight regression pass covering payments + generation + core flows
      once the above land.
- [ ] **LR-034 · P1** — Play Store closed-track (alpha) regression pass — track already exists per
      prior work, `rtp@` already a tester.

## Epic 10 — Conversational workout modification (new feature, not yet fleshed out)
Idea captured 2026-07-07, inspired by Cal AI's food-scan flow: after a result, a "Fix Issue" entry
point opens a free-text box ("It was duck, not turkey") → Update, rather than a structured edit
form. **Not a launch blocker** — a product feature, prioritize relative to the rest once scoped.

**Two use cases (user's words):**
- (a) **Post-generation edit** — after a workout/week is generated, let the user describe a change
  in their own words instead of manually editing via the exercise-search-based edit flow.
- (b) **Day-of adjustment** — on a given day the user can't do the prescribed workout (short on
  time, poor recovery, etc.); describe it in free text and MF either adjusts in place or
  regenerates, instead of the user opening a config panel first.

**Existing infra this can build on** — more already exists than it looks like:
- `customFeedback`/`reason` free-text params already flow end-to-end into the LLM prompt as
  "SPECIFIC USER FEEDBACK" today (`backend/src/controllers/workout.controller.ts:312,336,356,
  450,464` for daily, mirrored `644-898` for weekly; injected into the user message around
  `workout-agent.service.ts:278`).
- `frontend/components/workout-regeneration-modal.tsx` already has a free-text `customFeedback`
  `TextInput` (~line 1090) — but it sits *alongside* a separate structured override panel
  (`showDailyOverrideForm` / `TemporaryOverrides` for time, equipment, etc., ~lines 117-121) that
  the user still has to open for granular changes. That gap between "type what you want" and
  "configure a panel" is exactly what this epic should close.
- The manual exercise-swap edit flow already exists in `workout-edit-modal.tsx` (search-based) —
  decide if conversational modification replaces it, sits alongside it, or drives it under the
  hood (i.e. free text → LLM decides which exercises to swap via the same mechanism).

**Open design questions (capture, don't answer yet):**
- Single-shot free text (Cal AI's pattern) vs. true multi-turn chat with follow-up clarification —
  which does v1 need?
- Does free text replace `workout-regeneration-modal.tsx`'s structured panel outright, or stay a
  faster alternate path alongside it?
- How does MF decide "adjust in place" vs. "full regenerate" from a free-text request?
- Interacts with Epic 2 (LR-012/LR-013 equipment/limitation enforcement) and Epic 3 (prompt size) —
  open-ended free text is a bigger validation surface than the current fixed-shape overrides.

- [ ] **LR-039 · P2** — Design pass: answer the open questions above before building.
- [ ] **LR-040 · P2** — Post-generation edit flow (use case a).
- [ ] **LR-041 · P2** — Day-of adjustment flow (use case b) — likely supersedes the structured
      override panel's UX, not necessarily its backend.
- [ ] **LR-042 · P3** — Consolidate or retire the structured override panel once conversational
      flow covers its use cases (or decide it stays as a power-user fallback).
- [ ] **LR-043 · P3** — Validation pass for free-text-driven changes, given LR-012/LR-013 — more
      open-ended input needs at least as much enforcement as structured generation.
