# Performance Audit — Workout Creation Flow — 2026-07-10

Read-only performance analysis of the **backend** workout-creation flow (`masters-fit-backend`:
Node/Express, TypeScript, PostgreSQL + Drizzle, Anthropic Claude via LangChain, Bull/Redis queue).
Traced end to end from the enqueue endpoint through generation to persistence. Complements the
2026-07-10 security audit (`SECURITY_AUDIT_2026-07-10.md`).

**Priorities** (same scale as `BACKLOG.md`, ranked here by latency/cost impact): **P0** = biggest
win / do first · **P1** = should land before/around launch · **P2** = real gap, fast-follow ·
**P3** = minor. Evidence file:line as of 2026-07-10 — re-verify before acting.

**Deployment correction:** this is **not on Vercel**. `src/index.ts` calls `server.listen()` (a
long-lived HTTP server) and registers a **Bull worker in-process** (`index.ts:74`, concurrency 10).
Bull workers can't run on Vercel serverless. It's a long-lived Node service (Render). So there is
**no per-request function-timeout guillotine and no per-invocation cold start**, and "move long work
to a background job with polling" is **already implemented** (see lifecycle below).

---

## Request lifecycle (end to end)

1. `POST /{userId}/regenerate-async` (`workout.controller.ts:302`) creates a job row + `queue.add(...)`,
   returns a job id immediately — **no LLM work on the HTTP request.**
2. Bull worker (`index.ts:74`, in-process, concurrency 10) picks it up under an **8-minute watchdog**
   (`workout-generation.job.ts:21`).
3. Generation: fetch profile + progression + (cached) exercise catalog → **1 planning call (Haiku)**
   → **N per-day calls (Haiku) in parallel** → post-gen validation. Serial Sonnet fallback if fan-out
   throws.
4. Persistence (`workout.service.ts:1080-1206`): resolve exercise names → **4 batched inserts** in one
   tight transaction opened *after* all LLM work (no LLM call is ever inside a transaction).
5. Client feedback: websocket progress + completion push notification; client polls the job row.

**Estimated budget:** planning ~2–4s + parallel day phase ~5–8s + persist ~0.05–0.2s ≈ **~8–12s p50**;
pathological tail (single-day failure → full Sonnet whole-week re-gen) ≈ **p99 ~30–40s**, under the
8-min watchdog. Pull the real numbers from telemetry (below).

## Benchmarking — p50/p95 already exist

`llmGenerationLogsService.getReport` (`llm-generation-logs.service.ts:41`, exposed at
`GET /api/admin/llm-metrics`) already computes `percentile_cont(0.5)`/`(0.95)` on `llmDurationMs`
grouped by operation/model, plus `cacheHitPct`. **First action before any optimization:** read that
report — `cacheHitPct` for `generateWeeklyWorkout` (is caching paying off?) and p95 (is the tail the
fallback path?). Missing (logged but not persisted → not queryable): per-phase durations, fallback
status, per-day rows, cost — see PERF-08.

---

## CRITICAL (P0)

- [ ] **PERF-01 · P0** — Exercise-name resolution is a ~40-query `ILIKE '%name%'` N+1, each a full-table
      scan. `workout.service.ts:1100-1108` fires `getExerciseByName(name)` per unique name (~30–45/week);
      each uses `ilike(exercises.name, '%${name}%')` (`exercise.service.ts:216`), and a leading-wildcard
      `ILIKE` **cannot use `idx_exercises_name`** → Postgres seq-scans the whole exercises table ~40×
      per generation, *inside the write transaction*. **Fix:** one query — `WHERE lower(name) = ANY($names)`
      via Drizzle `inArray`, hitting `idx_exercises_name_unique`; build the name→id map from the result
      (LLM uses exact names from the provided list, so exact-match is correct). **Impact:** ~40 queries
      → 1, seq-scan → index; total flow round-trips ~50–70 → ~15–20. **Effort: S.**

---

## HIGH

