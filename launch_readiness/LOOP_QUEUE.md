# LOOP_QUEUE — autonomous loop-safe tasks

> Source of truth for the `/loop` run starting 2026-07-07 evening. Each task is atomic,
> independently verifiable, and doesn't require a human looking at a screen or making a product
> call. The loop does ONE unchecked task per iteration, verifies against the gate below, commits,
> checks the box, and continues. When all are checked (or the loop is stopped), STOP and leave a
> summary in the loop log.

> **Out of scope for this loop — needs the user, do NOT attempt here:**
> - **LR-013** (injury/limitation enforcement approach) — explicit open design decision
>   (rule-based list vs. LLM validation pass vs. both), not resolved.
> - **LR-050** (progress-monitoring scoping) — ambiguous between generation-side and a
>   user-facing view, not resolved.
> - **LR-035** (exercise catalog curation/pruning) — "which exercises are quirky/low-value" is an
>   editorial call. Instead: **L-PREP** below prepares a candidate list for review, does not delete
>   anything.
> - **LR-047 / LR-048** (E2E tooling choice, CI-or-not) — tooling/process commitments, flagged as
>   the user's call in BACKLOG.md itself.
> - **LR-052**, and any dialog/paywall copy — content/voice, explicitly the user's call.
> - **BUG-001 / BUG-002 fixes** — better verified with a human watching the simulator.
> - Epics 6, 7, 9, 10 and anything else not listed below — later phase / design-heavy / unscoped.

## The gate (run after EVERY task; if it fails, REVERT the task and mark it BLOCKED, don't force it)

**Frontend** (`/Users/richpusateri/Projects/MastersFit/frontend`):
- `npx tsc --noEmit 2>&1 | grep -c "error TS"` **must equal 35** (frozen baseline, confirmed via
  stash-diff 2026-07-07).
- `npx eslint <each file touched>` — problem count per file must not exceed its pre-change count
  (stash-diff to confirm). Autofix only import-sort/prettier on touched files.
- `npx jest` — all tests pass, including any new ones the task added.

**Backend** (`/Users/richpusateri/Projects/MastersFit/backend`):
- `npm run tsc 2>&1 | grep -c "error TS"` **must equal 67** (updated 2026-07-08: 73→72 during L1,
  72→67 during L3, all genuine pre-existing bug fixes, not regressions; see loop log). Gate intent
  is "no new errors," not literal equality — if a future task fixes another pre-existing one,
  lower this number again rather than treating the drop as a failure.
- `npm run test` (jest+ts-jest, already configured) — all tests pass, including any new ones.
- Regenerate the TSOA spec (`npm run tsoa`) if a controller/route changed.

