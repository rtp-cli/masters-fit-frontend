# Backend Security & Architecture Audit — 2026-07-10

Full read-only audit of the **backend** (`masters-fit-backend`, Node/Express + TSOA + Drizzle +
Zod, ~186 commits). Complements the 2026-07-06 launch-readiness audit in `BACKLOG.md`; where a
finding here overlaps an existing LR ticket it is cross-referenced.

**Priorities** (same scale as `BACKLOG.md`): **P0** = go/no-go blocker for store submission ·
**P1** = should land before launch · **P2** = real gap, can fast-follow · **P3** = nice-to-have.

**Evidence** file:line references are as of 2026-07-10 — re-verify against current code before
acting, files shift. Every Critical below was verified first-hand against source during the audit.

**Method:** three parallel deep passes (Claude/LLM integration, API surface/auth, data layer),
plus manual verification of the top Criticals and the CLAUDE.md guardrail gates.

---

## The architectural root cause (read this first)

`backend/src/app.ts:121-132` mounts the **hand-written** routers from `src/routes/*.ts`. It never
calls `RegisterRoutes` from `generated/routes.ts`. So the TSOA `@Security("bearerAuth")` decorators
on the controllers **are dead code — they never execute.** Authentication happens *only* where a
route handler manually calls `await expressAuthentication(...)`, and many handlers don't.

On top of that, **no handler anywhere compares the `userId` in the URL path/body to the
authenticated `userId` from the JWT** (grep for a `!== req.userId` comparison returns zero matches).
`expressAuthentication` (`src/middleware/auth.middleware.ts:73`) sets `req.userId` from the token,
but handlers read `Number(req.params.userId)` and pass it straight to services.

Nearly every Critical below descends from these two facts. The single highest-leverage fix is one
router-level middleware that authenticates once and derives `userId` **only** from `req.userId`,
plus ownership JOINs for resource-id endpoints.

---

## Guardrail state (CLAUDE.md requires tsc + lint + build to pass)

- `npm run build` — ✅ passes, **but misleading**: `tsup`/esbuild strips types without checking them.
- `npx tsc --noEmit` — ❌ **61 errors across 20 files** (incl. `auth.middleware.ts`,
  `workout.service.ts` ×11, `profile.service.ts`, `jobs.service.ts`, 4 controllers).
- `npm run lint` — ❌ **cannot run**: ESLint 8.57 installed but no config file exists
  (no `.eslintrc*`, no `eslint.config.*`, no `eslintConfig` key). A green `build` masks both.
- Type-weakening: **114 `: any`, 76 `as any`, 5 `@ts-ignore`** in `src/`.

A passing build is giving false confidence the type gate is met. (Backend side of the
`project_lint_backlog_plan` is still fully open.)

---

## CRITICAL (all P0)

- [ ] **SEC-01 · P0** — Systemic IDOR/BOLA: any user can read/modify any other user's data.
      Root cause above. Representative: `workout.routes.ts:30,57,133,146`, `profile.routes.ts:25,36,47,61`,
      `dashboard.routes.ts` (all), `prompts.routes.ts:25`, `search.routes.ts:52,65,118`,
      `ai-provider.routes.ts:33,56`. Services filter only on the attacker-controlled id
      (`workout.service.ts:362`, `dashboard.service.ts:273`, `prompts.service.ts:111`).
      *Concrete:* `GET /api/profile/42` returns user 42's `medicalNotes`, weight, age, gender.
      **Fix:** router-level middleware deriving userId only from `req.userId`; ownership JOINs
      (up to `workouts.userId`) for resource-id endpoints. **Effort: M.**

- [ ] **SEC-02 · P0** — Unauthenticated destructive endpoints across the logs domain.
      `logs.routes.ts` — only 3 of ~18 handlers call `expressAuthentication` (lines 26, 37, 48).
      The rest (workout log create/read/update/complete, day complete/reopen, skip) have no auth.
      Worst case `POST /workout/:workoutId/exercise/:planDayExerciseId/skip` (`logs.routes.ts:168`
      → `logs.service.ts:718`) runs `db.delete(exerciseLogs)` — anonymous, loopable, permanently
      erases any user's logged history. **Fix:** `router.use(auth)` on the logs router.
      **Effort: S** (auth) / M (with ownership).

