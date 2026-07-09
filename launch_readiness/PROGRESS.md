# Launch Readiness — Progress

> Source of truth for "what's actually done." BACKLOG.md is the ticket list and isn't updated
> after the fact — check items off here.

## Locked priority order (decided 2026-07-07)

Rationale: fix live/cheap problems first regardless of epic, then make-or-break product quality,
then differentiate/refine, then harden (payments polish + bulk test coverage), then ship. Tests
are pulled forward as scaffolding (Phase 0) so Phases 1-2 can write tests as they build, not
retrofit them in Phase 3.

- [x] **Phase 0 — quick wins, do now, don't wait:** LR-002, LR-003, LR-004, LR-031, LR-044. **All
      5 done.** LR-002/LR-031 closed 2026-07-09 — the real production build (build 72, submitted
      to TestFlight) confirmed the EAS "production" environment correctly supplied
      `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_SENTRY_DSN` (not sandbox values), which
      is exactly what those two tickets were waiting on a real build to verify.
- [~] **Phase 1 — make or break:** LR-036/037/038 (Epic 3), LR-012/013/014/015/016/049 (Epic 2),
      and LR-053 are all done (LR-013 closed 2026-07-09 once the user made the enforcement-approach
      call; LR-053 closed 2026-07-09 during overnight autonomous work). LR-035 is ~90% done (Tier
      1/2 dedup + the muscle_groups/dup-related bugs it surfaced are closed; Tier 3+ hand-review
      and the original catalog-size-in-prompt goal remain as an optional tail). **What's actually
      left in Phase 1**: just LR-050 (user chose to skip scoping for now).
- [~] **Phase 2 — differentiate & refine:** Epic 5 (search) is now fully done (LR-022/023/024/
      025/057 all closed 2026-07-09). **What's left**: Epic 10 (conversational mods — needs LR-039
      design/scoping first, not started), Epic 6 (UI/UX Track 4 tail + Track 5 scoping — tracked
      separately in `design_handoff_ux_remediation/`), Epic 7 (platform parity, LR-026-030, not
      started).
- [~] **Phase 3 — harden:** Epic 1's remainder — LR-006/008/009/010/011/018 all done (some
      already fixed earlier this session, undocumented until now; LR-006/008/009 needed only
      verification, LR-010/011 needed real new work). LR-017/019/045 (Epic 4) also done. **What's
      left**: LR-005 (needs a real sandbox purchase test, not autonomous), LR-007/LR-052
      (product/copy decisions), LR-046/047/048 (component E2E tests / tooling choice / CI —
      046 likely blocked by the known RNTL issue, 047/048 are open tooling/process decisions).
- [ ] **Phase 4 — ship:** Epic 9 (store submission).

## Decisions still open (not blocking Phase 0/1 start)
- [ ] **Android Health Connect write parity (LR-027)** — ship read-only for v1, or build write
      parity now? Affects Epic 6/Phase 2 scope/sizing, not urgent yet.
- [x] **Limitation/injury enforcement approach (LR-013)** — decided 2026-07-09: rule-based
      contraindication list + log-and-allow LLM self-report (both). Implemented and closed.
- [ ] **LR-050 scoping** — user explicitly chose to skip scoping this for now (2026-07-09), not
      urgent per its own P2 priority. Revisit later.

## Epic 0 — Security hotfix
- [x] **LR-001** — SQL injection in search filters fixed 2026-07-06 (parameterized via
      `sql.join`, same pattern as existing `IN` clauses in the file). Not yet deployed — pending
      the deploy-backend flow.

## Epic 1 — Payments correctness & testing
- [x] **LR-002** — Confirmed 2026-07-07: real production RevenueCat keys already exist in EAS's
      hosted "production" environment (not the sandbox ones in local `.env` — that's a different,
      correctly-sandbox-scoped file for local/simulator dev). `eas.json` now explicitly binds
      `production`/`apk` profiles to that environment. **Fully closed 2026-07-09** — build 72's
      log confirmed `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` loaded from the production environment
      during the actual EAS build.
