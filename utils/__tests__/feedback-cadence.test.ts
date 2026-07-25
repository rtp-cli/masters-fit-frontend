import {
  type FeedbackCadenceState,
  type FeedbackPromptContext,
  INITIAL_CADENCE_STATE,
  registerAnswer,
  registerSummaryView,
  resolveFeedbackPrompt,
} from "@/utils/feedback-cadence";

const ctx = (extra: Partial<FeedbackPromptContext> = {}): FeedbackPromptContext => ({
  workoutId: 100,
  planDayId: 1,
  wasEndedEarly: false,
  todayISO: "2026-07-25",
  durationSeconds: 1800,
  prescribedMinutes: 45,
  ...extra,
});

// A settled state: calibration done, answered recently, nothing pending.
const settled = (
  extra: Partial<FeedbackCadenceState> = {}
): FeedbackCadenceState => ({
  ...INITIAL_CADENCE_STATE,
  planWorkoutId: 100,
  completedThisPlan: 5,
  sinceLastExpanded: 1,
  lastAnsweredWorkoutId: 100,
  ...extra,
});

describe("resolveFeedbackPrompt priority order", () => {
  it("hides for an already-answered plan day", () => {
    expect(
      resolveFeedbackPrompt(settled({ answeredPlanDayIds: [1] }), ctx()),
    ).toEqual({ variant: "hidden", reason: "already_answered" });
  });

  it("ended early always expands, even while dormant", () => {
    expect(
      resolveFeedbackPrompt(
        settled({ dormantUntil: "2026-08-01" }),
        ctx({ wasEndedEarly: true }),
      ),
    ).toEqual({ variant: "expanded", reason: "ended_early" });
  });

  it("dormancy collapses everything else until it lapses", () => {
    const state = settled({ dormantUntil: "2026-08-01", sinceLastExpanded: 9 });
    expect(resolveFeedbackPrompt(state, ctx())).toEqual({
      variant: "collapsed",
      reason: "dormant",
    });
    expect(
      resolveFeedbackPrompt(state, ctx({ todayISO: "2026-08-01" })).variant,
    ).toBe("expanded");
  });

  it("expands during the first 3 completions of a plan (calibration)", () => {
    expect(
      resolveFeedbackPrompt(settled({ completedThisPlan: 3 }), ctx()),
    ).toEqual({ variant: "expanded", reason: "calibration" });
  });

  it("expands once when the plan changed since the last answer", () => {
    const state = settled({ lastAnsweredWorkoutId: 99 });
    expect(resolveFeedbackPrompt(state, ctx())).toEqual({
      variant: "expanded",
      reason: "plan_changed",
    });
    expect(
      resolveFeedbackPrompt(
        { ...state, planChangeAskedForWorkoutId: 100 },
        ctx(),
      ).reason,
    ).not.toBe("plan_changed");
  });

  it("expands when the session overran the prescription by >20%", () => {
    // 45 min prescribed; 55 min actual (>54 min threshold)
    expect(
      resolveFeedbackPrompt(settled(), ctx({ durationSeconds: 3300 })),
    ).toEqual({ variant: "expanded", reason: "duration_overrun" });
    // Exactly at threshold does not trigger
    expect(
      resolveFeedbackPrompt(settled(), ctx({ durationSeconds: 3240 })).reason,
    ).not.toBe("duration_overrun");
  });

  it("expands every 4th completed workout, collapses otherwise", () => {
    expect(
      resolveFeedbackPrompt(settled({ sinceLastExpanded: 4 }), ctx()),
    ).toEqual({ variant: "expanded", reason: "every_4th" });
    expect(
      resolveFeedbackPrompt(settled({ sinceLastExpanded: 2 }), ctx()),
    ).toEqual({ variant: "collapsed", reason: "off_cadence" });
  });
});

describe("registerSummaryView", () => {
  it("starts a new user in calibration", () => {
    const { state, variant, reason } = registerSummaryView(null, ctx());
    expect(variant).toBe("expanded");
    expect(reason).toBe("calibration");
    expect(state.completedThisPlan).toBe(1);
    expect(state.pendingExpandedPlanDayId).toBe(1);
  });

  it("resets plan counters when the workoutId changes", () => {
    const prev = settled({ completedThisPlan: 9, planWorkoutId: 99 });
    const { state } = registerSummaryView(prev, ctx({ planDayId: 2 }));
    expect(state.planWorkoutId).toBe(100);
    expect(state.completedThisPlan).toBe(1);
  });

  it("is idempotent when the same summary is re-viewed", () => {
    const first = registerSummaryView(null, ctx());
    const second = registerSummaryView(first.state, ctx());
    expect(second.state).toEqual(first.state);
  });

  it("goes dormant after two consecutive unanswered expanded asks", () => {
    // Ask 1 shown (pending), never answered; ask 2 shown, never answered.
    const ask1 = registerSummaryView(
      settled({ sinceLastExpanded: 4, lastSeenPlanDayId: 0 }),
      ctx({ planDayId: 1 }),
    );
    expect(ask1.variant).toBe("expanded");
    const ask2 = registerSummaryView(ask1.state, ctx({ planDayId: 2 }));
    expect(ask2.state.consecutiveUnanswered).toBe(1);
    // Force the next view to be another expanded ask, then abandon it too.
    const ask3 = registerSummaryView(
      { ...ask2.state, sinceLastExpanded: 4, pendingExpandedPlanDayId: 2 },
      ctx({ planDayId: 3 }),
    );
    expect(ask3.state.dormantUntil).toBe("2026-08-08");
    expect(ask3.variant).toBe("collapsed");
  });

  it("does not count an ended-early ask toward dormancy", () => {
    const view = registerSummaryView(
      settled({ lastSeenPlanDayId: 0 }),
      ctx({ planDayId: 5, wasEndedEarly: true }),
    );
    expect(view.variant).toBe("expanded");
    expect(view.state.pendingExpandedPlanDayId).toBeNull();
  });
});

describe("registerAnswer", () => {
  it("records the answer, clears dormancy pressure, remembers the plan", () => {
    const prev = settled({
      pendingExpandedPlanDayId: 7,
      consecutiveUnanswered: 1,
      dormantUntil: "2026-08-01",
      lastAnsweredWorkoutId: 99,
    });
    const next = registerAnswer(prev, { workoutId: 100, planDayId: 7 });
    expect(next.answeredPlanDayIds).toContain(7);
    expect(next.pendingExpandedPlanDayId).toBeNull();
    expect(next.consecutiveUnanswered).toBe(0);
    expect(next.dormantUntil).toBeNull();
    expect(next.lastAnsweredWorkoutId).toBe(100);
  });

  it("caps the answered list", () => {
    const prev = settled({
      answeredPlanDayIds: Array.from({ length: 20 }, (_, i) => i + 1),
    });
    const next = registerAnswer(prev, { workoutId: 100, planDayId: 999 });
    expect(next.answeredPlanDayIds).toHaveLength(20);
    expect(next.answeredPlanDayIds).toContain(999);
    expect(next.answeredPlanDayIds).not.toContain(1);
  });
});
