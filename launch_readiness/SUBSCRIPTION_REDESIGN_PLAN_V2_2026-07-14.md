# MastersFit Subscription Redesign — Revised Plan (V2, narrowed)

**Status:** Planning only. No code/schema/migration/config/test/copy/package changes made.
**Date:** 2026-07-14. Supersedes `SUBSCRIPTION_REDESIGN_PLAN_2026-07-13.md`.
**Stage assumption:** pre-release, ~2 real users + many dev/test accounts, AI-assisted implementation under owner supervision.

Legend: **[V]** verified in code this pass (file:line) · **[V-prior]** verified in the first audit, still accurate · **[U]** uncertain · **[R]** recommendation · **[O]** my opinion/challenge.

---

## 1. Executive recommendation

**I agree with the narrowed direction.** It removes the three things my first plan over-reached on for this stage — a DB-managed entitlement/config platform, a second usage-counter projection table, and cohort-rollout infrastructure — while keeping the parts that are genuinely load-bearing: separate typed entitlements, a single AI-operation ledger, atomic allowance consumption, and security-first sequencing. A typed policy module is the right altitude here; a data-driven entitlement engine would be solving a scale/flexibility problem MastersFit does not have.

**Material objections / honest pushback [O]:**

1. **Priority 0 is bigger than "add a middleware."** The IDOR is not "route forgets to compare `path.userId` to JWT" — it's deeper: **services query by object id with no `userId` in the WHERE clause, and controllers never read `req.userId`** [V]. Every object-keyed route in `logs.routes.ts`, most workout-content routes, and all three profile routes are confirmed IDOR [V]. Fixing this correctly means threading ownership into ~30+ service methods (or a reusable ownership-precheck helper per object type), not one guard. This is the single largest real work item and it is a true security/correctness concern, not abstraction. Do not let "AI can generate code fast" compress the *verification* of this.
2. **Health gating is inherently cosmetic today, and that's fine — but be precise.** Health data never leaves the device and never enters prompts [V-prior]. A client-only gate is the *only* option and is acceptable per your direction, but it is bypassable in principle. I agree with gating it client-side now; I'd just record explicitly that this gate is UX, not enforcement, and becomes real only when health data crosses to the server. **Advanced analytics is different** — those endpoints return data, so they must be **server-gated**, not client-gated.
3. **Reasonable-use controls: build the two that are also bug-fixes now, stub the rest.** The **one-job-per-user concurrency guard** and **idempotency key** are not rate-limiting niceties — they fix live correctness bugs (duplicate generations, double allowance/token charges on retry) [V-prior]. Build those now. Hourly/daily caps + cost anomaly thresholds won't trigger at 2-user scale; add the config knobs and a single guard hook, set generous values, and do **not** gold-plate monitoring/alerting yet. That would be infra-for-later.

**Recommended target architecture [R]:** a `resolveAccessTier()` pure function (`FREE|PLUS|COMPLIMENTARY|BYPASS`, billing states collapse into these) → a single typed **policy module** mapping `(tier) → capabilities` → a single **`ai_operations` ledger** that is the source of truth for allowance counting, idempotency, status, tokens/cost, and result linkage → atomic consumption via a **per-user advisory-lock transaction** (no second table). Object ownership enforced at the service-query layer. Config in one typed constants module with env overrides.

**Main simplifications from V1:** drop `product_config`/`entitlement_overrides` DB tables (→ typed config + 2 columns on `user_subscriptions`); drop the separate `ai_usage_counters` projection (→ derive from indexed ledger rows under an advisory lock); drop the workout state machine (→ one optional `sourceType` field); drop cohort-rollout tooling and the translated-migration machinery (→ hand-classify ~2 users); logging boundary resolved to **Model B** (§3), which touches zero active-workout code.

**Highest-risk areas:** (1) service-layer IDOR remediation breadth + regression risk; (2) atomic allowance correctness under concurrent requests; (3) billing recognition race + webhook hardening (a paid user seeing a paywall is a refund/review risk); (4) removing the workout-row-existence gate without accidentally re-consuming or freeing allowances during migration.

---

## 2. Confirmed product model

UI names: **MastersFit** (non-paid) and **MastersFit+** (paid). "FREE" is internal only; **do not render "MastersFit Free."**

**Access tiers (internal):**
- **FREE** — standard non-paid.
- **PLUS** — active paid access. Billing states `ACTIVE`, `GRACE_PERIOD` (while valid), `CANCELLED` (until period end) all **resolve to PLUS** [R]. `EXPIRED`/`PAUSED`/lapsed → FREE.
- **COMPLIMENTARY** — full PLUS entitlements, no payment; optional expiry; granted server-side via controlled data/tooling (§6); replaces the client demo-email hack.
- **BYPASS** — admin/dev full access; set only in server-side account data; also serves as the admin-authorization marker for admin endpoints (§8). ADMIN vs DEV is metadata for later; one entitlement behavior now.

**Capabilities:** `NEW_PLAN`, `INITIAL_PLAN`, `WEEK_ADJUSTMENT`, `DAY_ADJUSTMENT`, `PREMIUM_ANALYTICS`, `HEALTH_INTEGRATION`, `PREMIUM_HISTORY` (advanced history/analytics read). Logging is **not** a gated capability under the recommended Model B (§3).

### Entitlement matrix