- [x] **LR-003** — Code-side enforcement already existed (`subscription.controller.ts`,
      `handleRevenueCatWebhook`: `if (REVENUECAT_WEBHOOK_AUTH_HEADER) { ...check... }`) — the
      earlier audit missed this. The real gap was that when the env var is unset, the endpoint
      silently accepts everything and only logged that fact at `debug` level (invisible at normal
      production log levels). Bumped to `logger.warn` 2026-07-07. User created the RevenueCat
      webhook (pointing at `masters-fit-backend.onrender.com`) and set
      `REVENUECAT_WEBHOOK_AUTH_HEADER` in Render. **Fully closed and verified 2026-07-07** — a real
      Test Store purchase produced `"RevenueCat webhook processed successfully"` in Render logs
      (not an auth error), confirming the secret matches on both ends.
- [x] **LR-004** — `GET /subscriptions/status` added (`subscription.controller.ts` +
      `subscription.routes.ts`, TSOA spec regenerated, reuses existing
      `getUserSubscription`/`getEffectiveAccessLevel` service methods — also fixed a stale,
      unused `SubscriptionResponse` type in `types/subscription/responses.ts` that was missing
      `grace_period`/`paused` statuses). Frontend: `lib/subscriptions.ts` +
      `hooks/use-subscription-plans.ts`'s `purchasePackage` now polls this (2 attempts, 1.5s
      apart) after a local RevenueCat purchase success, and logs a Sentry warning if the backend
      still hasn't synced — but still returns the purchase as successful either way, since
      RevenueCat's local confirmation is authoritative for "did the purchase succeed," not our
      backend's sync lag. Verified: backend 401s correctly with no/invalid token; frontend
      `tsc`/`jest`/lint all clean at the existing baseline. Done 2026-07-07.
- [x] **LR-006** — already fixed (from earlier this session, before a context compaction) —
      confirmed 2026-07-09 via grep across the whole controller, no hardcoded `"pro"` fallback
      remains anywhere.
- [x] **LR-008** — already fixed (same earlier-session work) — confirmed 2026-07-09:
      `reconcileSubscriptionStatus` correctly treats the backend as authoritative for grace period,
      5 existing tests pass.
- [x] **LR-009** — already fixed (same earlier-session work) — confirmed 2026-07-09: the paywall
      modal has real error+retry UI wired to the hook's `error` field, which now gets set for the
      null-offerings case.
- [x] **LR-010 / LR-018** — closed 2026-07-09. Found the real remaining gap by checking actual
      coverage rather than trusting the ticket text: `subscription.controller.test.ts` already had
      14 tests (TRANSFER, INITIAL_PURCHASE, CANCELLATION, auth enforcement) from earlier work, but
      BILLING_ISSUE, EXPIRATION's 5-way branching, and PRODUCT_CHANGE had zero coverage. 8 new
      tests. Full suite: 24/24 in this file.
- [x] **LR-011** — verified 2026-07-09: the demo-account override is correctly scoped (strict
      equality, no substring/case-insensitive risk). Extracted into `isDemoProAccount()` so that
      invariant has a test, not just a one-time manual check — 5 new tests including explicit
      substring/case-sensitivity guards against exactly how this could regress into granting free
      Pro access to a real user.
- [x] **LR-017** — closed 2026-07-09 (partial, proportionate scope). Only `refreshToken` had
      tests; added coverage for the other thing the ticket named concretely — waiver logic
      (`getWaiverStatus`/`acceptWaiver`, 11 new tests). Login/signup/OTP verification are a
      separate, larger surface not attempted here.
