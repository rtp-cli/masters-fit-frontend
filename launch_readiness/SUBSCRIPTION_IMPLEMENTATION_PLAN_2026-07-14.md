# MastersFit Subscription — Implementation Plan (locked)

**Status:** Planning only. No code/schema/migration/config/test/copy changes. Final iteration before build.
**Date:** 2026-07-14. Companion to V2 (`SUBSCRIPTION_REDESIGN_PLAN_V2_2026-07-14.md`); this locks names, resolves open details, and gives the exact sequence.

All architecture decisions from the owner are treated as **LOCKED**. This document only (1) names things, (2) resolves the few remaining correctness details, (3) sequences the work.

---

## Locked naming (final)

**Access tiers:** `FREE`, `PLUS`, `COMPLIMENTARY`, `BYPASS` (internal only; UI shows only "MastersFit" / "MastersFit+"). Billing states ACTIVE/GRACE(valid)/CANCELLED(valid) → PLUS; EXPIRED/PAUSED/lapsed → FREE; `access_override` (COMP/BYPASS, optional expiry) wins over billing.

**Capabilities** (renamed per your guidance — describe what they are; a tier either *has* the capability, and FREE additionally has finite allowances on the AI ones):
- `GENERATE_INITIAL_PLAN` — FREE(allowance 1) + PLUS/COMP/BYPASS
- `GENERATE_NEW_PROGRAM` — PLUS/COMP/BYPASS only
- `ADJUST_WEEK` — FREE(allowance 1) + PLUS(fair-use)…
- `ADJUST_DAY` — FREE(allowance 3) + PLUS(fair-use)…
- `VIEW_PROGRESS_ANALYTICS` — PLUS/COMP/BYPASS only
- `SYNC_HEALTH` — PLUS/COMP/BYPASS only (client-gated; local-only feature)

*Not capabilities (free for everyone, ownership-checked only):* viewing owned workout content/history, basic completion + streak, repeat, deterministic exercise substitution, and workout logging (Model B). See objection O-2 below on why there is deliberately **no** `VIEW_WORKOUT_HISTORY` gate.

**AI operation types** (ledger `operationType`): `INITIAL_PLAN`, `NEW_PROGRAM`, `WEEK_ADJUSTMENT`, `DAY_ADJUSTMENT`, `REST_DAY_WORKOUT`. (`NEW_PROGRAM` replaces the poorly-aging "NEW_PLAN".)

**Workout `sourceType`** (metadata only, never entitlement truth): `AI_INITIAL`, `AI_NEW_PROGRAM`, `AI_REGENERATION`, `REST_DAY`, `REPEAT`, `MANUAL`.

**Ledger table:** `ai_operations` (single table, authoritative for allowance/lifecycle/idempotency/tokens/cost/audit).

**Paywall reasons** (two distinct types — see O-2): `REQUIRES_PLUS` (tier lacks the capability, e.g. FREE tries NEW_PROGRAM or analytics) and `FREE_ALLOWANCE_EXHAUSTED` (tier has the capability but the FREE lifetime allowance is spent). Different copy, same 403 shape.

---

## 1. Remaining technical objections

None are blocking and none are architecture disagreements. These are **correctness details that must be implemented deliberately** — the risk here is entirely in getting concurrency/idempotency/settlement right, so I'm naming them explicitly so they aren't hand-waved during fast codegen.

- **OBJ-1 — Reserved-row leak if enqueue fails.** The reservation commits, then we enqueue the Bull job. If enqueue throws (Redis blip) after commit, we have a `reserved` row consuming an allowance with no job running. **Fix:** enqueue in a try; on failure immediately `settle('failed')` (release). Plus a small reconciler that releases any `reserved` row with no job progress after a timeout (e.g. 15 min). Low effort, must exist.
- **OBJ-2 — Idempotency lifecycle across failure.** If an op fails and its reservation is released, a client retry with the *same* idempotency key must be allowed to create a fresh reservation (not return the dead failed op). **Rule:** a key is "open" only while its op is `reserved`/`completed`; a `failed` op does not block reuse of that key (or the client mints a new key on explicit user retry — see Confirm-C3). Nail this or legitimate retries after a transient failure get stuck.
- **OBJ-3 — Atomic primitive must be pooler-safe on Neon.** `pg_advisory_xact_lock` works only if the lock + count + insert run in one transaction on one server connection. Under Neon's pooled connection string this is *usually* fine in transaction-pooling mode, but it's a footgun. **See refinement R-1** — I recommend a `SELECT … FOR UPDATE` primitive instead, which sidesteps this entirely.
- **OBJ-4 — Breadth of the ownership fix is the real risk, not its difficulty.** ~18 `logs/*` routes + workout-content + profile + dashboard all need ownership. Each is easy; *missing one* is the danger. **Mitigation:** a default-deny route-coverage authz test (R-3) that fails CI if any route isn't explicitly public or behind auth+ownership.

