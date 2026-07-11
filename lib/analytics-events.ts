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
  WORKOUT_COMPLETED: "workout_completed",
  EXERCISE_LOGGED: "exercise_logged",

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

  [AnalyticsEvent.WORKOUT_COMPLETED]: {
    workout_id?: number;
    plan_day_id?: number;
    completion_percentage?: number;
  };
  [AnalyticsEvent.EXERCISE_LOGGED]: {
    workout_id?: number;
    exercise_id?: number;
  };

  [AnalyticsEvent.SCREEN_VIEWED]: { screen: string };
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