- [ ] **SEC-03 · P0** — Unauthenticated writes/deletes to the global exercise catalog.
      `exercise.routes.ts:49 (POST), 65 (PUT), 84 (DELETE), 100 (PUT /link)` have no auth (only the
      GETs do). `exercises` is a shared table. Anonymous `DELETE /api/exercises/1..N` wipes the
      catalog for everyone; PUT swaps descriptions/links shown in every user's workouts.
      **Fix:** authenticate + admin-gate (mutates global data). **Effort: S.**

- [ ] **SEC-04 · P0** — 8 of 11 dashboard endpoints require no authentication.
      `dashboard.routes.ts` — only `/metrics` and `/weekly-summary` authenticate. `curl
      .../api/dashboard/123/weight-metrics` with no token returns any user's exercise names,
      weights, goal progress by enumerating ids. **Fix:** `router.use(auth)` + ownership. **Effort: S.**

- [ ] **SEC-05 · P0** — Profile-write IDOR overwrites arbitrary users' health data that feeds AI.
      `profile.routes.ts:36-72` → `profile.service.ts:47,69`. All three write paths trust an
      attacker-supplied userId. Injecting false `limitations`/`medicalNotes` into a victim's profile
      changes the workouts the LLM generates for them — a **physical-safety** issue for a 40+
      audience (e.g. erasing a knee-injury limitation). **Fix:** derive userId from `req.userId`;
      Zod-validate body. **Effort: S.**

- [ ] **SEC-06 · P0** — Account deletion is a soft-delete that retains all health data.
      `user.service.ts:155-174`. `deleteAccount()` only mangles the email (embedding the *original*
      email, so even that survives) and sets `isActive=false`. `medical_notes`, `background_jobs.data`
      (duplicated medical notes), prompts, logs, name, heart-rate data all persist forever. Fails
      App Store account-deletion + GDPR/CCPA erasure. Soft-delete exists *because* cascades are
      missing (SEC-13). **Fix:** real hard-delete of the user-owned tree, or at minimum null the
      health columns. **Effort: M** (needs SEC-13 first).

---

## HIGH

- [ ] **SEC-07 · P0** — OTP brute-forceable: 4-digit code, no rate limiting, matched by code alone.
      `auth.service.ts:122` (`Math.random()`, 4 digits, 10-min window) and `auth.service.ts:46-60` —
      `getValidAuthCode` matches on `code` with **no email binding**, so a brute-forcer can match
      *any* pending code across *all* users. No `express-rate-limit` anywhere. **Fix:** `crypto.randomInt`,
      6 digits, bind lookup to submitted email, rate-limit + lockout on `/verify`, `/login`,
      `/generate-auth-code`. **Effort: M.**

- [ ] **SEC-08 · P0** — Hardcoded OTP bypass (`"9876"`) and static test-account codes.
      `auth.controller.ts:431-457`, `auth.service.ts:69-114`. Full auth bypass for any email flagged
      in `system_config` as a test email, or if that config leaks to prod. **Fix:** verify
      `TEST_ACCOUNTS_ENABLED=false` + empty test-email list in prod; ideally compile out of prod
      builds. **Effort: S** (config verification).

- [ ] **SEC-09 · P1** — `POST /api/auth/check-email` mints a real 7-day JWT + refresh token, no OTP.
      `auth.controller.ts:59-107`. If the client uses that token, a victim's email alone grants a
      session. *(Uncertain — may be intended as an existence check with the token discarded; still
      dangerous.)* **Fix:** return only `{exists, needsOnboarding}`; issue tokens only after `/verify`.
      **Effort: S.**

- [ ] **SEC-10 · P0** — RevenueCat webhook fails **open** + trusts client-supplied `app_user_id`.
      **Overlaps / supersedes existing LR-003.** `subscription.controller.ts:140-163` — verified: the
      `else` branch at line 162 accepts all requests if `REVENUECAT_WEBHOOK_AUTH_HEADER` is unset
      (comment confirms). Compare is non-constant-time (line 154). `resolveUserId` derives the target
      account purely from attacker-controlled body fields, no receipt validation → forge an
      `INITIAL_PURCHASE` to grant anyone unlimited access. Matches `project_launch_readiness`
      "RevenueCat prod-config still broken." **Fix:** fail **closed** if secret unset;
      `crypto.timingSafeEqual`; Zod-validate payload; confirm env var set in Render. **Effort: S/M.**

