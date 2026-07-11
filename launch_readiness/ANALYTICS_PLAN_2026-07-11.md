# Analytics (Mixpanel) Clean-up & Full Integration Plan — 2026-07-11

Plan to clean up the Mixpanel integration and extend event coverage across the app. Builds on the
2026-07-11 client-side generation timing work and the analytics inventory. Ticket IDs `AN-01…`.

**Priorities** (same scale as `BACKLOG.md`): **P0** = foundation / do first · **P1** = high product
value · **P2** = real gap, fast-follow · **P3** = governance/nice-to-have.

## Execution status (2026-07-11, branch `feat/analytics-integration`)

**Phase 1 — done:** AN-01 (typed registry `lib/analytics-events.ts`), AN-02 (generation events
routed through it), AN-03 (dead orphan wrappers deleted), AN-05 (super properties: app_version +
platform), AN-06 (labeled no-op debug sink in `lib/mixpanel.ts`), AN-07 (lifecycle effect →
`hooks/use-generation-lifecycle-events.ts`).
**Phase 2 — done:** AN-08 (full subscription funnel: paywall_viewed / checkout_started /
purchase_completed / purchase_failed / trial_started / restore_tapped), AN-09 funnel **bookends**
(signup_started, otp_submitted, waiver_accepted, onboarding_completed), AN-11 (screen_viewed on
every route via `components/analytics-screen-tracker.tsx`).
**Partial:** AN-12 — main friction covered by purchase_failed + existing generation_failed;
paywall-load-failure not yet added.

**Deferred (with reasons — need a deliberate follow-up, not risk in a batch run):**
- **AN-04** (send dropped props) — these are **backend-owned** events; the backend Zod schema would
  strip an unknown `reason`/`sessionId` field, so it needs a coordinated backend change to be
  meaningful, not a frontend-only edit.
- **AN-09 `onboarding_step_viewed`** — `OnboardingForm` is reused in 3 places (onboarding,
  profile-edit, regeneration); per-step tracking needs an opt-in `trackStepViews` prop (default
  false) threaded from the onboarding render site, or it pollutes the funnel. Bookends are wired.
- **AN-10** (workout_completed / exercise_logged) — the workout-session logic is split between a
  2,830-line route file and a parallel hook with multiple exercise-log call sites; instrumenting it
  needs disambiguating the live path first to avoid double-counting.

**Verification ceiling reached:** all of the above is code-complete, compiles (tsc 33, ≤ baseline
35, zero new), lints clean (no new violations), and dev-log-verified. **Confirming events land in
Mixpanel requires a production/TestFlight build** — see below.

## Core architectural decision (the rule everything follows)

Keep **both** tracking systems — do NOT consolidate — but make ownership explicit:

- **Client Mixpanel SDK owns client-native events** — screen views, taps, user-driven funnels, and
  anything time-sensitive or that must survive app-leave (generation timing, abandonment).
- **Backend (`/analytics/*`) owns server-authoritative facts** — verified purchase, subscription
  state change, server-side generation success/failure, waiver accepted.
- **Both key to `user.uuid`** (client `identify` added 2026-07-11) so they unify to one person.
- **Every event has exactly ONE owner** — a shared registry prevents double-counting.

See [reference: analytics architecture] in memory for the two-system map.

---

## Phase 1 — Consolidate & clean up (P0 foundation)

- [ ] **AN-01 · P0** — Event taxonomy + typed contract. New `lib/analytics-events.ts`: event-name
      constants (standardize on **snake_case**; the backend's kebab endpoints keep their REST paths but
      the Mixpanel event names unify) + a TS type mapping each event → its allowed properties. Single
      source of truth; prevents typos and drift. **Effort: M.**
- [ ] **AN-02 · P0** — Single client tracking entry point. All client events go through `lib/mixpanel.ts`
      `track`; document the two-system ownership rule inline. Rename/annotate `lib/analytics.ts` so it's
      obvious those are the backend-owned path. **Effort: S.**
- [ ] **AN-03 · P1** — Resolve the two orphaned wrappers (`trackWorkoutCompleted`, `trackOnboardingStarted`
      in `lib/analytics.ts`) — wire to a real call site or delete. Default: delete the dead ones and
      re-add as owned events where Phase 2 needs them. **Effort: S.**