| Capability / behavior | FREE | PLUS / COMP / BYPASS | AI? | Free usage limit | Enforcement point |
|---|---|---|---|---|---|
| Full onboarding | ✅ | ✅ | no | — | none |
| Initial weekly plan | ✅ once (lifetime) | ✅ | yes | 1 lifetime | ledger reserve (`INITIAL_PLAN`) |
| New weekly plan (ongoing) | ❌ | ✅ (fair-use) | yes | 0 | policy + ledger |
| Full-week AI adjustment | ✅ 1 lifetime | ✅ (fair-use) | yes | 1 lifetime | policy + ledger reserve |
| Single-day AI adjustment | ✅ 3 lifetime | ✅ (fair-use) | yes | 3 lifetime | policy + ledger reserve |
| Rest-day AI workout | counts as a day-adjustment (§5/§7) | ✅ | yes | shares day allowance | policy + ledger |
| View all owned workout content | ✅ | ✅ | no | — | ownership only |
| Repeat any owned day/week (completed or not) | ✅ | ✅ | no | unlimited | ownership only (no AI) |
| Deterministic exercise substitution | ✅ | ✅ | no | unlimited | ownership only |
| Enter set data during active workout | ✅ | ✅ | no | — | ownership (Model B) |
| Mark workout complete + basic completion state | ✅ | ✅ | no | — | ownership |
| Advanced progress analytics (weight/volume/progression/PR/consistency history) | ❌ | ✅ | no | — | **server** entitlement gate |
| Apple Health / Health Connect | ❌ | ✅ | no | — | **client** gate (local-only) |
| Disconnect/remove health integration | ✅ (always) | ✅ | no | — | client |
| Future adaptive/coaching | ❌ | ✅ (future) | yes | — | deferred |

**Rules:** free AI allowances are **lifetime, non-renewing**; never expose tokens/credits to users; **failed AI op does not consume an allowance**; **successful op consumes it even if the user dislikes the result**; reinstall/sign-out/device-change/repeat never reset allowances.

---

## 3. Logging-boundary recommendation → **Model B** [R, evidence-backed]

**Recommendation: Model B** — free users enter basic set data during the active workout; **MastersFit+ gates the retention/analysis (advanced history + progress analytics)**, not the in-workout entry.

**Why (verified this pass):**
- The active-workout screen **hard-couples advancement to logging**: for regular strength exercises, `completeExercise` refuses to advance without at least one logged set (the "No Progress Logged" gate, `frontend/app/(tabs)/workout.tsx:1233-1246`) [V], and it writes `createExerciseLog` *before* `markPlanDayAsComplete` on the final exercise (`workout.tsx:1262,1303`) [V]. Model A would 403 those writes → the day never completes and free users **cannot progress past any strength exercise**. That is exactly the "crippled free workout" you want to avoid.
- **Weekly completion % reads log presence**, not `isComplete`: `getWeeklySummary` computes `completedWorkouts` from `COUNT(exerciseLogs.id) > 0` (`backend/src/services/dashboard.service.ts:299,316-318`) [V]. Under Model A a free user's completed days would render as **0%** — the dashboard would look like they did nothing. Model A therefore also forces a backend query change.
- **Writes vs reads are already cleanly separated** [V]: all detailed-log writes live in `logs.routes.ts`/`logs.service.ts`; all analytics/history computation lives in `dashboard.service.ts` / `metrics-calculation.service.ts` / `workout-analytics.service.ts` behind separate routes. Gating reads does **not** touch the write path or `workout.tsx`/`adaptive-set-tracker.tsx` at all.
- The **streak reads `planDays.isComplete` only** (`dashboard.service.ts:499-523`) [V], so basic completion works for free users under either model — confirming "basic completion does not depend on paid-only records."
- Note [V]: `hooks/use-workout-session.ts` and `components/set-tracker.tsx` are **legacy/dead** (no importers); the live path is `workout.tsx` + `components/adaptive-set-tracker.tsx`. Don't waste effort gating dead code.

**Exact gating surface for Model B — gate these READ endpoints server-side** (add the entitlement guard; capability `PREMIUM_ANALYTICS`/`PREMIUM_HISTORY`):
- Backing `metrics-calculation.service.ts`: weight metrics (`:24`), weight accuracy (`:104`), total volume (`:261`), weight/strength progression (`:316`).
- Backing `workout-analytics.service.ts`: workout-type metrics (`:227`), consistency history (`:105`).
- The corresponding `dashboard.routes.ts` routes: `workout-consistency`, `weight-metrics`, `weight-accuracy`, `total-volume`, `workout-type-metrics`, `weight-progression`, `weight-accuracy-by-date`, `workout-type-by-date`.
- **Leave free:** `/:userId/metrics` (basic), `/:userId/weekly-summary` (streak/weekly completion), all `logs/*` writes, `logs/workout/day/:planDayId/complete`.

**Client screens affected:** the dashboard progress sections (`StrengthProgressSection`, `WeightPerformanceSection`, `WorkoutTypeDistributionSection` in `dashboard-screen.tsx`) show a paywall/locked state for FREE; the active-workout screen and basic dashboard (streak, weekly progress, active card, health carousel visibility per health gate) are unchanged.

**No new logging fields** are proposed (per scope).

---

## 4. Simplified target architecture