---

## 2. Architectural refinements I still recommend

- **R-1 — Use `SELECT … FOR UPDATE` on `user_subscriptions` as the per-user mutex, not `pg_advisory_xact_lock`.** We already read the subscription row to resolve the tier; `user_subscriptions.userId` is UNIQUE (one row/user). Locking that row `FOR UPDATE` at the start of the reservation transaction serializes a user's concurrent AI ops with zero new objects, no advisory-lock semantics, and no pooler caveat. Cleaner and more portable than an advisory lock. Still no second table — allowance counts are derived from indexed `ai_operations` rows within the locked transaction. **This is my one real architecture nudge; I recommend adopting it.**
- **R-2 — One paid-analytics capability, and do NOT gate history/content viewing.** Your rename examples listed both `VIEW_WORKOUT_HISTORY` and `VIEW_PROGRESS_ANALYTICS`. Gating "view workout history" would contradict the locked "never hold owned content hostage" principle — a free/downgraded user must still see and repeat their past workouts. So the only paid analytics gate is `VIEW_PROGRESS_ANALYTICS` (aggregated progression/volume/PR/trend endpoints, the §3-V2 Model-B list). Viewing the calendar/list/detail of owned past workouts stays free. I dropped `VIEW_WORKOUT_HISTORY` entirely — simpler and consistent.
- **R-3 — Default-deny authz coverage test.** A test that enumerates every mounted route and asserts each is either on an explicit public allowlist (`/api/health`) or wrapped by auth (+ownership where object-keyed). This is the cheapest guarantee that the IDOR fix stays fixed and no future route regresses. Small, high-leverage.

---

## 3. Decisions to confirm before building (small; my recommendations in bold)

- **C1 — Rest-day AI for FREE users.** You locked 1 initial + 1 week + 3 day. Rest-day workout generation is net-new AI. **Recommend: a FREE rest-day generation consumes one `DAY_ADJUSTMENT` allowance (shares the 3).** Alternative: FREE can't generate rest-day workouts at all (PLUS-only). I lean "shares the 3" — simplest and least surprising.
- **C2 — Downgrade free-allowance re-grant.** An op is flagged `countedAgainstFreeAllowance = (tier == FREE at reserve)`. A user who went straight to PLUS, generated plans, then downgraded would have 0 FREE-counted ops → technically eligible for a free initial plan. **Recommend: accept this (simple + generous + negligible at our scale); downgrade grants whatever free allowance remains by count.** Alternative (stricter): treat "ever had a completed plan op" as initial-consumed. I recommend the simple rule; flag if you want strict.
- **C3 — Idempotency key generation.** **Recommend:** client mints a key when the user *initiates* an action (opens the adjust modal / taps generate), stable across automatic retries of that same action; an explicit new user-initiated attempt mints a new key. This dedupes double-taps/timeouts without blocking a deliberate second attempt. Confirm this UX contract.

If you're fine with the three bolded defaults, I don't need a reply — I'll proceed with them and note them at the relevant checkpoint.

---

## 4. Exact implementation sequence

Favor deletion over back-compat (per your philosophy). Each phase ends at a review checkpoint (§5).

**Priority 0 — Security & billing correctness** (no product-behavior change; independently shippable)
1. `ownership.ts` resolvers (object→owning userId for workout/planDay/block/planDayExercise/exerciseLog/profile/job) + `requireOwnership` + `JWT==path` assertion middleware.
2. Apply auth + ownership to **every** route: all `logs/*`, workout-content (`PUT /workouts/:id`, `POST /:workoutId/days`, `POST /days/:planDayId/exercises`, `PUT/DELETE /exercises/:id`, `PUT /exercise/:id/replace`), `GET /jobs/:jobId/status`, all three `profile` routes, all dashboard routes, `repeat-*`. Add **R-3** coverage test.
3. Admin authorization: gate `admin/llm-metrics`, `prompts`, `ai-provider`, and exercise-catalog mutations on `access_override == BYPASS`.
4. Webhook hardening: require verified signature/secret, **fail-closed if unconfigured**, store `eventTimestampMs` + ignore stale, atomic dedup.
5. `POST /subscriptions/sync` + RevenueCat receipt validation; set real prod RC keys in EAS; remove the client demo-email bypass (replaced by a COMPLIMENTARY grant in P3).