- [x] **LR-019** — closed 2026-07-09. Equipment/limitation/repetition validators each already had
      their own unit tests, but the WIRING between them inside `generateWeeklyWorkout` (order,
      each stage's output feeding the next) had zero coverage. Extracted the pipeline into
      `post-generation-validation.ts`, 4 new tests — verified they have teeth by temporarily
      reordering the pipeline and confirming 2 of 4 failed, then restoring.
- [x] **LR-045** — closed 2026-07-09. Added paywall/waiver classification tests to `lib/api.ts`
      (high-blast-radius precedence logic: a paywall 403 must not also trigger a waiver redirect).
      **Found a real bug while writing them**, not a hypothesis: a 426 whose error message
      mentions "waiver" fired the waiver-redirect callback twice (the dedicated 426 handler and
      the generic catch-all both matched). Fixed by excluding 426 from the catch-all, matching the
      existing `!isPaywallError` exclusion right above it. `use-subscription-plans.ts` had no
      obvious extractable pure-logic candidate (tightly coupled to the RevenueCat SDK, unlike
      `use-subscription-status.ts`'s clean reconciliation concept) — not forced.
- [ ] LR-005 · LR-007 · LR-052 — not started. LR-005 needs an explicit real sandbox purchase test
      (anonymous→identified linking) the user should be present for, not autonomous. LR-007 is a
      notification feature with product/copy decisions. LR-052 needs real paywall copy, not
      something to author unilaterally. All three explicitly out of scope for this autonomous pass.
- [~] **LR-005 update 2026-07-09**: the sandbox-test portion above still needs the user present and
      remains open, but there was a genuinely autonomous slice of this ticket after all — a
      client-side guard that re-runs `Purchases.logIn()` right before a purchase fires if the SDK
      is still anonymous, closing the race where the auth-time `logIn()` call failed or hadn't
      resolved yet. Extracted to `lib/revenuecat-identity.ts`'s `ensureIdentifiedBeforePurchase`
      specifically so it's unit-testable without RNTL (3 tests, `lib/__tests__/revenuecat-identity.test.ts`),
      called from `use-subscription-plans.ts`'s `purchasePackage`. Narrows, doesn't close, the gap:
      a purchase made while never having authenticated at all is still unguarded, and this doesn't
      replace the backend TRANSFER-event recovery path. Also added
      `launch_readiness/REGRESSION_CHECKLIST.md` covering LR-021/033/034 so the real sandbox test
      (and the broader TestFlight/Play regression passes) are scripted and ready whenever the user
      is at a device.

**Ad-hoc, resolved 2026-07-07: local/Test Store purchase testing now fully working end-to-end.**
Not a pre-existing ticket — necessary groundwork to actually verify LR-003/LR-004 rather than just
code review. RevenueCat Test Store products created (`masters_fit_monthly`, `masters_fit_annual`),
entitlement `pro` created and attached to both, offering configured. Annual price corrected to
$49.99 (was $79.99) in `seed-subscription-plans.ts` and the local DB. Fixed a real paywall bug
along the way: monthly/annual showed different feature tiers (`subscription-plans-list.tsx`), now
unified — see LR-052 for remaining copy work. Verified via Render logs: full purchase →
`handleInitialPurchase` → webhook auth passed → status `active` → app UI reached Pro state.
**Open decision:** production DB (Neon) may still have the old $79.99 if this seed script ran
there — not touched, needs the user's explicit go-ahead before touching anything production.

**Ad-hoc finding (not a pre-existing ticket), resolved 2026-07-07:** while checking the above, an
`ANTHROPIC_API_KEY` was found stray in the frontend's EAS environment (development/preview/
production) — unused by any frontend code, almost certainly copy-pasted in by mistake. Deleted
from all three EAS environments. **The key itself was exposed in this session's chat transcript**
(via an unredacted `eas env:list`) — user is rotating it via the Anthropic console + updating
Render/`backend/.env` (that's the key actually used, by the backend for LLM calls) as a separate,
manual action item, not tracked as an LR ticket.

## Epic 2 — Workout generation quality
- [x] **LR-012** — done (see `LOOP_QUEUE.md` L12) — post-generation equipment validation,
      `validateEquipmentAndFilter` (`utils/equipment-validation.ts`), wired into
      `workout-agent.service.ts`. **Correction 2026-07-09**: PROGRESS.md previously said this was
      "not started" — stale, never updated after the loop closed it.
- [x] **LR-013** — done 2026-07-09. User decided: both (rule-based filter + log-and-allow LLM
      self-report). `utils/limitation-validation.ts`, enforced at the catalog pre-filter and
      post-generation (mirrors LR-012). See BACKLOG.md for full detail, including the deliberate
      scope limits (only limitations with clear contraindicated-movement consensus get a rule;
      doesn't cover the serial fallback path — that's LR-053).
- [x] **LR-014** — done (see LOOP_QUEUE.md L14) — week-over-week progression,
      `buildProgressionContext` (`utils/progression-context.ts`). Same stale-doc correction as
      LR-012.
- [x] **LR-015** — done 2026-07-08 (see `launch_readiness/LOOP_QUEUE.md` L3).
- [x] **LR-016** — done 2026-07-08 (see LOOP_QUEUE.md L4) — confirmed the guard should stay
      removed, documented why, found and logged LR-053 (inconsistent fallback-path validation).
- [x] **LR-053** — done 2026-07-09 (overnight autonomous work). `buildClaudePrompt`
      (`prompt-generator.ts`) threw if availableDays/workoutDuration/environment were missing;
      the fan-out path tolerates the same gaps with defaults. Removed the throw, added matching
      defaults (`workoutDuration || 30`, `environment || "not specified"`), removed the now-
      redundant outer guard in `generatePrompt` (confirmed via grep it has exactly one caller —
      the fan-out-failure fallback in `workout.service.ts`). Deliberately left `buildClaudeChunkedPrompt`
      alone — confirmed dead code, zero callers. 5 new tests using a profile with every optional
      field explicitly `null` (the real DB-row shape, not just an omitted TS property).
- [x] **LR-049** — done (see LOOP_QUEUE.md L13) — `checkExerciseRepetition` +
      `checkConsecutiveMuscleGroupOverload` (`utils/workout-balance-validation.ts`), detect-and-log.
- [ ] **LR-050** — genuinely not started, needs scoping first (see BACKLOG.md — ambiguous between
      generation-side, already covered by LR-014, vs. user-facing progress trends/PRs, which may
      already exist in the dashboard).

## Epic 3 — Workout generation performance
- [~] **LR-035** — Production catalog dedup done 2026-07-08: 348 redundant rows removed (266
      exact-name groups + 44 vetted near-duplicates), 1,232 `plan_day_exercises` references
      reassigned to canonical ids, 0 orphans after. Verified via `dedupe-exercises.ts` dry-run
      review before applying, then independent `psql` re-verification (row counts, zero remaining
      dup groups, spot-checked specific ids). **Not fully closed** — the Tier 3 (0.85-0.95
      confidence, ~43 pairs) and lower tiers from `EXERCISE_CURATION_CANDIDATES_PROD.md` still need
      hand review (some are false positives, e.g. "Warm-up Set 1/2/3" labels); the `getFilteredExercises`
      catalog-size-in-prompt work this ticket was originally scoped around is also still open.
- [x] **LR-056** — (new 2026-07-08, closed same day) Added a unique index on `lower(name)`
      (`idx_exercises_name_unique`, local + prod) and hardened `createExerciseIfNotExists` with a
      conflict-safe insert (bare `.onConflictDoNothing()` + fallback lookup for the race loser) —
      closes the TOCTOU gap that likely contributed to LR-035's duplication. Verified locally with
      a direct concurrent-insert test (two inserts of the same name: first creates, second returns
      undefined via conflict, fallback lookup returns the winner) before deploying.
- [x] **LR-036 · LR-037 · LR-038** — done (see `LOOP_QUEUE.md` L17/L18/L6). **Correction
      2026-07-09**: this line previously said "not started" — stale, missed in the same pass that
      fixed the rest of this section. Prior perf work (queue/lock stall fix, per-phase timing,
      faster polling) is DONE — see memory `project_workout_generation_queue`, don't re-open it.
- [x] **LR-057** — (new + closed same day) `searchExercises` had no `ORDER BY` — results returned
      in arbitrary DB order rather than by relevance. Found via user report + screenshot. Fixed:
      relevance rank (exact name > starts-with > contains > fuzzy-only), then similarity score,
      then name as a stable tiebreak. Verified against the exact "pull-up" query from the report
      directly on production data before writing tests. 2 new tests, full suite green (69/69).
- [x] **LR-058** — (new + closed same day) 61% of production exercises (1,065/1,733) had
      `muscle_groups` stored as one comma-joined string instead of separate array elements,
      breaking `arrayOverlaps()`-based filtering for those rows in both generation and search — a
      much bigger deal than the search-ordering issue above. 18 of those also had a leaked
      equipment token recovered as a real missing equipment value. Fixed and verified on
      production via `fix-muscle-groups.ts`. Worth revisiting LR-012/013/049 with this in mind —
      the effective generation catalog just got meaningfully bigger and more correct.
- [x] **LR-059** — (new + closed same day) The user's screenshot-reported "Strict Pull-Up" (id
      615, 0.82 similarity — below the tiers LR-035's dedup covered) vs. "Strict Pull-Ups" (id
      2070) turned out to have real content differences (difficulty `moderate` vs `high`) once
      LR-058 fixed 615's malformed muscle_groups — not a pure formatting duplicate. User decided by
      hand: keep 2070 (Lats/Back/Biceps, high), delete 615. 34 `plan_day_exercises` references
      reassigned to 2070 first; verified 0 orphans after.
- [x] **LR-060** — (new + closed same day, found via user report + screenshot) "AbMat Sit-Up" (id
      2000, 22 refs) vs. "AbMat Sit-Ups" (id 2041, 79 refs) — 0.80 similarity, in the medium tier
      LR-035's dedup explicitly didn't review. Genuine duplicate on inspection. User decided: keep
      2041 (more refs, richer muscle_groups). 22 refs reassigned, 2000 deleted, 0 orphans after.
- [x] **LR-061** — (new + closed same day, found via the same user report) No plain bodyweight
      "Sit-Up" existed in the catalog at all — only variants (AbMat, stability ball, weighted
      combos). Added one (id 2123, core/abdominals, bodyweight, moderate), sourced a real demo
      video via web search (PT-demonstrated form) rather than leaving `link` null — every other row
      in the catalog has one, would have broken that convention. Catalog now at 1,732 rows (net
      zero: -1 AbMat merge, +1 new Sit-Up).

## Epic 4 — Test coverage foundation
- [x] **LR-017 / LR-018 / LR-019 / LR-045** — all closed 2026-07-09, details under Epic 1 above
      (that's where the earlier entries for these landed; cross-referencing rather than
      duplicating).
- [ ] LR-020 · LR-021 — not started.
- [x] **LR-044** — Jest (`jest-expo` preset) + React Native Testing Library installed, `npm test`
      script added, config in `package.json`. Smoke test at
      `utils/__tests__/is-valid-email.test.ts` (3 passing) confirms path-alias resolution
      (`@/utils`) works through the harness. Done 2026-07-07.
- [ ] LR-046 · LR-047 · LR-048 — not started. LR-046 (component smoke tests) likely blocked by the
      known RNTL/React-19 `act()` issue; LR-047 (Maestro vs. Detox)/LR-048 (add CI or not) are open
      tooling/process decisions, not attempted autonomously.
- [~] **LR-054** — backend baseline moved 66 → 61 as a side effect of LR-062 (see below), not a
      deliberate cleanup pass — the remaining 61 are still deferred, same spirit as the frontend
      lint-backlog plan. LR-055 (frontend, 35) untouched, still deferred.
- [x] **LR-062** — done 2026-07-09. First route-level integration test in the backend (`supertest`,
      real `searchRouter` mounted on a minimal harness app — not the real `@/app`, which uses
      `import.meta` and can't compile under ts-jest's CommonJS transform, a documented constraint).
      Mocks auth + the service layer, asserts on what the route actually forwarded — exactly what
      LR-023's real bug got wrong. Verified the test has teeth by temporarily reintroducing the
      exact original bug and confirming it fails, then restoring the fix. Blocked initially by 5
      pre-existing tsc errors in `search.routes.ts` itself (`expressAuthentication` called with a
      plain pre-auth `Request`, missing the `as AuthenticatedRequest` cast every other route file
      already uses) — fixed those directly rather than working around them, dropping the backend
      tsc baseline from 66 to 61.

## Epic 5 — Search quality
- [x] **LR-022** — done. Typo-tolerant fuzzy matching via `pg_trgm` similarity, plus LR-057's
      relevance ordering on top. **Correction 2026-07-09**: this line previously said "not
      started" — stale, same pattern as Epic 3's earlier correction. Was actually done via the
      earlier autonomous loop (`LOOP_QUEUE.md` L7/L19).
- [x] **LR-023** — **Really closed 2026-07-09** (an earlier same-day pass claimed this done, but
      that was premature — see below). Backend service/controller supported `hasMore`/`limit`/
      `offset` via the loop, but nothing on the frontend used it — `searchExercisesAPI` never
      passed the params, and `search-view.tsx` just showed the default page. Wired up limit/offset
      pass-through and a "Load More" button. **Real bug found via live user testing**: after that
      fix shipped, "Load More" still didn't work — count frozen, button never disappeared. Root
      cause: the hand-wired Express route (`search.routes.ts`, the file that actually serves
      traffic — TSOA's generated `routes.ts` never does) called
      `controller.searchExercises(query)` with a single argument, silently dropping limit/offset
      from every request regardless of what was sent. Every "Load More" tap was re-fetching page 1.
      Confirmed via live diagnostic logging in the app (offset=20 returned the identical ids as
      offset=0) rather than guessed — two prior fix attempts (an ORDER BY id tiebreak, an
      auto-search-effect guard) were reasonable hypotheses but didn't address the real cause; kept
      both anyway since they're harmless hardening. Also fixed while investigating: scroll position
      after Load More (now scrolls to the first newly-loaded item instead of jumping to the top).
      **UX follow-up, same day**: added a real total-match count (`search.service.ts`, a `COUNT(*)`
      sharing the exact WHERE clause with the page query, run concurrently) so the header reads
      "20 of 40" instead of a bare count that read as "only 20 total exist" until the Load More
      button was noticed.
- [x] **LR-024** — done. Natural-language date phrases ("today"/"yesterday"/"this week"/"last
      week") in `searchByDate`, via `date-phrase-resolver.ts` (`LOOP_QUEUE.md` L8).
- [x] **LR-025** — done. Search telemetry (`logSearchTelemetry`) — zero-result queries logged at
      warn, others at info (`LOOP_QUEUE.md` L7).
- [x] **LR-057** — see Epic 3 above (tracked there since it was found via the exercise-catalog
      investigation, but it's really an Epic 5 ticket).

## Epic 6 — UI/UX
Tracked in `../design_handoff_ux_remediation/PROGRESS.md` (Track 4 in flight). Track 5 (this
folder's BACKLOG.md, LR-051) is new, unscoped, not started — workout logging/gesture-based entry.

## Epic 7 — Platform parity
- [ ] LR-026 · LR-027 · LR-028 · LR-029 · LR-030 — not started.

## Epic 8 — Observability
- [x] **LR-031** — Confirmed 2026-07-07: real production Sentry DSN already exists in EAS's
      hosted "production" environment (separate system from `.env`/`eas.json`'s static `env`
      field — the original audit only checked the latter, which is why it looked missing).
      `eas.json`'s `production` and `apk` build profiles now explicitly bind
      `"environment": "production"` so this is guaranteed to be pulled in, not just inferred.
      **Fully closed 2026-07-09** — build 72's log confirmed `EXPO_PUBLIC_SENTRY_DSN` loaded from
      the production environment during the actual EAS build.

## Epic 9 — Store submission readiness
- [ ] LR-032 · LR-033 · LR-034 — not started (gated on Epics 1 & 2 P0 items).
- **Milestone, 2026-07-09**: shipped iOS build 72 (app version 1.0.2) to TestFlight — first real
  production build of this launch-readiness effort. Merged PR #35 (`feat/ux-remediation`) and #36
  (`feat/ux-track4`, 45 commits, everything from this session) into `main` first. Not itself an
  LR-032/033/034 ticket, but the build that finally closed LR-002/LR-031. MF-004/MF-005's
  colorblind-sim hue sign-off was still pending at ship time — shipped anyway per explicit user
  choice, not forgotten. Android not yet re-built with this same code.

## Epic 10 — Conversational workout modification
- [ ] LR-039 · LR-040 · LR-041 · LR-042 · LR-043 — not started. New feature idea captured
      2026-07-07, not yet scoped/designed (LR-039 is that design pass). Not a launch blocker —
      prioritize relative to the rest once the user has fleshed it out further.