```
                 RevenueCat webhook / DB              user_subscriptions (+access_override)
                          │                                     │
                          ▼                                     ▼
                 resolveAccessTier(userId) ──► FREE | PLUS | COMPLIMENTARY | BYPASS
                          │
             ┌────────────┴─────────────┐
             ▼                          ▼
   Typed Policy Module            AI Operation Service
   (tier → capabilities)          begin() → check tier+capability
   requireCapability(cap)              → [advisory lock tx] count ledger vs limit
   requireOwnership(objType,id)        → insert 'reserved' + enqueue (idempotencyKey)
             │                          → worker settles 'completed'(+tokens/cost) or 'failed'(release)
             ▼
   Route middleware (server = source of truth)          Client (UX only, reads capabilities from /status)
```

- **Access-tier resolution [R]:** pure `resolveAccessTier(subscription, now)`. `access_override` (COMPLIMENTARY/BYPASS, optional expiry) wins; else billing status maps: ACTIVE/GRACE(valid)/CANCELLED(valid)→PLUS, else FREE. No caching needed at this scale (DB read is cheap); add a request-scoped memo only if profiling shows it.
- **Typed policy module [R]:** one file, e.g. `access-policy.ts`, exporting a typed `CAPABILITIES_BY_TIER` map (each tier to its set of capabilities) and helpers `can(tier, cap)`, plus `requireCapability(cap)` and `requireOwnership(objectType, idParam)` Express middlewares. All entitlement logic lives here — not scattered in routes.
- **AI operation ledger [R]:** single append-oriented `ai_operations` table (§6) is the source of truth for free-allowance counting, idempotency, status, tokens/cost, and result linkage. Lifetime free counts = `COUNT(*) WHERE userId=? AND operationType=? AND status IN ('reserved','completed') AND countedAgainstFreeAllowance=true`.
- **Atomic allowance enforcement [R] — advisory-lock transaction, no extra table:**
  ```
  BEGIN;
  SELECT pg_advisory_xact_lock(:userId);           -- serialize this user's AI ops
  -- idempotency: if a row with this idempotencyKey exists, return its jobId, COMMIT.
  -- count committed+reserved counted rows for this op type; if >= limit → 403, ROLLBACK.
  INSERT ai_operations (... status='reserved', countedAgainstFreeAllowance=true, idempotencyKey);
  COMMIT;  -- then enqueue Bull job outside the tx
  ```
  This makes "two simultaneous requests with one allowance left" safe with the smallest possible mechanism. A `UNIQUE(idempotencyKey)` index is the second guard (duplicate suppression even without the lock). **Justification for no counter table [O]:** at any realistic scale a user has a handful of AI ops lifetime; an indexed `COUNT` under a per-user advisory lock is O(tiny) and cannot overrun. A projection table would be pure ceremony here.
- **Idempotency [R]:** client sends an `Idempotency-Key` (per intentional action, stable across retries). Server: duplicate key → return the existing operation's `backgroundJobId` (no new spend, no new job). Fixes the current "unique Bull jobId per request defeats dedup" gap [V-prior].
- **Job lifecycle [R]:** reserve → enqueue → worker runs LLM → on success `settle('completed', tokens, cost, resultWorkoutId)`; on failure `settle('failed', reason)` which **releases** the reservation (stops counting) so a failed op costs no allowance. Retries are idempotent on the ledger row (settle-once). Per-user concurrency: reject/queue a second AI op while one is `reserved`/running.
- **Token/cost accounting [R]:** keep `llm_generation_logs` for per-LLM-call detail; the ledger stores the operation-level roll-up (input/output/total tokens + `estimatedCost` computed from per-model rates). This replaces the current process-local `lastTokenUsageByUser` map and the divergent `trial_usage.tokensUsed` counter. Tokens/cost are **internal only**.
- **Reasonable-use controls [R]:** §9 — concurrency + idempotency now; generous rate/anomaly knobs as config.
- **Client/server responsibilities:** server enforces tier, capability, ownership, usage. `/subscriptions/status` returns resolved tier + capability booleans + free-allowance remaining (for a usage hint, never tokens). Client gates UI cosmetically and renders the paywall on 403; **health is the one client-only gate** (local-only feature).

---

## 5. Workout-origin decision → **YES to one optional `sourceType` field; NO to a state machine** [R]

- **Entitlement truth is the ledger, not workout rows.** The initial-plan allowance is consumed by a **successful `INITIAL_PLAN` operation** linked to its `resultWorkoutId` — never by "a row exists in `workouts`." This removes the current bug where a partial/failed/rest-day/seeded/repeated/manual row can trip `userHasWorkoutHistory` [V-prior].
- **What a `sourceType` field enables:** data lineage; analytics (AI vs repeat vs manual vs rest-day); debugging; and cleanup of partial async rows. These are real, low-cost benefits.
- **Recommendation:** add a single nullable `workouts.sourceType` enum (`ai_initial | ai_new_week | ai_regen | rest_day | repeat | manual`) as **descriptive metadata only**. Do **not** add `generationStatus` or a state machine — current failure handling doesn't need it (generation writes the row only after LLM success; rest-day has its own best-effort cleanup) [V-prior], and the ledger's `status` already models operation lifecycle. If a partial-row problem shows up in practice, the ledger→`resultWorkoutId` link plus `sourceType` is enough to find and clean it.
- **Net:** `sourceType` = yes (small, useful, not authoritative). Origin/generation state machine = no.

