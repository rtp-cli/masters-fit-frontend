export type FeedbackPromptVariant = "expanded" | "collapsed" | "hidden";

/** Why a variant was chosen — carried on workout_feedback_shown. */
export type FeedbackPromptReason =
  | "already_answered"
  | "ended_early"
  | "dormant"
  | "calibration"
  | "plan_changed"
  | "duration_overrun"
  | "every_4th"
  | "off_cadence";

/**
 * Cadence state persisted locally (AsyncStorage, v1 decision — resets on
 * reinstall, which is acceptable: worst case a reinstalled user gets asked
 * as if new). All transitions are pure per LR-020 (renderHook is unreliable
 * in this RNTL/React-19 setup); the card component just loads/saves.
 */
export interface FeedbackCadenceState {
  /** Plan (workouts.id) the per-plan counters refer to. */
  planWorkoutId: number | null;
  /** Completed workouts seen in the current plan — drives calibration. */
  completedThisPlan: number;
  /** Completed workouts since the last expanded ask — drives every-4th. */
  sinceLastExpanded: number;
  /** Expanded ask still awaiting an answer (plan day id), if any. */
  pendingExpandedPlanDayId: number | null;
  /** Consecutive expanded asks that went unanswered — two trips dormancy. */
  consecutiveUnanswered: number;
  /** Collapsed-only until this ISO date (exclusive), when dormant. */
  dormantUntil: string | null;
  /** Plan the user last answered in — a new plan re-triggers an ask. */
  lastAnsweredWorkoutId: number | null;
  /** Plan the plan-changed trigger already fired for (fires once per plan). */
  planChangeAskedForWorkoutId: number | null;
  /** Guards double-counting when the same summary is re-viewed. */
  lastSeenPlanDayId: number | null;
  /** Recently answered plan days (capped) — answered cards stay hidden. */
  answeredPlanDayIds: number[];
}

export const INITIAL_CADENCE_STATE: FeedbackCadenceState = {
  planWorkoutId: null,
  completedThisPlan: 0,
  sinceLastExpanded: 0,
  pendingExpandedPlanDayId: null,
  consecutiveUnanswered: 0,
  dormantUntil: null,
  lastAnsweredWorkoutId: null,
  planChangeAskedForWorkoutId: null,
  lastSeenPlanDayId: null,
  answeredPlanDayIds: [],
};

const DORMANT_DAYS = 14;
const CALIBRATION_ASKS = 3;
const ASK_EVERY_N = 4;
const DURATION_OVERRUN_FACTOR = 1.2;
const ANSWERED_IDS_CAP = 20;

