# MastersFit Analytics — Event Map

Single source of truth for every Mixpanel event, who owns it, and where it fires.
Last reconciled: 2026-07-30.

## How the two systems fit together

Analytics is a **two-system split**, both keyed on the user's **`uuid`** as the
Mixpanel `distinct_id`, so client- and server-emitted events resolve to one person:

- **Client SDK** (`mixpanel-react-native`) — owns user-native events (funnels,
  interactions, timing, screens). Registry: `frontend/lib/analytics-events.ts`.
  Identity: `identify(uuid)` on login, `reset()` on logout.
- **Backend** (`mixpanel` node SDK) — owns server-authoritative facts and the
  people-profile enrichment ($email, $name, fitness profile). Event-name constants:
  `backend/src/constants/analytics-events.ts`.

**Convention:** `snake_case`, `domain_action`. **Single owner per event.** No PII in
event properties — identity rides on the `distinct_id`.

## Client-owned events (emitted by the app SDK)

| Event | Fires from | Notes |
|---|---|---|
| `workout_generation_started` | `background-job-context` | User-**perceived** generation journey. |
| `workout_generation_first_progress` | `use-generation-lifecycle-events` | |
| `workout_generation_completed` | `use-generation-lifecycle-events` | Distinct from server `server_workout_generated`. |
| `workout_generation_failed` | `use-generation-lifecycle-events` | Distinct from server `server_workout_generation_failed`. |
| `workout_generation_modal_dismissed` | `background-job-context` | Proxy for "wait felt too long". |
| `paywall_viewed` | `payment-wall-modal` | |
| `checkout_started` | `payment-wall-modal` | |
| `purchase_completed` | `use-subscription-plans` | Client intent; RevenueCat/backend own the *verified* purchase. |
| `purchase_failed` | `use-subscription-plans` | |
| `restore_tapped` | `payment-wall-modal` | |
| `trial_started` | `use-subscription-plans` | |
| `signup_started` | `login-screen` | |
| `otp_submitted` | `use-verify-controller` | |
| `waiver_accepted` | `use-waiver-controller` | |
| `onboarding_step_viewed` | `onboarding-form` (gated by `trackStepViews`) | Per-step funnel; NOT fired by profile-edit / regeneration reuse. |
| `onboarding_completed` | `use-onboarding-controller` | **Sole owner.** Backend no longer emits a duplicate (it keeps profile enrichment only). |
| `exercise_logged` | `workout-screen` | One per **real** exercise (auto-advance, standard, circuit, end-early). Warmup/cooldown completion-only blocks excluded. |
| `workout_feedback_shown` | `workout-feedback-card` | |
| `workout_feedback_answered` | `workout-feedback-card` | |
| `workout_ended_early_reason` | `workout-feedback-card` | |
| `voice_input_used` | `voice-input-button` | |
| `app_feedback_opened` | Settings → Feedback | Message text never logged. |
| `app_feedback_sent` | Settings → Feedback | |
| `app_feedback_abandoned` | Settings → Feedback | |
| `screen_viewed` | `analytics-screen-tracker` | `screen` is the **route pattern** (`/exercise/[id]`), not the resolved path. |

## Backend-owned events (emitted server-side)

| Event | Fires from | Trigger |
|---|---|---|
| `app_opened` | `analytics.service` | Client POST `/analytics/app-opened` |
| `video_link_opened` | `analytics.service` | Client POST `/analytics/video-engagement` |
| `workout_abandoned` | `analytics.service` | Client POST `/analytics/workout-abandoned` |
| `workout_started` | `event-tracking.service` | Client POST `/analytics/workout-started` |
| `workout_completed` | `logs.service` | Server-authoritative on plan-day completion. **Sole owner** (no client event). |
| `exercise_replaced` | `event-tracking.service` | `workout.controller` replace endpoint |
| `server_workout_generated` | generation jobs | Server-authoritative success **fact** (carries `llm_model`, timing). |
| `server_workout_generation_failed` | generation jobs | Server-authoritative failure fact (carries `error_type`, `llm_model`). |

## Deliberate client/server pairs (do NOT merge)

These look similar but are intentionally separate — the client tracks the *perceived*
experience, the backend tracks the *authoritative fact*. Kept under distinct names
so a naive snake_case rename can't collide them:

| Client (perceived) | Backend (fact) |
|---|---|
| `workout_generation_completed` | `server_workout_generated` |
| `workout_generation_failed` | `server_workout_generation_failed` |

## People-profile properties (not events)

Set **server-side** by `event-tracking.service.ensureUserProfileExists` /
`updateUserProfile`: `$email`, `$name`, `$created`, `onboarding_complete`,
`waiver_accepted`, and fitness fields (age, gender, fitness_level, goals, etc.).
The client only calls `identify(uuid)` — it does not set people properties.

## Removed / historical

- **`onboarding_started`** (backend) — endpoint + emitter removed 2026-07-30; the
  frontend never called it (dead since inception).
- **Backend `Onboarding Completed`** event — removed 2026-07-30; superseded by the
  client-owned `onboarding_completed`.
- Backend event names were Title Case (`Workout Started`, etc.) until 2026-07-30;
  renamed to snake_case to match the client convention. **Note:** this starts new
  event-name series in Mixpanel — historical Title Case events keep their old names.