---

## 6. Exact schema plan

Only what this refactor truly needs. (Reminder [V-prior]: deploy is `drizzle-kit push`, no migration files, `db:migrate` aliased to push, `db:check` is a preview — see §14 checkpoint before any push.)

| # | Table/field | Purpose | Constraints/Indexes | Required? | Reset/backfill | Legacy removal |
|---|---|---|---|---|---|---|
| 1 | **`ai_operations`** (new) | Source of truth for AI ops: allowance counting, idempotency, status, tokens/cost, result link | PK id; FK userId→users cascade; `UNIQUE(idempotencyKey)`; idx `(userId, operationType, status)`; idx `(status)` | **Required** | none (new) | — |
| 1a | fields | id, userId, operationType(enum text), status(`reserved\|completed\|failed`), idempotencyKey, backgroundJobId(FK), accessTierAtRequest, countedAgainstFreeAllowance bool, inputTokens, outputTokens, totalTokens, model, provider, estimatedCost numeric, resultWorkoutId(FK nullable), failureCode, failureReason, createdAt, completedAt | — | — | **Required** | — | — |
| 2 | `user_subscriptions.access_override` (new col, nullable enum `COMPLIMENTARY\|BYPASS`) | Server-side COMP/BYPASS grant without client hack | idx optional | **Required** | set by tooling for demo/dev/comp users | — |
| 3 | `user_subscriptions.access_override_expires_at` (new col, nullable ts) | Optional COMP expiry | — | **Required** | null = no expiry | — |
| 4 | `workouts.source_type` (new col, nullable enum) | Lineage/analytics/cleanup metadata (§5) | idx `(userId, source_type)` optional | Optional (recommended) | backfill best-effort by heuristic; nulls fine | — |
| 5 | `user_subscriptions.plan_id` → real FK to `subscription_plans.plan_id` | Integrity | FK | Optional | validate existing strings | keep string col if FK risky |
| 6 | `trial_usage` | — | — | — | **retain read-only** during P1–P2 verification | **drop in P3** after validation (data is disposable; no archive needed at this scale) |
| 7 | Real Drizzle migrations (`generate`+`migrate`) | Auditable schema history for a security-sensitive change | tooling | **Required (foundation)** | baseline current schema once | keep `push` for local dev |

Explicitly **not** adding: `ai_usage_counters` projection (advisory-lock count suffices, §4); `generationStatus`/state-machine; RPE/distance/timing/per-set fields; `product_config`/`entitlement_overrides` tables (typed config + the 2 override columns replace them).

---

## 7. Exact route & service plan

**Cross-cutting fix (the core of P0):** ownership is currently absent at the **service** layer (queries by object id, no `userId` scope) and controllers never read `req.userId` [V]. Remediation pattern [R]: add a reusable `requireOwnership(objectType, idParam)` middleware that resolves the object→owning userId and 403s unless it equals `req.userId`; **and** defensively scope the service queries by `userId` where practical. For path-`:userId` routes, also assert `path.userId === req.userId`.