export interface FeedbackPromptContext {
  /** Current plan id (workouts.id). */
  workoutId: number;
  planDayId: number;
  wasEndedEarly: boolean;
  /** Local date, YYYY-MM-DD (caller supplies; keeps this pure). */
  todayISO: string;
  /** Actual session length; 0/undefined when unknown. */
  durationSeconds?: number;
  /** Prescribed session length; null when unknown. */
  prescribedMinutes?: number | null;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Which variant to show, given already-updated counters. Priority order per
 * the design: ended-early always asks; dormancy quiets everything else;
 * calibration covers a new plan's first workouts; plan-change and
 * duration-overrun override cadence; otherwise every 4th completion.
 */
export function resolveFeedbackPrompt(
  state: FeedbackCadenceState,
  ctx: FeedbackPromptContext
): { variant: FeedbackPromptVariant; reason: FeedbackPromptReason } {
  if (state.answeredPlanDayIds.includes(ctx.planDayId)) {
    return { variant: "hidden", reason: "already_answered" };
  }
  if (ctx.wasEndedEarly) {
    return { variant: "expanded", reason: "ended_early" };
  }
  if (state.dormantUntil && ctx.todayISO < state.dormantUntil) {
    return { variant: "collapsed", reason: "dormant" };
  }
  if (state.completedThisPlan <= CALIBRATION_ASKS) {
    return { variant: "expanded", reason: "calibration" };
  }
  if (
    state.lastAnsweredWorkoutId !== null &&
    state.lastAnsweredWorkoutId !== ctx.workoutId &&
    state.planChangeAskedForWorkoutId !== ctx.workoutId
  ) {
    return { variant: "expanded", reason: "plan_changed" };
  }
  if (
    ctx.prescribedMinutes &&
    (ctx.durationSeconds || 0) >
      ctx.prescribedMinutes * 60 * DURATION_OVERRUN_FACTOR
  ) {
    return { variant: "expanded", reason: "duration_overrun" };
  }
  if (state.sinceLastExpanded >= ASK_EVERY_N) {
    return { variant: "expanded", reason: "every_4th" };
  }
  return { variant: "collapsed", reason: "off_cadence" };
}

/**
 * One completed-workout summary view: advance the counters, trip dormancy if
 * this is the second consecutive unanswered expanded ask, and resolve the
 * variant. Idempotent per plan day — re-viewing the same summary re-resolves
 * without re-counting.
 */
export function registerSummaryView(
  previous: FeedbackCadenceState | null,
  ctx: FeedbackPromptContext
): {
  state: FeedbackCadenceState;
  variant: FeedbackPromptVariant;
  reason: FeedbackPromptReason;
} {
  const base = previous ?? INITIAL_CADENCE_STATE;

  if (ctx.planDayId === base.lastSeenPlanDayId) {
    const { variant, reason } = resolveFeedbackPrompt(base, ctx);
    return { state: base, variant, reason };
  }

  const state: FeedbackCadenceState = { ...base };

  if (state.planWorkoutId !== ctx.workoutId) {
    state.planWorkoutId = ctx.workoutId;
    state.completedThisPlan = 0;
  }
  state.completedThisPlan += 1;
  state.sinceLastExpanded += 1;
  state.lastSeenPlanDayId = ctx.planDayId;

  // The previous expanded ask was abandoned — count it toward dormancy.
  if (
    state.pendingExpandedPlanDayId !== null &&
    !state.answeredPlanDayIds.includes(state.pendingExpandedPlanDayId)
  ) {
    state.consecutiveUnanswered += 1;
    state.pendingExpandedPlanDayId = null;
    if (state.consecutiveUnanswered >= 2) {
      state.dormantUntil = addDays(ctx.todayISO, DORMANT_DAYS);
      state.consecutiveUnanswered = 0;
    }
  }

  const { variant, reason } = resolveFeedbackPrompt(state, ctx);

  if (variant === "expanded") {
    state.sinceLastExpanded = 0;
    // Ended-early asks have their own Skip and never accrue dormancy.
    if (!ctx.wasEndedEarly) {
      state.pendingExpandedPlanDayId = ctx.planDayId;
    }
    if (reason === "plan_changed") {
      state.planChangeAskedForWorkoutId = ctx.workoutId;
    }
  }

  return { state, variant, reason };
}

/**
 * The user answered (any field). Clears dormancy pressure and remembers the
 * plan so the next plan change re-triggers an ask.
 */
export function registerAnswer(
  previous: FeedbackCadenceState | null,
  ctx: { workoutId: number; planDayId: number }
): FeedbackCadenceState {
  const base = previous ?? INITIAL_CADENCE_STATE;
  const answered = base.answeredPlanDayIds.includes(ctx.planDayId)
    ? base.answeredPlanDayIds
    : [...base.answeredPlanDayIds, ctx.planDayId].slice(-ANSWERED_IDS_CAP);

  return {
    ...base,
    answeredPlanDayIds: answered,
    consecutiveUnanswered: 0,
    dormantUntil: null,
    lastAnsweredWorkoutId: ctx.workoutId,
    pendingExpandedPlanDayId:
      base.pendingExpandedPlanDayId === ctx.planDayId
        ? null
        : base.pendingExpandedPlanDayId,
  };
}