**Priority 1 — Subscription & AI foundation**
6. Schema (one push): `ai_operations`; `user_subscriptions.access_override` + `access_override_expires_at`; `workouts.source_type`; adopt real Drizzle `generate`/`migrate`.
7. `resolveAccessTier()` + typed capability policy module (`can`, `requireCapability`).
8. `ai_operations` service: reserve (via **R-1** `FOR UPDATE`) → idempotency → settle/`release`; token+cost roll-up; OBJ-1 enqueue-failure + reconciler; OBJ-2 key lifecycle.
9. Rewire the 4 AI routes onto the service; **delete** `userHasWorkoutHistory` gating, the OR-logic, and the token-cap-as-limit; fix rest-day to create its workout row only post-LLM.

**Priority 2 — Product gates & client**
10. Server-gate `VIEW_PROGRESS_ANALYTICS` endpoints (Model B read list). Confirm repeat/logging/complete stay free.
11. `GET /subscriptions/status` returns `{ tier, capabilities, freeAllowances }`; client consumes it as the single source of truth (stop inferring `isPro` client-side).
12. Paywall triggers (two reasons), resume-after-purchase, health client-gate + disconnect/delete path, downgrade behavior.

**Priority 3 — Migration & cleanup**
13. `set-access-override` script (by email) → classify BYPASS/COMPLIMENTARY; verify paid users resolve to PLUS; seed one `completed INITIAL_PLAN` ledger row (linked to their real workout) for the few existing users with a legitimate initial plan; everyone else starts fresh.
14. **Delete** obsolete architecture: `trial_usage` table, mislabeled constants/messages, dead `use-workout-session.ts` + `set-tracker.tsx` (confirmed unused), demo-account hack remnants.
15. Test suites (§12-V2 matrix) + e2e + release checklist.

---

## 5. Review checkpoints (implementation pauses for approval)

- **CHECKPOINT A — after P0 steps 1–4, before any schema push.** Review the ownership model, the authz coverage test results, and webhook hardening. This is shippable security value on its own.
- **CHECKPOINT B — before the P1 schema push (step 6).** Review the migration diff + `drizzle generate` output; apply to a scratch DB first (the current `db:check`/`db:migrate` are not real safety tools).
- **CHECKPOINT C — after the AI service (step 8), before rewiring live routes (step 9).** Review concurrency + idempotency + failure-release tests. The correctness gate.
- **CHECKPOINT D — after server enforcement (steps 9–10), before client paywall cutover (step 12).** Confirm the server is authoritative and correct before the UI reflects it.
- **CHECKPOINT E — before deleting legacy (step 14).** Confirm everything validated; only then drop `trial_usage` and dead code.

Per your instruction: **if any P0 security finding changes during implementation, I stop and report before proceeding.**

---

## 6. What you may be overlooking

- **OV-1 — "New AI on downgrade" needs the C2 rule decided or it's ambiguous in code.** Not a blocker, but the ledger flag semantics must encode your intent (§C2). I've defaulted to simple/generous.
- **OV-2 — RevenueCat "first active entitlement" assumption.** The client currently treats *any* active entitlement as PLUS (no fixed entitlement ID). When you configure prod, define ONE canonical entitlement identifier (e.g. `plus`) in RevenueCat and resolve against it, so a future second entitlement doesn't silently grant PLUS. Cheap now, annoying later.
- **OV-3 — `/subscriptions/sync` still depends on server-side receipt validation** (RC REST API + secret). That secret must be in server env before P0-5 works; it's an owner-provided input alongside the prod keys.
- **OV-4 — Analytics events for the funnel are largely wired but three are dormant** (`WORKOUT_COMPLETED`, `EXERCISE_LOGGED`, `ONBOARDING_STEP_VIEWED`). Wiring them is trivial and worth doing in P2 so conversion is measurable from day one — but it's optional to the foundation.
- **OV-5 — Deleting `trial_usage` is safe only after the seed step (13).** Order matters: classify/seed users first, validate, *then* delete (Checkpoint E). Sequenced correctly above; just don't reorder.

---

## Alignment

We are aligned. The only things I'd change from a pure rubber-stamp are **R-1** (use `SELECT … FOR UPDATE` as the mutex) and **R-2** (don't gate history viewing; one analytics capability) — both are simplifications, not additions. The three §3 confirmations have safe defaults I'll proceed with unless you say otherwise.

**On go, I start at Priority 0 (steps 1–4) and stop at Checkpoint A.** No schema, no product behavior change, closes the live IDOR/webhook holes first.
