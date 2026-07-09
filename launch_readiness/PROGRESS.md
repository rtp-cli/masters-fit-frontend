# Launch Readiness — Progress

> Source of truth for "what's actually done." BACKLOG.md is the ticket list and isn't updated
> after the fact — check items off here.

## Locked priority order (decided 2026-07-07)

Rationale: fix live/cheap problems first regardless of epic, then make-or-break product quality,
then differentiate/refine, then harden (payments polish + bulk test coverage), then ship. Tests
are pulled forward as scaffolding (Phase 0) so Phases 1-2 can write tests as they build, not
retrofit them in Phase 3.

- [~] **Phase 0 — quick wins, do now, don't wait:** LR-002, LR-003, LR-004, LR-031, LR-044. **3 of
      5 fully done and verified** (LR-003, LR-004, LR-044). **2 still open** (LR-002, LR-031) —
      both need a real EAS production build to confirm the real keys/DSN land in the actual
      binary; Test Store/Simulator testing doesn't exercise that build path.
- [~] **Phase 1 — make or break:** LR-036/037/038 (Epic 3) and LR-012/013/014/015/016/049 (Epic 2)
      are all done (LR-013 closed 2026-07-09, once the user made the enforcement-approach call).
      LR-035 is ~90% done (Tier 1/2 dedup + the muscle_groups/dup-related bugs it surfaced are
      closed; Tier 3+ hand-review and the original catalog-size-in-prompt goal remain as an
      optional tail). **What's actually left in Phase 1**: LR-050 (user chose to skip scoping for
      now) and LR-053 (small, no decision needed, found via LR-016) — otherwise this phase is
      effectively done.
- [ ] **Phase 2 — differentiate & refine:** Epic 10 (conversational mods) → Epic 5 (search) →
      Epic 6 (UI/UX Track 4 tail + Track 5 scoping) → Epic 7 (platform parity).
- [ ] **Phase 3 — harden:** Epic 1's remainder (LR-005/006/007/008/009/010/011) + Epic 4's bulk
      (LR-017/018/019, LR-045/046/047/048).
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
- [~] **LR-002** — Confirmed 2026-07-07: real production RevenueCat keys already exist in EAS's
      hosted "production" environment (not the sandbox ones in local `.env` — that's a different,
      correctly-sandbox-scoped file for local/simulator dev). `eas.json` now explicitly binds
      `production`/`apk` profiles to that environment. **Not fully closed** — needs a real EAS
      build to confirm the keys actually land in the bundle.
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
- [ ] LR-005 · LR-006 · LR-007 · LR-008 · LR-009 · LR-010 · LR-011 · LR-052 — not started (Phase 3).
      LR-052 added 2026-07-07: paywall bullet copy needs real content work (structural
      monthly-vs-annual tiering bug already fixed same day).

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
- [ ] LR-053 — not started (new, found 2026-07-08 via LR-016). No decision needed, just not done.
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
- [ ] LR-017 · LR-018 · LR-019 · LR-020 · LR-021 — not started.
- [x] **LR-044** — Jest (`jest-expo` preset) + React Native Testing Library installed, `npm test`
      script added, config in `package.json`. Smoke test at
      `utils/__tests__/is-valid-email.test.ts` (3 passing) confirms path-alias resolution
      (`@/utils`) works through the harness. Done 2026-07-07.
- [ ] LR-045 · LR-046 · LR-047 · LR-048 — not started.
- [ ] LR-054 · LR-055 — not started (added 2026-07-09: backend/frontend `tsc` backlog cleanup,
      deferred same as the frontend lint-backlog plan — tracked so it isn't forgotten, not urgent).

## Epic 5 — Search quality
- [ ] LR-022 · LR-023 · LR-024 · LR-025 — not started.

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
      **Not fully closed** — needs a real EAS build to confirm the DSN actually lands in the
      bundle before this is 100% done; flagging rather than claiming full confidence.

## Epic 9 — Store submission readiness
- [ ] LR-032 · LR-033 · LR-034 — not started (gated on Epics 1 & 2 P0 items).

## Epic 10 — Conversational workout modification
- [ ] LR-039 · LR-040 · LR-041 · LR-042 · LR-043 — not started. New feature idea captured
      2026-07-07, not yet scoped/designed (LR-039 is that design pass). Not a launch blocker —
      prioritize relative to the rest once the user has fleshed it out further.