| Path (file:line) | Current problem [V] | Auth+ownership required | Entitlement | Usage | Idempotency | Paywall response | Analytics event | Downgrade |
|---|---|---|---|---|---|---|---|---|
| `POST /workouts/:userId/generate-async` (`:161`) | onboarding-gate uses row-existence; no path/JWT check | JWT==path | `INITIAL_PLAN` if none else `NEW_PLAN` | reserve 1 (initial: free-1; new: PLUS only) | Idempotency-Key | 403 `{paywall}` | `initial_plan_*`/`new_plan_*` | new blocked; owned content stays |
| `POST /workouts/:userId/regenerate-async` (`:179`) | OR-counter; token cap real limit | JWT==path | `WEEK_ADJUSTMENT` | reserve week-adj (free 1 / PLUS fair-use) | key | 403 | `week_adjustment_*` | blocked when FREE |
| `POST /workouts/:userId/days/:planDayId/regenerate-async` (`:204`) | no ownership on planDay; queues job on arbitrary planDay | JWT==path **+ own(planDay)** | `DAY_ADJUSTMENT` | reserve day-adj (free 3 / fair-use) | key | 403 | `day_adjustment_*` | blocked when FREE |
| `POST /workouts/:userId/rest-day-workout` (`:328`) | guard op mismatch; creates row pre-LLM | JWT==path | `DAY_ADJUSTMENT` | shares day allowance; create row only post-LLM | key | 403 | `rest_day_*` | blocked when FREE |
| `GET /workouts/jobs/:jobId/status` (`:367`) | no auth; no job ownership | auth **+ own(job)** | none | — | — | — | — | — |
| `PUT /workouts/:id` (`:57`) | **no auth, IDOR** | auth **+ own(workout)** | none (deterministic) | — | — | — | — | edit owned only |
| `POST /workouts/:workoutId/days` (`:76`) | **no auth, IDOR** | auth **+ own(workout)** | none | — | — | — | — | — |
| `POST /workouts/days/:planDayId/exercises` (`:95`) | **no auth, IDOR** | auth **+ own(planDay)** | none | — | — | — | — | — |
| `PUT /workouts/exercises/:id` (`:114`) | **no auth, IDOR** | auth **+ own(pdExercise)** | none | — | — | — | — | — |
| `DELETE /workouts/exercises/:id` (`:133`) | auth, but IDOR | **own(pdExercise)** | none | — | — | — | — | — |
| `PUT /workouts/exercise/:id/replace` (`:146`) | auth, but IDOR | **own(pdExercise)** | none (deterministic sub stays free) | — | — | — | `exercise_replaced` | free |
| `POST /workouts/:userId/repeat-week/:originalWorkoutId` (`:280`) | **no auth** (but service scopes by path userId) | auth + JWT==path | none (no AI) | none | — | — | `repeat_week` | stays free after downgrade |
| `POST /workouts/:userId/repeat-day/:planDayId` (`:313`) | auth; service checks path-userId | JWT==path | none | none | — | — | `repeat_day` | free |
| **All `logs/*`** (writes+reads, `logs.routes.ts`) | **systemic IDOR; many no-auth** [V] | auth **+ own(object→workout→userId)** on every route | none (Model B leaves logging free) | — | — | — | `workout_completed` (wire dormant event) | logs stay free; history read gated separately |
| `logs/workout/day/:planDayId/complete` (`:221`) | no auth, IDOR | auth + own(planDay) | none (free complete) | — | — | — | `workout_completed` | free |
| Dashboard advanced routes (§3 list) | 9/11 no auth; path-userId leak | auth + JWT==path | `PREMIUM_ANALYTICS` | — | — | 403 | `premium_analytics_attempted` | read-only history stays viewable? → **basic yes, advanced gated** |
| Dashboard `/metrics`, `/weekly-summary` | path-userId leak | auth + JWT==path | none (basic free) | — | — | — | — | free |
| `GET /profile/:userId`, `PUT /profile/:id`, `PUT /profile/user/:userId` (`profile.routes.ts`) | **IDOR read+write any profile** [V] | JWT==path/own(profile); ignore body userId | none | — | — | — | — | — |
| `exercise.routes.ts` mutations (`POST/PUT/DELETE`) | **unauthenticated writes to global catalog** [V] | auth **+ BYPASS** (admin-only) | BYPASS | — | — | 403 | `admin_action` | — |
| `GET /api/admin/llm-metrics` (`llm-metrics.routes.ts:8`), `prompts.routes.ts`, `ai-provider.routes.ts` | bearer-only, **no admin role** [V] | auth **+ BYPASS** | BYPASS | — | — | 403 | `admin_action` | — |
| **NEW** `POST /subscriptions/sync` | none — webhook race can 403 a just-paid user [V-prior] | JWT==actor | none | — | receipt id | — | `subscription_synced` | — |
| `POST /subscriptions/webhooks/revenuecat` | open if secret unset; no ordering; non-atomic dedup [V-prior] | signature; fail-closed | — | — | eventId (atomic) | 401 | `webhook_processed` | — |
| `GET /subscriptions/status` | returns DB only | JWT==actor | — | return tier+capabilities+free-remaining | — | — | — | — |

**Object-level ownership note [R]:** for every route keyed by `workoutId`/`planDayId`/`workoutBlockId`/`planDayExerciseId`/`exerciseLogId`/`profileId`/`jobId`, ownership must be verified by resolving the object to its owning `userId` (chain: exercise/block/planDay→workout→userId; log→its parent→workout→userId; job→userId; profile→userId) and comparing to the JWT. `path.userId === JWT.userId` is **not sufficient** for these — they don't carry a path userId, or the object may belong to someone else. Recommend a small typed `ownership.ts` with one resolver per object type, used by `requireOwnership`.

---

## 8. Priority 0 — security & billing (ordered by severity)

**A. Confirmed vulnerabilities (fix first):**
1. **Systemic object-level IDOR** [V]: all of `logs.routes.ts`; workout content routes `PUT /workouts/:id`, `POST /:workoutId/days`, `POST /days/:planDayId/exercises`, `PUT/DELETE /exercises/:id`, `PUT /exercise/:id/replace`, `GET /jobs/:jobId/status`; all three profile routes (read+write any profile). Root cause: service queries by object id with no `userId`; controllers never read `req.userId`. **Fix:** `requireOwnership` + service-level userId scoping.
2. **Path-userId IDOR / data leak** [V]: dashboard routes (9 unauthenticated, 2 authed-but-unverified) return any user's fitness/weight data; generation/regeneration routes act on path `:userId`. **Fix:** auth on all + `JWT==path`.
3. **Missing authentication** [V]: `PUT /workouts/:id`, `POST /:workoutId/days`, `POST /days/:planDayId/exercises`, `PUT /workouts/exercises/:id`, `repeat-week`, most `logs/*`, 9 dashboard routes, **exercise-catalog mutations** (anon can edit/delete the shared library). **Fix:** add `expressAuthentication`; catalog mutations → BYPASS-only.
4. **No admin authorization** [V]: no role concept in schema; `admin/llm-metrics`, `prompts`, `ai-provider` are any-authenticated-user. **Fix:** gate on `access_override = BYPASS` (the minimal admin marker; no separate role table now).
5. **Open webhook** [V-prior]: shared-secret compare; **accepts everything if the env var is unset**; no signature. **Fix:** require a verified signature/secret, **fail-closed** if unconfigured.