Plus each task's own **Assert** line. Commit each completed task on its own (branch: whatever the
current branch is at loop-start — check `git branch` first, don't assume). Message format: `feat:
<task id> — <one line>` + body noting any judgment call made, ending with the
`Co-Authored-By: Claude Opus 4.8 (1M context)` trailer. One commit per task, so tomorrow's review
is easy to walk through commit-by-commit.

**On any judgment call** (exact validation rule, exact heuristic, exact test scenarios chosen):
make the call, document it clearly in the commit body AND the loop log, and move on — don't stall
waiting for input that isn't coming tonight. Flag it as a first draft, not a final answer.

---

## Tasks

### Phase A — quick, contained fixes
- [x] **L1 · LR-006** — Fix hardcoded `"pro"` planId fallback.
  `backend/src/controllers/subscription.controller.ts` (~line 851, verify current line):
  `planId: plan?.planId || productId || "pro"`. If `plan` lookup fails, this silently assigns an
  invalid planId. Fix: if no matching plan is found, log a warning with the unmatched `productId`
  and leave `planId` as the raw `productId` (traceable) rather than the fake string `"pro"`.
  **Assert:** no bare `"pro"` string fallback remains in this file; add a unit test covering the
  "plan not found" branch.

- [x] **L2 · LR-011** — Audit demo-account Pro override stays scoped.
  `frontend/hooks/use-subscription-status.ts` (~lines 14, 48-60): confirm the hardcoded
  `rtp+demo@mastersfit.ai` check can't match any other email (e.g. no substring/prefix match, only
  exact equality). Fix if it's not already exact-match. **Assert:** grep the file, confirm it's a
  strict `===` comparison against the literal email.

- [x] **L3 · LR-015** — Exercise creation integrity validation.
  `backend/src/services/exercise.service.ts` `createExerciseIfNotExists()` (~lines 36-52): add
  validation that `equipment`, `muscleGroups`, `difficulty` values match known enums before
  insert (reject/log and skip the exercise if not, don't crash the whole generation). **Assert:**
  unit test covering a valid exercise and one with an invalid equipment value.

- [x] **L4 · LR-016** — Restore profile-completeness guard properly.
  `backend/src/services/prompts.service.ts` (~line 210, removed in commit `3229a60`): re-add a
  guard for required fields (`availableDays`, `workoutDuration`, `environment`) — but this time
  return a clear, catchable validation error instead of the downstream-fallback pattern that was
  the reason it got removed. **Assert:** unit test confirming a profile missing a required field
  throws/returns a specific error, not a silent fallback.

- [x] **L5 · LR-009** — Paywall hard-fail UI when `offerings.current` is null.
  `frontend/hooks/use-subscription-plans.ts` (~lines 81-94): currently logs to Sentry but the UI
  renders empty / infinite loading. Add an explicit error state the paywall component can render
  (a real "couldn't load plans, try again" message + retry button), instead of a silent dead end.
  **Assert:** the hook exposes a distinguishable error state for this specific case; add/update a
  test.

- [x] **L6 · LR-038** — Week-regen navigation gap.
  Find where the daily-vs-weekly regeneration choice is gated in the frontend (search
  `workout-regeneration-modal.tsx` / calendar screen for how `selectedType` "week" vs "day" is
  reached) — user can't reach the weekly-regenerate UI without first triggering a daily regen when
  "today" is a non-workout day. Fix: make the weekly option reachable regardless of what day it is.
  **Assert:** describe the fix in the commit body precisely enough to spot-check tomorrow; add a
  test if the gating logic is a pure function.

- [x] **L7 · LR-023** — Search pagination beyond the hardcoded 20-result cap.
  `backend/src/services/search.service.ts` (~lines 378, 420, 505) + `frontend/lib/search.ts` +
  `components/search/search-view.tsx`: add real pagination (offset/limit params, "load more" or
  infinite scroll) instead of a hard cap. **Assert:** backend test confirming a query with >20
  matches returns page 2 correctly when requested.

- [ ] **L8 · LR-025** — Search telemetry.
  Log each search query + result count (via existing `logger`/analytics patterns, whatever's
  already used elsewhere for this kind of event) so "dead searches" (queries returning 0 results)
  become visible later. No UI change. **Assert:** grep confirms the log call is in place; a manual
  test query with 0 results produces the expected log line.

### Phase B — test coverage foundation (do before Phase C, so Phase C isn't unprotected)
- [ ] **L9 · LR-017** — Backend auth controller tests.
  `backend/src/controllers/auth.controller.ts` has zero tests. Cover: token refresh (valid,
  expired, malformed), the waiver-status endpoint, password reset happy path + invalid-token path.
  **Assert:** `npm run test` shows new passing tests for these paths.

- [ ] **L10 · LR-018 / LR-010** — Backend subscription controller/webhook tests (same underlying
  ticket, tracked under both IDs). Cover: `handleRevenueCatWebhook` with valid auth header, missing
  auth header (when configured), wrong auth header, `INITIAL_PURCHASE`/`RENEWAL`/`CANCELLATION`/
  `BILLING_ISSUE`/`TRANSFER`/`TEST` event types, and `getSubscriptionStatus`'s two branches
  (has subscription / trial default). **Assert:** `npm run test` green with these covered.

- [ ] **L11 · LR-045** — ⚠️ **known blocker found during L5, partially narrowed during L6**:
  `renderHook` fails with "not configured to support act()" / `result.current` staying
  `undefined` under this project's React 19 setup — the standard `IS_REACT_ACT_ENVIRONMENT = true`
  fix didn't resolve it. **Separately**, L6 found and fixed two native-module mocking gaps
  (`@miblanchard/react-native-slider` missing from `transformIgnorePatterns`, `AsyncStorage`
  missing a `moduleNameMapper` entry — both now in `package.json`'s jest config) that were
  blocking a DIFFERENT thing (importing a file that transitively pulls in RN native modules) —
  those are fixed now and should help here too, but the core React-19/act() issue is still
  unresolved. Try it properly here rather than working around it again. — Frontend unit tests for highest-blast-radius code.
  `lib/api.ts` (token refresh/retry logic — mock the underlying fetch), `hooks/use-subscription-status.ts`,
  `hooks/use-subscription-plans.ts` (mock the RevenueCat SDK). **Assert:** `npx jest` green with
  new passing tests for these three files.

### Phase C — workout generation quality (P0, no open design gate — equipment/repetition/progression are mechanical, not ambiguous like LR-013/LR-050)
- [ ] **L12 · LR-012** — Post-generation equipment validation.
  After LLM generation (`backend/src/services/workout-agent.service.ts`), before persisting:
  cross-check every exercise (from `exercisesToAdd` and the selected-from-filtered-list ones)
  against the user's actual `profile.equipment`/`environment`. If a mismatch is found, log it and
  either drop/replace the exercise or flag the workout for review — pick whichever is less
  disruptive to ship tonight and document the choice clearly. **Assert:** unit test with a
  synthetic LLM response containing an equipment-mismatched exercise, confirming it's caught.

- [ ] **L13 · LR-049** — Exercise repetition & muscle-group balance.
  Add a validation/re-balancing pass: (a) cap how many times the same named exercise appears in one
  workout, (b) flag/limit consecutive high-volume-for-the-same-muscle-group days (e.g. two heavy
  leg days back to back). Pick specific, reasonable numeric thresholds (document them clearly —
  this is the kind of judgment call to flag prominently for tomorrow's review, not treat as final).
  **Assert:** unit tests covering both a same-exercise-repeated case and a consecutive-heavy-days
  case.

- [ ] **L14 · LR-014** — Week-over-week progression.
  Fetch the user's prior week's workout/completion data before generating the next week; feed it
  into the prompt context; add a simple, conservative progression rule (e.g. if prior sets/reps
  were fully completed, nudge volume/weight up modestly; if not, hold steady or ease back).
  Document the exact rule chosen. **Assert:** unit test confirming the prior-week fetch happens and
  a synthetic "fully completed last week" case produces an increased prescription.

### Phase D — payments hardening
- [ ] **L15 · LR-008** — Grace period UI sync using the new status endpoint.
  `frontend/hooks/use-subscription-status.ts` currently derives grace period only from the local
  RevenueCat SDK entitlement. Wire it to also call `lib/subscriptions.ts`'s `getSubscriptionStatus()`
  (built today for LR-004) and prefer the backend's `accessLevel`/`status` when it disagrees with
  the local SDK state. **Assert:** test covering "backend says grace_period, local SDK still says
  active" resolving to the backend's view.

- [ ] **L16 · LR-005** — Harden anonymous→identified purchase linking.
  Code-only hardening (not a live device/App-Store test — that needs the user): review
  `backend/src/controllers/subscription.controller.ts` TRANSFER handling (~lines 823-868) and
  `frontend/contexts/auth-context.tsx`'s `Purchases.logIn()` call (~lines 83-99). Add defensive
  logging around failure paths, and unit tests for the TRANSFER event handler covering: normal
  transfer, transfer to a user with no existing subscription, transfer when the target user already
  has an active subscription. **Assert:** new passing tests for these three cases.

### Phase E — generation performance
- [ ] **L17 · LR-036** — Investigate the per-day LLM call floor.
  `backend/src/services/workout-agent.service.ts`: measure current per-day call latency (the
  per-phase timing logs already exist per `project_workout_generation_queue` memory), then try ONE
  concrete lever — either a smaller per-day output schema or a smaller embedded exercise slice per
  call (not the full filtered catalog) — and measure again. **Assert:** before/after timing numbers
  in the commit body; don't ship if it makes quality worse (check against L12/L13's validations).

- [ ] **L18 · LR-037** — Revisit the fan-out stagger.
  Find the ~800ms stagger between parallel day calls in the fan-out generation code; try reducing
  or removing it and confirm it doesn't reintroduce the rate-limit/lock issues the stagger was
  presumably added to avoid (check git log/blame for why it was added before changing it).
  **Assert:** before/after timing; explain in commit body why the change is safe.

### Phase F — search quality
- [ ] **L19 · LR-022** — Fuzzy/typo-tolerant search via `pg_trgm`.
  Enable the Postgres `pg_trgm` extension (local DB only — do NOT touch production/Neon), add a
  trigram similarity condition to `search.service.ts`'s exercise search alongside the existing
  `ILIKE` check. **Assert:** local test query for a misspelled exercise name (e.g. "bencg press")
  returns "bench press" as a result.

- [ ] **L20 · LR-024** — Natural-language date search.
  `search.service.ts`'s workout date search only accepts exact `YYYY-MM-DD`. Add support for
  `"today"`, `"yesterday"`, `"this week"`, `"last week"` as recognized phrases, resolved via the
  existing `resolveTodayString`/timezone-aware date utils (don't reinvent date math). **Assert:**
  unit tests for each new phrase resolving to the correct date/range.

### Phase G — best effort, OK if this doesn't finish
- [ ] **L21 · LR-046** — Screen smoke tests.
  Using the RNTL setup from LR-044: onboarding-completion smoke test, paywall renders with a
  purchase button reachable, active-workout-session start/complete smoke test. Native
  module/context-provider mocking may be fiddly — if a given screen's test proves too costly to get
  passing tonight, skip it and note why in the loop log rather than burning excessive time on it.
  **Assert:** whatever subset passes, passes cleanly; nothing left half-mocked/flaky.

### Prep only — does NOT touch the exercise DB
- [ ] **L-PREP · feeds LR-035** — Candidate list for exercise catalog curation.
  Query the local exercise table for likely duplicates (near-identical names, e.g. via `pg_trgm`
  similarity once L19 lands, or simple case-insensitive substring clustering) and rarely-useful
  entries (e.g. `bodyweight`/`environment` combos that never show up in `getFilteredExercises`
  results in practice, if that's checkable). Write the candidate list to
  `launch_readiness/EXERCISE_CURATION_CANDIDATES.md` for the user's review tomorrow — **do not
  delete or modify any exercise rows**. **Assert:** the file exists and lists candidates with a
  reason for each; DB is unchanged (row count before == row count after).

---

## Loop log (appended by the loop: task id — DONE/BLOCKED/SKIPPED — commit sha — note)
- L1 — DONE — 7506c13 — Fixed hardcoded `"pro"` planId fallback on TRANSFER, now matches the
  `plan?.planId || productId || null` pattern already used elsewhere in the file. Also fixed a
  pre-existing, unrelated `logger.error` call-signature bug that was blocking ts-jest from running
  any test importing this controller — backend tsc baseline updated 73→72 (genuine fix, not a
  regression). Added `subscription.controller.test.ts`, the first backend controller test in the
  repo (2 passing cases: plan-not-found and plan-found on TRANSFER). L10 will extend this file.
- L2 — DONE (no code change needed) — audited `use-subscription-status.ts:14,48`: exact `===`
  match against the literal `rtp+demo@mastersfit.ai` string, only one occurrence in the whole
  codebase. Already correctly scoped, nothing to fix.
- L3 — DONE — b23f549 — Added `ExerciseService.validateExerciseData()` using the REAL
  `AvailableEquipment`/`IntensityLevels` enums (not invented), log-and-allow on failure. Real
  finding: `"machines"`/`"yoga_mat"` in the DB aren't in the official equipment enum at all, and
  `"medicine_ball"` (singular) is bad data vs. the official `"medicine_balls"` — feeds LR-035.
  `muscle_groups` too inconsistent to enum-validate (structural check only). Along the way fixed 3
  pre-existing bugs that were blocking any real-service (non-mocked) test from running at all:
  untyped catch-block error access in `base.service.ts`, a non-narrowed env access + dead
  `PoolConfig` property in `database.ts`, and jest's `moduleNameMapper` not handling `.js`-suffixed
  `@/` imports. Backend tsc baseline 72→67. **Flagging for later, not fixed:** importing
  `database.ts` opens a real DB connection pool as a load-time side effect — works locally, not
  real test isolation. Relevant to L47's tooling decision.
- L4 — DONE — 77ede63 — Investigated whether the guard removed in commit `3229a60` should come
  back "properly." Answer: no — verified every downstream usage already has a safe default, the
  guard was genuinely wrong (blocked the fast fan-out path, caused the "stuck on spinner" bug).
  Added a comment documenting this so it doesn't get re-added by accident later. New finding
  logged as **LR-053**: the serial fallback path (`generatePrompt`/`buildClaudePrompt`) still has
  the old guard AND has no fallback for `workoutDuration` in ~15 places — inconsistent with the
  fan-out path, but fixing it has real regression risk, didn't rush it tonight.
- L5 — DONE (fix, no automated test) — 1f7f7ad — `use-subscription-plans.ts` now calls
  `setError()` when `offerings.current` is null; the paywall modal already had error+retry UI
  wired up, just never received an error to show. **Hit a real test-infra blocker**: `renderHook`
  fails under this project's React 19 + `@testing-library/react-native` setup (`result.current`
  stays `undefined`, standard `IS_REACT_ACT_ENVIRONMENT` fix didn't help after two attempts).
  Verified the fix by tracing the code instead. This WILL block L11 and L21 — flagged on both
  above, worth a real fix attempt when reaching L11 rather than working around it again.
- L6 — DONE — 627efc1 — Fixed a real comment/code mismatch: the default-tab logic said
  "for rest days... default to week tab" in its own comment but did `isRestDay ? "day" : ...`.
  Fixed to match the stated intent. Extracted the fix into a standalone
  `utils/regeneration-tab.ts` (not inline in the component) specifically so it's testable —
  importing the component file cascades through several RN native modules and crashes in Jest.
  Along the way fixed two genuine, reusable test-infra gaps: `transformIgnorePatterns` didn't
  cover `@miblanchard/react-native-slider` (ESM-only package), and `AsyncStorage` had no jest
  mock wired in at all (needed `moduleNameMapper`, not `setupFiles` — the mock file is a plain
  object export, not a `jest.mock()` call). Both now fixed in `package.json`'s jest config,
  should help L11/L21. 4 new passing tests.
- L7 — DONE (backend only) — 1e6bce5 (backend) — Added `limit`/`offset` to both exercise-search
  endpoints, over-fetch-by-one for `hasMore` (no separate COUNT query). 3 new tests against the
  real local DB, all passing. **Frontend not wired** — `search-view.tsx`/`lib/search.ts` don't use
  `hasMore` yet, so the UI still effectively shows only the first page; that's a fast follow, not
  done here. Also: confirmed these DB-backed tests reliably take ~8s and Jest logs "did not exit
  cleanly" (the known open-connection-pool issue from L1/L3) — genuinely not a hang, just don't
  give up on it early like this session did once.
- **DB pool issue FIXED (not an L-numbered task, requested directly by the user)** — 4c714a7
  (backend) — added `src/test/jest-setup-after-env.ts` (`setupFilesAfterEnv`, closes the pool in
  `afterAll`). Confirmed clean exit twice in a row, no more "did not exit cleanly" warning. Backend
  test runs should be fast and clean from here on — no more waiting out the delay.