- [ ] **SEC-11 · P1** — Post-generation safety validation runs ONLY on the fan-out path.
      `post-generation-validation.ts` is called only at `workout-agent.service.ts:757` (inside
      `generateWeeklyWorkout`). `regenerateWorkout` (serial weekly fallback + all daily/preference
      regen) returns the workout with **no equipment filtering, no limitation contraindication
      filtering, no repetition check**. The LR-012/LR-013 guarantee ("knee-pain user never gets jump
      squats," "dumbbells-only user never gets rack exercises") silently does not hold whenever
      fan-out fails or on any daily regen. **Fix:** call `applyPostGenerationValidation` in
      `regenerateWorkout`, or hoist into `workout.service` so all paths share it. **Effort: M.**

- [ ] **SEC-12 · P1** — Serial/fallback path does raw `JSON.parse` with no schema validation.
      `workout-agent.service.ts:413-419, 822-826`. Fan-out uses `withStructuredOutput` (good); the
      serial path regex-strips code fences then `JSON.parse`es with no Zod check. A
      well-formed-but-wrong-shape object flows into `generateWorkoutPlan` → `workout.service.ts:1091`
      dereferences `day.blocks`/`block.exercises` unguarded → crash mid-transaction or bad data
      persisted. **Fix:** validate against the existing fan-out Zod schema before returning. **Effort: M.**

- [ ] **SEC-13 · P1** — Missing FK cascades make hard-delete impossible.
      `profiles` (`profile.schema.ts:32`), `workouts` (`workout.schema.ts:22,53`), `prompts`
      (`prompts.schema.ts:8`), `background_jobs` (`jobs.schema.ts:37`), and the whole
      plan_day→block→exercise→log tree lack `onDelete`. `DELETE FROM users` throws FK violations —
      the reason SEC-06 is a soft-delete. **Fix:** add `onDelete:"cascade"` down the user-owned
      chain, push. **Effort: M.**

- [ ] **SEC-14 · P1** — LLM-invented exercises (incl. unvalidated `link`) written to the global
      table and served to all users. `exercise.schema.ts:19-52` (no `userId` — global), persisted
      from `exercisesToAdd` at `workout.service.ts:1028`. `link` stored verbatim, no URL validation
      (`linkUtils.ts` only parses for display). Combined with SEC-16, a user steers the model to
      emit an exercise with a chosen name/instructions/`link` (`javascript:`, SSRF/tracking URL)
      that renders in *other users'* workouts. **Fix:** validate `link` is `https://` on an
      allowlisted host; sanitize name/instructions; reconsider user-scoping AI-generated exercises.
      **Effort: M.**

- [ ] **SEC-15 · P1** — TLS certificate verification disabled on the DB connection.
      `database.ts:26,31` — both branches set `rejectUnauthorized: false`; pg encrypts but never
      verifies the server cert (MITM can present any cert). **Fix:** `sslmode=verify-full` or
      `ssl:{rejectUnauthorized:true}`. **Effort: S.**

- [ ] **SEC-16 · P1** — Prompt injection: user free-text interpolated into the system prompt with
      no delimiting/escaping. `prompt-generator.ts:746-762`, `fanout-prompt-generator.ts:300-315`,
      `workout-agent.service.ts:295`. `goals`, `limitations`, `medicalNotes`, `customFeedback` are
      dropped into template literals inside the **system** string; mitigations are soft prose.
      Not self-contained harm because of SEC-14. **Fix:** move user data into the user turn; wrap in
      `<user_feedback>…</user_feedback>` with the delimiter stripped from input; cap field lengths.
      **Effort: M.**

- [ ] **SEC-17 · P1** — `profiles.user_id` has no unique constraint → duplicate-profile race.
      `profile.schema.ts:59` + unguarded check-then-insert `profile.service.ts:60`. Concurrent
      onboarding/regeneration creates two profile rows; reads take `[0]` arbitrarily, so medical
      notes can silently diverge. (Same class as LR-056 for exercises.) **Fix:** `uniqueIndex` +
      `onConflictDoUpdate`. **Effort: S.**

---

## MEDIUM

- [ ] **SEC-18 · P1** — No security middleware. `app.ts:91` — no `helmet`, no rate limiting, no
      explicit `express.json({limit})`, CORS `*`. Generation endpoints have no per-user rate cap
      beyond the trial counter. **Fix:** `helmet()`, `express-rate-limit` (strict on auth/OTP +
      generation), body-size limit. **Effort: S.**
- [ ] **SEC-19 · P1** — `/api/admin/llm-metrics` has no admin gate. `llm-metrics.routes.ts:8` — any
      logged-in user pulls org-wide cost/latency/token data. No role concept exists. **Fix:**
      allowlist stopgap now; admin flag later. **Effort: S.**
- [ ] **SEC-20 · P1** — No Zod validation on manual-route bodies. Existing schemas
      (`insertProfileSchema`, `onboardingSchema`, `insertPromptSchema`) are never invoked — the
      `ZodError` catch branches are dead. Unbounded batch inserts (`logs.controller.ts:87`, no cap),
      negative reps/weights, absurd age/height into prompts. **Fix:** parse every body; cap arrays
      (≤100). **Effort: M.**
- [ ] **SEC-21 · P2** — Health data duplicated into `background_jobs.data`, no working retention.
      `jobs.service.ts:153` `cleanupOldJobs(30)` exists but is **never called** (grep-confirmed).
      Medical notes accumulate forever in a 2nd location. **Fix:** schedule cleanup; stop storing
      `medicalNotes` in job data (worker re-reads profile). **Effort: S.**
- [ ] **SEC-22 · P2** — Daily-regeneration job has no watchdog; serial LLM calls have no per-call
      timeout. `daily-regeneration.job.ts` lacks the `withTimeout` the other two jobs have;
      `workout-agent.service.ts:363` `regenerateWorkout` has no `runWithAbortTimeout`. A stalled
      provider hangs the Bull job to `lockDuration`. **Fix:** wrap both. **Effort: S.**
- [ ] **SEC-23 · P2** — Model exercise references silently dropped. `workout.service.ts:1181` — a
      hallucinated name that doesn't resolve vanishes from the persisted workout, no error surfaced.
      **Fix:** assert each reference resolves; reject/regenerate on dangling. **Effort: M.**
- [ ] **SEC-24 · P2** — Calendar dates stored as `text` + mixed `timestamp`/`timestamptz`.
      `workout.schema.ts:25,56` (text dates), naive `timestamp` across `logs.schema.ts`. Directly
      feeds `project_timezone_today_bug` — pair the fixes. **Fix:** `date` columns for plan dates;
      standardize to `timestamptz`. **Effort: L.**
- [ ] **SEC-25 · P2** — No app-level encryption for `medical_notes`. `profile.schema.ts:49` plain
      text; protection is entirely Neon at-rest + anyone with `DATABASE_URL`. **Fix:** column-level
      AES-GCM with a Render-env key. **Effort: M.**
- [ ] **SEC-26 · P2** — N+1 queries on dashboard. `workout-analytics.service.ts:143-179`
      `getWorkoutConsistency` runs 2 queries/workout in a loop on every dashboard load (~101 for 50
      workouts) — a cheap DoS lever given SEC-04. `logs.service.ts:290` ignores the existing batched
      helper. **Fix:** batch with `inArray`. **Effort: M.**
- [ ] **SEC-27 · P2** — Missing indexes: `prompts.user_id`, `plan_day_logs.plan_day_id`,
      `auth_codes.email` (all filtered in hot paths); search `LIKE`/`similarity` needs a
      `gin_trgm_ops` index + confirm `pg_trgm` installed in prod. **Fix:** add indexes, push. **Effort: S.**
- [ ] **SEC-28 · P2** — Unbounded pagination. `search.routes.ts:92` — raw `Number(limit)`, no cap;
      `?limit=100000000` forces large scans. **Fix:** Zod-clamp 1–100. **Effort: S.**
- [ ] **SEC-29 · P2** — Single all-powerful DB role used by runtime, `drizzle push`, studio, scripts.
      App never needs DDL. **Fix:** `app_rw` role with DML-only grants for runtime. **Effort: M.**
- [ ] **SEC-30 · P2** — `db:migrate` is a misleading alias for `drizzle-kit push`, no environment
      guard; interactive push against Neon executes DROP COLUMN if confirmed, no down-migrations.
      **Fix:** guard config against Neon hosts unless `CONFIRM_PROD_PUSH=1`; add a mandatory
      pre-deploy Neon branch snapshot to `deploy-db`. **Effort: S.**

---

## LOW (P2/P3)

- [ ] **SEC-31 · P2** — Raw Postgres/Zod error messages returned to clients (`logs.routes.ts:18`,
      `profile.routes.ts:17`, `exercise.routes.ts:18`, dashboard/prompts) leak schema internals.
      Confirm prod `NODE_ENV !== "development"` (`error.middleware.ts:96,155` returns `err.message`).
- [ ] **SEC-32 · P3** — `loggingMiddleware` exists but is never wired; if enabled as-is it buffers
      response bodies — add PII redaction first.
- [ ] **SEC-33 · P2** — Sentry has no `beforeSend` scrubbing (`instrument.ts:9-15`); `customFeedback`
      on Bull jobs may reach it. *(Uncertain — needs a runtime check of captured payloads.)*
- [ ] **SEC-34 · P2** — Plaintext OTPs never purged from `auth_codes`; `prompts` / `webhook_events`
      accumulate PII indefinitely, no retention policy or cascade to user deletion.
- [ ] **SEC-35 · P3** — `GET /workout/:workoutId` performs an INSERT (get-or-create,
      `logs.service.ts:607`) and is unauthenticated — pollutes `workout_logs` per enumerated id.
- [ ] **SEC-36 · P3** — A few log handlers hang the connection on non-Error throws (no final `else`,
      `logs.routes.ts:141-147,177-183,197-203`).
- [ ] **SEC-37 · P3** — Prescribed `weight` is `integer` (`workout.schema.ts:129`) while logged
      weight is `decimal(6,2)` (`logs.schema.ts:76`) — can't represent 2.5 lb / 1.25 kg plates.
- [ ] **SEC-38 · P3** — No idempotency key on generation jobs; double-tap can enqueue two
      (`workout-generation.queue.ts:105`). Partially mitigated by `createWorkout` deactivating prior
      active workouts, but race-prone. **Fix:** deterministic Bull `jobId` (`gen:${userId}`).

---

## Confirmed good (no action)

- Model IDs all current/valid: `claude-sonnet-4-6` (default), `claude-haiku-4-5-20251001` (fanout),
  `claude-sonnet-4-5-20250929` — no deprecated/retired strings.
- API keys read from env, **never logged**, never exposed via any endpoint.
- `llm_generation_logs` stores only token/latency metrics — **no prompt text, no PII**.
- **No SQL injection** — all `sql\`\`` fragments parameterize values (LR-001 fix pattern held).
- Primary generation path uses structured outputs; weekly persistence is one transaction (clean
  rollback); watchdog timeouts non-retryable to avoid double-writes; fan-out cancels siblings on
  failure. The `analytics` domain is the one fully-correct surface (scopes to JWT `userUuid`).

---

## Suggested sequencing

1. **Same-day (all S):** SEC-02, SEC-03, SEC-04 (add auth to logs/exercise-writes/dashboard);
   SEC-10 (webhook fail-closed + confirm env var); SEC-08 (verify test-account config off in prod).
2. **This week:** SEC-01/SEC-05 (one router-level `req.userId` middleware); SEC-09; SEC-19; SEC-18 +
   SEC-07 (helmet/rate-limit/6-digit email-bound OTP).
3. **Then:** SEC-11/SEC-12 (serial-path validation); SEC-13→SEC-06 (cascades → real deletion);
   SEC-16/SEC-14 (injection delimiting + link validation); the tsc/lint guardrail cleanup.

## Verify the guardrail claims

```bash
cd masters-fit-backend
npx tsc --noEmit      # 61 errors
npm run lint          # ESLint: couldn't find a configuration file
npm run build         # passes — the misleading part
```