**B. Likely vulnerability needing verification:**
6. `daily regenerate-async` can enqueue a job on an arbitrary `planDayId` under the attacker's own userId (NEEDS-REVIEW [V]) — covered by the own(planDay) fix in #1, but verify the worker also re-checks ownership before mutating.
7. Client-supplied trust: confirm no endpoint trusts a body/path `access tier`/`status`/`isPro` (client `isPro` is display-only [V-prior]) — verify none leaks into a write.

**C. Correctness/reliability:**
8. Non-atomic check-then-increment → allowance overrun under concurrency [V-prior]. **Fix:** advisory-lock reservation (§4).
9. No idempotency → double-tap/timeout-retry enqueues duplicate generations; worker retry can double-charge tokens/allowance [V-prior]. **Fix:** Idempotency-Key + settle-once.
10. Webhook out-of-order + non-atomic dedup [V-prior]. **Fix:** store `eventTimestampMs`, ignore stale; dedup in one transaction.
11. Rest-day creates a `workouts` row before the LLM; best-effort cleanup can leak [V-prior]. **Fix:** create only post-LLM (or mark provisional and exclude from any gating via the ledger).

**D. Production configuration:**
12. RevenueCat prod keys are `test_` placeholders and absent from `eas.json` [V-prior] → SDK may never configure in prod. **Fix (config, owner-provided keys):** set real `appl_`/`goog_` keys in EAS production env.
13. No `POST /subscriptions/sync` + no server-side receipt validation → paid user can be 403'd until the webhook lands [V-prior]. **Fix:** add sync endpoint that validates with RC and flips access immediately; keep webhook as the durable source.
14. Remove the permanent client-only demo bypass (`utils/demo-account.ts`) in favor of a COMPLIMENTARY grant [V-prior].

---

## 9. Reasonable-use & cost control [R]

Values in typed config with env overrides; **generous, invisible to normal users.** Build the two that are also bug-fixes (concurrency, idempotency) now; add the rest as cheap guards with generous thresholds.

| Control | Initial value | Build now? | Rationale |
|---|---|---|---|
| Concurrent AI jobs / user | **1** (reject/queue 2nd) | **Yes** (fixes race + duplicate) | correctness, not just abuse |
| Idempotency key / action | required on all AI POSTs | **Yes** | fixes duplicate/retry double-charge |
| Duplicate cooldown | collapse identical op within **30s** via idempotency | Yes (falls out of idempotency) | double-tap |
| Hourly AI ops / user | **15** | knob now, generous | won't trigger at current scale |
| Daily AI ops / user | **40** | knob now, generous | won't trigger |
| Token warn threshold (internal) | per-user/day **> 500k tokens** → log/Sentry | light | anomaly signal |
| Cost warn threshold (internal) | per-user/day **> ~$3** est → log/Sentry | light | anomaly signal |
| Hard stop / manual review | per-user/day **> 2M tokens** → block + admin flag | knob now | runaway backstop |
| Admin override | BYPASS lifts all usage caps | Yes (free via tier) | support |

**Accounting rules:** reserve at request; settle real tokens+cost on success; **failed op releases the reservation (no allowance charged) but still records tokens/cost for cost tracking**; retries settle once. Never surface tokens/credits to users. **[O]** Do not build dashboards/alerting pipelines now — a `logger.warn` + Sentry breadcrumb at the thresholds is sufficient pre-release; real dashboards are P-later infra.

---

## 10. User reset & migration plan [R]

Tiny base ⇒ hand-classify, don't build machinery.