- [ ] **PERF-02 · P1** — One failed day aborts the whole week → forces a full Sonnet re-generation.
      `workout-agent.service.ts:701-705`: a single day failing both attempts calls `fanoutAbort.abort()`,
      cancelling all in-flight siblings and throwing → the entire week falls to the serial path (a full
      whole-week call on Sonnet 4.6, the most expensive single call). A transient blip on day 4 discards
      days 1/2/3/5/6/7's completed work *and* their token spend, then pays for a full re-gen. **Impact:**
      biggest tail-latency + cost event (~N wasted Haiku calls + ~20s Sonnet whole-week regen). **Fix:**
      retry just the failed day (fresh, without aborting siblings), or regenerate only that day. **Effort: M.**

- [ ] **PERF-03 · P1** — Cache-warming race: the 300ms fan-out stagger likely misses the ~14K-token
      day-call cache. The day system prompt (~34KB instructions + ~22KB catalog ≈ 14K tokens) is correctly
      wrapped in `cache_control: {type:"ephemeral"}` (`workout-agent.service.ts:264`) and is byte-identical
      across all N day calls — but days fire ~300ms apart (`DAY_STAGGER_MS`, `:634`) via `Promise.all`
      (`:708`), and Anthropic's cache entry isn't readable by a sibling until the first call's prefix is
      *written* (well over 300ms). So early parallel day calls each pay the full ~14K-token write instead
      of a ~0.1× read. **Impact:** up to ~40K wasted input tokens/generation (measurable — check
      `cacheHitPct` first). **Fix:** await day-1 (or ~1–2s) before fanning out days 2..N. **Effort: S.**

- [ ] **PERF-04 · P1** — Worker runs in-process at concurrency 10 → up to ~80 concurrent Anthropic calls,
      and idle-sleep can stall the queue. `index.ts:74` runs the Bull processor inside the web server at
      concurrency 10; 10 concurrent generations × ~8 Claude calls ≈ **80 simultaneous Anthropic requests**
      (429 risk → retry cascade → PERF-02 fallback). Also, because the worker shares the web process, on a
      Render tier that sleeps on idle, queued jobs don't process until an HTTP request wakes the process
      (cold Node + pg/Redis reconnect). **Fix:** add `p-limit(4–5)` around the day fan-out; confirm the
      Render tier doesn't sleep, or run the worker as a separate always-on Render worker service. **Effort:
      S–M. Confirm tier first.**

---

## MEDIUM

- [ ] **PERF-05 · P2** — Profile fetched 6–8× per generation (`prompts.service.ts:126/202/214`,
      `workout.service.ts:1014/1238`, `job.ts:172`). Cheap indexed single-row reads, but needless. **Fix:**
      fetch once at flow entry, thread through (chunked path already accepts `existingProfile`). **Effort: M.**
- [ ] **PERF-06 · P2** — Exercise catalog duplicated per muscle group in the prompt (~22KB / ~5.5K tokens
      on every day call). `formatExerciseContext` (`workout-agent.service.ts:159-199`) renders each exercise
      once *under every muscle group it belongs to*. **Fix:** render each once with a `muscleGroups: a, b`
      field (~40% catalog shrink → smaller cache prefix, fewer tokens even on cache-write). **Effort: S.**
- [ ] **PERF-07 · P2** — `createExerciseIfNotExists` is a serial 2–3-query loop for net-new exercises
      (`workout.service.ts:1028`, `exercise.service.ts:83`). Bounded but serialized. **Fix:** batch
      existence-check + batch insert `onConflictDoNothing`. **Effort: M.**
- [ ] **PERF-08 · P2** — Per-phase timings + fallback status are logged but not persisted
      (`workout-agent.service.ts:773-785`) — can't p95 *planning vs slowest-day* or measure fallback rate
      from the DB. **Fix:** add `planningDurationMs`, `daysPhaseDurationMs`, `slowestDayMs`, `retriedDays`,
      `status`, optional `costUsd` to `llm_generation_logs` (push-based schema, low-friction). **Effort: S–M.**
