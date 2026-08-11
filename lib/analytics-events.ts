import { track } from "./mixpanel";

/**
 * Analytics event registry — the single source of truth for client-emitted
 * Mixpanel events. See launch_readiness/ANALYTICS_PLAN_2026-07-11.md (AN-01/AN-02).
 *
 * Ownership rule: the CLIENT SDK owns client-native events (screens, taps,
 * user-driven funnels, timing/abandonment). Server-authoritative facts — verified
 * purchase, subscription-state change, server-side generation success/failure — are
 * owned by the backend `/analytics/*` path (see lib/analytics.ts) and are NOT
 * duplicated here. Every event has exactly one owner.
 *
 * Naming convention: snake_case, `domain_action`.
 * Property rule: flat, primitive values only; NO PII (no email, name, or medical
 * data in event properties — identity is carried by the Mixpanel distinct_id/uuid).
 */
export const AnalyticsEvent = {
  // ── Workout generation (client-perceived timing; backend owns success/failure facts) ──
  GENERATION_STARTED: "workout_generation_started",
  GENERATION_FIRST_PROGRESS: "workout_generation_first_progress",
  GENERATION_COMPLETED: "workout_generation_completed",
  GENERATION_FAILED: "workout_generation_failed",
  GENERATION_MODAL_DISMISSED: "workout_generation_modal_dismissed",

  // ── Subscription / paywall funnel (client intent; backend owns the verified purchase) ──
  PAYWALL_VIEWED: "paywall_viewed",
  CHECKOUT_STARTED: "checkout_started",
  PURCHASE_COMPLETED: "purchase_completed",
  PURCHASE_FAILED: "purchase_failed",
  RESTORE_TAPPED: "restore_tapped",
  TRIAL_STARTED: "trial_started",

  // ── Onboarding + auth funnel ──
  SIGNUP_STARTED: "signup_started",
  OTP_SUBMITTED: "otp_submitted",
  WAIVER_ACCEPTED: "waiver_accepted",
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // ── Workout lifecycle (client) ──
  // NOTE: workout completion is a server-authoritative fact (completion % is
  // computed backend-side) and is owned by the backend, which emits the
  // "Workout Completed" event from logs.service. Per the single-owner rule it is
  // deliberately NOT a client event — don't re-add it here.
  EXERCISE_LOGGED: "exercise_logged",
  // Correcting a completed day's log after the fact (edit-log feature). The
  // backend still owns "Workout Completed"; this is a distinct client action.
  WORKOUT_LOG_EDITED: "workout_log_edited",

  // ── Post-workout feedback + voice input ──
  WORKOUT_FEEDBACK_SHOWN: "workout_feedback_shown",
  WORKOUT_FEEDBACK_ANSWERED: "workout_feedback_answered",
  WORKOUT_ENDED_EARLY_REASON: "workout_ended_early_reason",
  VOICE_INPUT_USED: "voice_input_used",

  // ── App feedback (Settings → Feedback screen; message text never logged) ──
  APP_FEEDBACK_OPENED: "app_feedback_opened",
  APP_FEEDBACK_SENT: "app_feedback_sent",
  APP_FEEDBACK_ABANDONED: "app_feedback_abandoned",

  // ── Training locations (§12) ──
  LOCATION_PICKER_OPENED: "training_location_picker_opened",
  LOCATION_CHOSEN: "training_location_chosen",
  LOCATION_PLACE_SAVED: "training_location_place_saved",
  LOCATION_REBUILD_OFFERED: "training_location_rebuild_offered",
  LOCATION_REBUILD_CHOICE: "training_location_rebuild_choice",

  // ── Navigation ──
  SCREEN_VIEWED: "screen_viewed",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/**
 * Per-event property contracts. Adding an event here makes its props type-checked
 * at every call site via `trackEvent`. Keep props optional-friendly and PII-free.
 */
export interface AnalyticsEventProps {
  [AnalyticsEvent.GENERATION_STARTED]: { generation_id: number; scope: string };
  [AnalyticsEvent.GENERATION_FIRST_PROGRESS]: {
    generation_id: number;
    scope: string;
    ms_since_start?: number;
  };
  [AnalyticsEvent.GENERATION_COMPLETED]: {
    generation_id: number;
    scope: string;
    ms_since_start?: number;
  };
  [AnalyticsEvent.GENERATION_FAILED]: {
    generation_id: number;
    scope: string;
    status?: string;
    error?: string;
    ms_since_start?: number;
  };
  [AnalyticsEvent.GENERATION_MODAL_DISMISSED]: {
    generation_id: number;
    scope: string;
    ms_since_start?: number;
  };

  [AnalyticsEvent.PAYWALL_VIEWED]: { source?: string; offering_id?: string };
  [AnalyticsEvent.CHECKOUT_STARTED]: {
    package_id?: string;
    product_id?: string;
    plan?: string;
    price?: number;
    is_trial?: boolean;
  };
  [AnalyticsEvent.PURCHASE_COMPLETED]: {
    package_id?: string;
    product_id?: string;
    plan?: string;
    price?: number;
    is_trial?: boolean;
  };
  [AnalyticsEvent.PURCHASE_FAILED]: {
    package_id?: string;
    product_id?: string;
    user_cancelled?: boolean;
    error?: string;
    error_code?: string;
  };
  [AnalyticsEvent.RESTORE_TAPPED]: { succeeded?: boolean };
  [AnalyticsEvent.TRIAL_STARTED]: {
    package_id?: string;
    product_id?: string;
    plan?: string;
  };

  [AnalyticsEvent.SIGNUP_STARTED]: { is_new_user?: boolean };
  [AnalyticsEvent.OTP_SUBMITTED]: { success?: boolean };
  [AnalyticsEvent.WAIVER_ACCEPTED]: Record<string, never>;
  [AnalyticsEvent.ONBOARDING_STEP_VIEWED]: {
    step_index: number;
    step_name?: string;
    total_steps?: number;
  };
  [AnalyticsEvent.ONBOARDING_COMPLETED]: { total_steps?: number };

  [AnalyticsEvent.EXERCISE_LOGGED]: {
    workout_id?: number;
    exercise_id?: number;
  };

  [AnalyticsEvent.WORKOUT_LOG_EDITED]: {
    plan_day_id: number;
    exercises_changed: number;
    sets_changed: number;
    hours_since_completion?: number;
  };

  [AnalyticsEvent.WORKOUT_FEEDBACK_SHOWN]: {
    variant: "expanded" | "collapsed";
    reason: string;
  };
  [AnalyticsEvent.WORKOUT_FEEDBACK_ANSWERED]: {
    effort?: string;
    time_fit?: string;
    has_note: boolean;
    note_source?: string;
  };
  [AnalyticsEvent.WORKOUT_ENDED_EARLY_REASON]: { reason: string };
  [AnalyticsEvent.VOICE_INPUT_USED]: {
    surface: "feedback" | "adjust";
    duration_ms: number;
  };

  // Never carries the message text — only its shape. See §9.
  [AnalyticsEvent.APP_FEEDBACK_OPENED]: Record<string, never>;
  [AnalyticsEvent.APP_FEEDBACK_SENT]: {
    category: "bug" | "idea" | "praise" | "other";
    note_source: "text" | "voice";
    length: number;
    diagnostics_included: boolean;
  };
  [AnalyticsEvent.APP_FEEDBACK_ABANDONED]: Record<string, never>;

  [AnalyticsEvent.SCREEN_VIEWED]: { screen: string };

  // Training locations (§12) — the rebuild-offer outcome is the interesting one.
  [AnalyticsEvent.LOCATION_PICKER_OPENED]: Record<string, never>;
  [AnalyticsEvent.LOCATION_CHOSEN]: {
    kind: "primary" | "saved" | "bodyweight" | "one_off";
  };
  [AnalyticsEvent.LOCATION_PLACE_SAVED]: Record<string, never>;
  [AnalyticsEvent.LOCATION_REBUILD_OFFERED]: { missing_count: number };
  [AnalyticsEvent.LOCATION_REBUILD_CHOICE]: { choice: "rebuild" | "keep" };
}

/**
 * Type-checked event tracking. Prefer this over the raw `track` in lib/mixpanel so
 * event names and property shapes stay consistent with the registry above.
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  ...args: E extends keyof AnalyticsEventProps
    ? AnalyticsEventProps[E] extends Record<string, never>
      ? []
      : [props: AnalyticsEventProps[E]]
    : [props?: Record<string, unknown>]
): void {
  const [props] = args as [Record<string, unknown>?];
  track(event, props);
}

/** Convenience for the very common screen-view event. */
export function trackScreen(screen: string): void {
  trackEvent(AnalyticsEvent.SCREEN_VIEWED, { screen });
}