- **Real paid users:** preserve. If a legitimate `ACTIVE` RevenueCat subscription exists, they resolve to PLUS automatically via the new resolver — no action beyond verifying the row.
- **Dev/admin accounts:** set `access_override = BYPASS` explicitly (identify by known emails).
- **Invited testers/reviewers/demo:** set `access_override = COMPLIMENTARY` (optional expiry); this replaces the demo-email hack.
- **Non-paid real users:** reset to new free allowances. Mark `INITIAL_PLAN` consumed **only** if they have a verified, legitimate, successful initial generation — determined by inspecting their actual active AI workout (a handful of users, so verify by hand; seed one `completed INITIAL_PLAN` ledger row linked to that workout). Grant the fresh 1-week + 3-day allowances (i.e., zero used) regardless of old counters/token usage.
- **Legacy `trial_usage` counters + token counts:** ignore for the new model; **retain the table read-only** through P1–P2 for spot-verification, then **drop in P3**. Do not reuse it (its confusing semantics are what we're removing); do not archive (disposable at this scale).
- **Partial/failed/manual/repeated/seeded workout rows:** irrelevant to entitlement now (ledger is truth). Optionally set `sourceType` for lineage; safe to clean disposable test data.
- **No customer-facing migration campaign.**

---

## 11. Revised implementation backlog

Sizes relative: **S** trivial · **M** moderate · **L** large/careful. "Review" = owner stop-and-review checkpoint.

### Priority 0 — Security & billing correctness
- **P0-1 Ownership infra**: `ownership.ts` resolvers + `requireOwnership` middleware + `JWT==path` assertion. Dep: none. AC: unit tests per object type; cross-user request → 403. Size **M**. **Autonomous**, then **Review**.
- **P0-2 Apply auth+ownership to every route** in §7 (workouts, logs, profile, dashboard, jobs). Dep: P0-1. AC: authz test suite green; no route acts on unowned object. Size **L**. Autonomous; **Review before cutover**.
- **P0-3 Admin gate (BYPASS)** on llm-metrics/prompts/ai-provider + exercise-catalog mutations. Dep: P0-1, tier resolver (P1-1). AC: non-BYPASS → 403. Size **S**. Autonomous.
- **P0-4 Webhook hardening**: signature verify, fail-closed if unconfigured, `eventTimestampMs` ordering, atomic dedup. Dep: none. AC: unsigned rejected, stale ignored, dup once. Size **M**. Autonomous; **Review**.
- **P0-5 `POST /subscriptions/sync`** + RC receipt validation; wire client post-purchase. Dep: P1-1. AC: access flips immediately post-purchase without waiting for webhook. Size **M**. Autonomous; **Review**.
- **P0-6 RevenueCat prod keys in EAS** + remove demo-email hack. Dep: P1-1 (COMP grant). AC: SDK configures in prod build; demo user is COMPLIMENTARY. Size **S**. **Owner-required** (provide keys).

### Priority 1 — Durable subscription & AI foundation
- **P1-1 Access-tier resolver + `access_override` columns**. Dep: schema (P1-4a). AC: all billing states + overrides map correctly (unit). Size **M**. Autonomous.
- **P1-2 Typed policy module** (`CAPABILITIES_BY_TIER`, `requireCapability`). Dep: P1-1. AC: matrix (§2) encoded + tested. Size **S**. Autonomous.
- **P1-3 `ai_operations` ledger + AI-operation service** (reserve/settle/release, advisory-lock, idempotency, cost calc). Dep: P1-4a. AC: concurrency + idempotency + failure-release tests. Size **L**. Autonomous; **Review** (concurrency correctness).
- **P1-4a Schema: ledger + override cols + sourceType; adopt real migrations**. AC: migration generates cleanly; baseline captured. Size **M**. **Review before push** (§14).
- **P1-5 Rewire 4 AI routes onto the ledger; remove `userHasWorkoutHistory` gate**; fix rest-day (row post-LLM); wire worker settle/release + concurrency guard. Dep: P1-3. AC: initial/new/week/day gating matches matrix; failed op charges nothing; no partial-row consumption. Size **L**. Autonomous; **Review**.

### Priority 2 — Product gates & client behavior
- **P2-1 Advanced-analytics server gate** (Model B read routes, §3). Dep: P1-2. AC: FREE 403 on advanced, 200 on basic. Size **M**. Autonomous.
- **P2-2 Repeat policy**: ensure repeat routes never invoke AI/consume allowance; owned-content only (completed-or-not, per revised policy). Dep: P0-2. AC: repeat never touches ledger. Size **S**. Autonomous.
- **P2-3 Client capability plumbing**: `/status` returns tier+capabilities+free-remaining; client gating util from that (not client `isPro` guess). Dep: P1-2, P0-5. AC: UI gates match server. Size **M**. Autonomous.
- **P2-4 Paywall triggers + resume-after-purchase**: paywall not shown before first plan; interrupted AI action resumes after purchase. Dep: P2-3. AC: e2e resume works. Size **M**. Autonomous; **Review (UX)**.
- **P2-5 Health client gate + disconnect/delete path**. Dep: P2-3. AC: non-PLUS can't open; disconnect/remove always available. Size **S**. Autonomous.
- **P2-6 Downgrade behavior**: owned content viewable, repeat works, advanced analytics read locked, logs stay free. Dep: P2-1,P2-3. AC: downgrade matrix (§12). Size **S**. Autonomous.

### Priority 3 — Migration, cleanup, verification
- **P3-1 Classify/seed users** (BYPASS/COMP/paid/free; seed INITIAL_PLAN ledger rows for verified initial gens). Dep: P1-3. AC: each real+test user in correct tier. Size **S**. **Owner-required** (identify accounts). **Review**.
- **P3-2 Drop `trial_usage`; remove dead OR-logic/token-cap-as-limit/mislabeled constants; remove dead `use-workout-session.ts`/`set-tracker.tsx` if confirmed unused**. Dep: all above validated. AC: no refs remain. Size **M**. **Review before deletion**.
- **P3-3 Test suites** (§12) + **P3-4 e2e validation + release checklist**. Dep: all. AC: matrix green. Size **L**. Autonomous; **Review**.

---

## 12. Test & verification matrix

- **Cross-user access (path-userId):** user A cannot generate/regenerate/read dashboard for user B → 403.
- **Object-level ownership:** A cannot update/delete/read B's workout, plan day, exercise, log, profile, or job by object id → 403 (one test per object type).
- **Webhook:** unsigned rejected; secret-unset → fail-closed (reject); stale/out-of-order ignored; duplicate `eventId` processed once.
- **Duplicate purchase / restore:** restore grants PLUS; duplicate webhook idempotent.
- **Post-purchase race:** purchase then immediate AI action → `/subscriptions/sync` flips access; no 403.
- **Concurrency:** two simultaneous free requests, one allowance left → exactly one succeeds, one 403.
- **Client retry after timeout:** same Idempotency-Key → one operation, one job, one charge.
- **Worker retry after partial failure:** LLM re-run guarded; settle-once; no double allowance/token.
- **Failed AI op:** allowance NOT consumed; ledger row `failed`/released.
- **Successful AI op:** consumes exactly one; persists even if user abandons result.
- **Repeat:** never calls LLM, never consumes allowance, never replenishes allowance; works after downgrade.
- **Health:** gated to PLUS/COMP/BYPASS; downgraded user can always disconnect/remove.
- **Downgrade:** owned content viewable + repeatable; advanced analytics locked; basic completion + logging still work.
- **COMPLIMENTARY expiration:** access ends at expiry → resolves to FREE.
- **BYPASS:** never settable via client input; admin endpoints require it.
- **Billing states:** ACTIVE/GRACE/CANCELLED-until-period-end → PLUS; EXPIRED/PAUSED → FREE.
- **Migration:** each real/test user lands in correct tier; verified initial gen marks INITIAL_PLAN consumed; others get fresh allowances.

---

## 13. Deliberately deferred (guardrail against drift)

RPE/distance/timing/per-set logging fields · wearable (Watch/Wear OS) · adaptive/conversational coaching · nutrition/mobility · generalized entitlement DSL / DB capability matrix · external feature-flag platform · broad admin dashboards · `ai_usage_counters` projection table · cohort-rollout tooling · UI redesign · unrelated DB cleanup · legacy token limits/credits · any user-facing token/credit display · server-side health enforcement (until health data crosses to server) · workout generation-status state machine · caching layer for access resolution.

---

## 14. Recommended implementation sequence + mandatory stop-and-review checkpoints

1. **P0 security core** (P0-1, P0-2 ownership/auth; P0-4 webhook). These change no product behavior and close live holes.
   → **CHECKPOINT A — before schema application (P1-4a push):** review ownership model + migration diff; confirm `drizzle-kit generate` output; verify against a scratch DB before touching prod.
2. **P1 foundation** (P1-4a schema, P1-1 resolver, P1-2 policy, P1-3 ledger/service).
   → **CHECKPOINT B — before route enforcement cutover (P1-5, P2-1):** review the ledger concurrency/idempotency tests and the entitlement matrix encoding; this is the correctness gate.
3. **P1-5 rewire AI routes + P0-3 admin + P0-5/P0-6 billing sync/keys.**
   → **CHECKPOINT C — before client paywall cutover (P2-3/P2-4):** confirm server enforcement is correct and complete first, so the client only reflects truth.
4. **P2 client gates + product behavior** (P2-1…P2-6).
5. **P3-1 classify users** → **P3-3/4 tests + e2e**.
   → **CHECKPOINT D — before legacy deletion (P3-2):** confirm everything validated; only then drop `trial_usage` and remove dead code.

**[O] on timeline:** code can be produced in one or two concentrated sessions, but the four checkpoints are non-negotiable — the risk here is entirely in *verification* of ownership, concurrency, billing state, and async settle/release, none of which are visible by reading generated code. Budget the review time; don't compress it because the diff arrived quickly.

---

## 15. Final opinion

- **Best balance?** Yes — with the three adjustments in §1. The typed-policy + single-ledger + advisory-lock design is the smallest system that is still robust; it avoids both the disposable-hack failure mode and the overbuilt-platform failure mode.
- **Anything still overbuilt?** Two things to hold lightly: (a) the `sourceType` field — include it only because it's one nullable column with real cleanup/analytics value; if you'd rather not, the ledger's `resultWorkoutId` link alone is sufficient for entitlement truth. (b) The hourly/daily/anomaly thresholds — build the config + one guard hook, but resist building monitoring around them now.
- **Anything underbuilt?** One: there is **no admin-role concept at all** [V]. I'm reusing `access_override = BYPASS` as the admin marker, which is the minimal correct move, but it means "admin" and "full-access dev/comp" share a flag. That's fine now; if you later need real RBAC, the resolver is the seam to extend. Also flag: `db:check`/`db:migrate` are not real safety tools today — adopting `drizzle-kit generate/migrate` (P1-4a) is a genuine prerequisite for a change of this blast radius, not gold-plating.
- **Decisions still needing your input:** (D-i) confirm **Model B** for logging (my strong rec, evidence in §3); (D-ii) confirm rest-day AI shares the day-adjustment allowance vs its own; (D-iii) approve the reasonable-use starting values (§9); (D-iv) confirm the deferral list (§13) — especially that advanced-analytics history becomes *read-locked* (not deleted) on downgrade; (D-v) provide/confirm the account list for BYPASS/COMPLIMENTARY and the real RevenueCat prod keys (owner-only inputs for P0-6/P3-1).
- **What I'd do first once approved:** **P0-1 → P0-2** (ownership infra + apply auth/ownership to all routes) and **P0-4** (webhook) — they close live vulnerabilities, change no product behavior, and are independently shippable — then stop at **Checkpoint A** before any schema push. I would not touch the entitlement/ledger work until the IDOR surface is closed and reviewed.

---

### Appendix — verification method (this pass)
Two new read-only source audits: (1) object-level ownership across every ID-keyed route (workouts/logs/profile/dashboard/exercise/admin) — confirmed service-layer IDOR + no admin-role concept + unauthenticated catalog writes; (2) live active-workout + logging flow — confirmed Model B is non-invasive and Model A would break the free workout screen and weekly-summary. Reused still-accurate findings from the 2026-07-13 audit (billing/webhook, generation pipeline, token measurements). Changed-after-reinspection: the IDOR is worse than V1 stated (service-query level, not just missing path check); `use-workout-session.ts`/`set-tracker.tsx` are dead code (live path is `workout.tsx`/`adaptive-set-tracker.tsx`).