- [ ] **PERF-09 · P2** — `maxTokens: 30000` uniform across all call types (`ai-providers.ts:37,45,53`), far
      above real output (planning ~300 tok, day ~1.5–3K, week capped "under 10K" by the prompt). Anthropic
      doesn't bill unused `max_tokens`, but it's untuned and matters for other providers/time budgets.
      **Fix:** per-call ceilings (plan ~1K, day ~4K, serial ~12K). **Effort: S.**
- [ ] **PERF-10 · P2** — Persistence re-resolves names the cached catalog already had. `searchExercises`
      projects only `name/equipment/muscleGroups/difficulty` (no `id`), so persistence can't reuse the
      cached list and re-queries by name (this *is* PERF-01). **Fix:** add `id` to that projection; build
      the name→id map from the cached list (makes PERF-01's extra query unnecessary). **Effort: M (pairs
      with PERF-01).**
- [ ] **PERF-11 · P2** — Progression context over-fetches: `getPreviousWorkouts(userId,"week")`
      (`workout-agent.service.ts:484`) deep-loads last week's full planDays→blocks→exercises tree only to
      read a completion rate. **Fix:** a `count`/aggregate query for `isComplete`. **Effort: M.**

---

## LOW (P3)

- [ ] **PERF-12 · P3** — `profileData` is dead weight in the Bull job payload (`job.ts:85`): the full
      profile (incl. medical notes) is serialized but `generateWorkoutPlan(userId,…)` re-reads it from the
      DB; the snapshot only bumps progress to 10%. Bloats Redis + duplicates health PII. **Fix:** drop it.
      **Effort: S.**
- [ ] **PERF-13 · P3** — `getDurationRequirements` is a 10.2KB, heavily-repeated prompt block
      (`prompt-generator.ts`) — largest instruction block, restates duration formulas 3–4×. Trimming
      shrinks the cached prefix on every call. **Effort: M.**
- [ ] **PERF-14 · P3** — No GIN index on `exercises.equipment` (`exercise.schema.ts`); the `arrayOverlaps`
      equipment filter seq-scans — but it's the *cached* query (~once/5min per profile), low impact. **Effort: S.**
- [ ] **PERF-15 · P3** — Planning call has no retry (`workout-agent.service.ts:541`); a single planning
      blip dooms the fan-out into the fallback. **Fix:** one retry on planning. **Effort: S.**
- [ ] **PERF-16 · P3** — `streaming: true` buys nothing on the hot path — fan-out uses
      `withStructuredOutput(...).invoke()` and awaits the whole result; no partial-token consumer. Harmless.
- [ ] **PERF-17 · P3** — Exercise cache is an unbounded module-level `Map` (5-min TTL, no size cap) — fine
      now, wants an LRU cap eventually. **Effort: S.**

---

## Confirmed good (no action)

Async background job with an 8-min watchdog and well-tuned Bull lock/stall settings (the fix for the
documented double-workout bug); **batched inserts** (4 per week, not per-row); write transaction scoped
tightly around writes only (never spans LLM calls); **full index coverage on every FK/filter column**
in the persistence path; genuinely parallel fan-out on Haiku with abort-based per-call timeouts;
Anthropic prompt caching wired correctly (`cache_control` on the shared day prefix); exercise catalog
cached (5-min TTL) cross-request; and **p50/p95 + cacheHitPct already computed** by `getReport`.

## Do-first shortlist (impact per effort)

1. **PERF-01** (S) — indexed `inArray` replaces ~40 seq-scans. Biggest win, smallest change.
2. **PERF-03** (S) — check `cacheHitPct`; if low, await day-1 before fanning out. Cuts input-token cost.
3. **PERF-02** (M) — isolate a single day's failure so it stops forcing an expensive Sonnet re-gen.
4. **PERF-04** (S) — `p-limit(4–5)` + confirm the Render tier doesn't sleep.
5. **PERF-05 + PERF-06** (M/S) — fetch profile once; de-duplicate the catalog rendering.

PERF-01 + PERF-05 alone take a generation from ~50–70 DB round-trips to ~15–20; PERF-01 + PERF-02 +
PERF-03 address the three largest cost/latency levers.