- [ ] **AN-04 · P2** — Send computed-but-dropped props: `workout-abandoned`'s `reason`
      (`contexts/workout-context.tsx`) and `app-opened`'s `sessionId` (`contexts/auth-context.tsx`).
      **Effort: S.**
- [ ] **AN-05 · P1** — Super properties at init (`lib/mixpanel.ts` / `MixpanelProvider`): `app_version`,
      `platform`, build channel — attached to every event automatically. **Effort: S.**
- [ ] **AN-06 · P1** — Dev observability. SDK is prod-gated, so events can't be seen locally. Add a debug
      sink (the no-op path already logs) and/or a dev-token flag so QA doesn't require a TestFlight build.
      **Effort: S.**
- [ ] **AN-07 · P2** — Extract the generation-analytics status-diff effect into a
      `hooks/use-generation-lifecycle-events.ts` hook — isolates the concern and trims
      `background-job-context.tsx` (already over the max-lines rule). **Effort: S.**

## Phase 2 — Fill high-value coverage (prioritized)

- [ ] **AN-08 · P1** — Subscription / paywall funnel (**biggest gap — revenue**). Client events:
      `paywall_viewed`, `checkout_started`, `purchase_completed`, `purchase_failed`, `restore_tapped`,
      `trial_started`. Integration: subscription components + `use-subscription-plans.ts`. Backend still
      owns the *verified* purchase (RevenueCat webhook) — reconcile client-intent vs server-confirmed.
      **Effort: M.**
- [ ] **AN-09 · P1** — Onboarding + auth funnel (**first-run retention; ties to UX-01/UX-02**):
      `signup_started`, `otp_submitted`, `waiver_accepted`, `onboarding_step_viewed` (with step number),
      `onboarding_completed`. Gives step-by-step drop-off through the highest-stakes moment. **Effort: M.**
- [ ] **AN-10 · P2** — Workout lifecycle completeness: `workout_completed` client-side (or confirm the
      backend owns it) + `exercise_logged`, so engagement/retention is measurable. **Effort: M.**
- [ ] **AN-11 · P2** — Screen views: one `usePathname` listener in the root layout → `screen_viewed
      { screen }`. Unlocks funnel/path analysis. **Effort: S.**
- [ ] **AN-12 · P2** — Error/friction events: paywall-load failure, generation failure (already have),
      key API-error surfaces — to correlate friction with churn. **Effort: S.**

## Phase 3 — Governance (P2/P3, follow-up; not in this execution)

- [ ] **AN-13 · P2** — Build the dashboards these events feed: generation success rate + client
      time-to-usable-workout (p50/p95) + abandonment, sliced first-run vs returning; subscription funnel.
- [ ] **AN-14 · P3** — QA checklist + naming-review gate so new events follow the taxonomy.
- [ ] **AN-15 · P2** — PII review of event payloads (health app — no medical notes/email in props; keep
      client identify to `uuid` only; people-props stay backend-owned).
- [ ] **AN-16 · P3** — Document the two-system ownership rule in-repo.

---

## Verification ceiling (important)

Mixpanel is prod-gated, so autonomous verification stops at **code-complete + compiles + lint-clean +
dev-log-confirmed wiring**. Confirming events actually land in Mixpanel with correct properties requires
a **production/TestFlight build with `EXPO_PUBLIC_MIXPANEL_TOKEN` set** and a human checking Mixpanel Live
View. Each phase should end with that manual pass before trusting the data.

## Risks / guardrails

- **Double-counting** — enforce single-owner-per-event via the AN-01 registry.
- **PII in payloads** — audit before shipping (health app).
- **Prod-only gating** blocks QA — AN-06 mitigates.
- **Identity gaps** — every login/logout path must go through `identify`/`reset` (foundation done).

## Sequencing

Phase 1 is the unlock (taxonomy + single API + dev visibility make Phase 2 fast/safe). Then Phase 2 in
priority order — subscription funnel first. Build Phase 3 dashboards incrementally as each funnel lands.
