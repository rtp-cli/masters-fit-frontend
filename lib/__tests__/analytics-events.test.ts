import { recordClientEvent } from "../analytics";
import { AnalyticsEvent, trackEvent } from "../analytics-events";
import { track } from "../mixpanel";

jest.mock("../mixpanel", () => ({ track: jest.fn() }));
// recordClientEvent is `async`, so the mock must also return a promise --
// a bare jest.fn() returns undefined and would not model the real contract.
jest.mock("../analytics", () => ({
  recordClientEvent: jest.fn(() => Promise.resolve()),
}));

const mockTrack = track as jest.Mock;
const mockRecord = recordClientEvent as jest.Mock;

describe("trackEvent", () => {
  beforeEach(() => {
    mockTrack.mockClear();
    mockRecord.mockReset();
    mockRecord.mockImplementation(() => Promise.resolve());
  });

  it("always sends the event to Mixpanel", () => {
    trackEvent(AnalyticsEvent.SCREEN_VIEWED, { screen: "/calendar" });
    expect(mockTrack).toHaveBeenCalledWith(AnalyticsEvent.SCREEN_VIEWED, {
      screen: "/calendar",
    });
  });

  // The allow-list is the whole point: mirroring every event would put an HTTP
  // request behind every navigation.
  it("does NOT mirror a high-frequency event to Postgres", () => {
    trackEvent(AnalyticsEvent.SCREEN_VIEWED, { screen: "/calendar" });
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("mirrors the reveal event to Postgres", () => {
    trackEvent(AnalyticsEvent.PLAN_REVEAL_SHOWN, {
      scope: "week",
      entry: "auto",
    });
    expect(mockRecord).toHaveBeenCalledWith(AnalyticsEvent.PLAN_REVEAL_SHOWN, {
      scope: "week",
      entry: "auto",
    });
  });

  it("mirrors the exercise log, carrying the activation ordinal", () => {
    trackEvent(AnalyticsEvent.EXERCISE_LOGGED, {
      workout_id: 1,
      exercise_id: 2,
      log_index: 1,
    });
    expect(mockRecord).toHaveBeenCalledWith(AnalyticsEvent.EXERCISE_LOGGED, {
      workout_id: 1,
      exercise_id: 2,
      log_index: 1,
    });
  });

  it("mirrors generation completion to Postgres", () => {
    trackEvent(AnalyticsEvent.GENERATION_COMPLETED, {
      generation_id: 7,
      scope: "week",
    });
    expect(mockRecord).toHaveBeenCalledWith(
      AnalyticsEvent.GENERATION_COMPLETED,
      { generation_id: 7, scope: "week" },
    );
  });

  // A funnel row is worth less than the screen the user is looking at.
  it("does not throw when the durable mirror rejects", () => {
    mockRecord.mockImplementationOnce(() =>
      Promise.reject(new Error("offline")),
    );
    expect(() =>
      trackEvent(AnalyticsEvent.PLAN_REVEAL_SHOWN, {
        scope: "day",
        entry: "dock_chip",
      }),
    ).not.toThrow();
  });
});

describe("workout_viewed [#117]", () => {
  // The funnel rung that did not exist: without it, "never opened a session"
  // and "opened it and left" are indistinguishable, because workout_started
  // fires on the Start tap and plan_day_logs only exists on completion.
  it("is registered with the funnel's naming convention", () => {
    expect(AnalyticsEvent.WORKOUT_VIEWED).toBe("workout_viewed");
  });

  it("is mirrored to Postgres, or it cannot answer a SQL question", () => {
    (recordClientEvent as jest.Mock).mockClear();
    trackEvent(AnalyticsEvent.WORKOUT_VIEWED, {
      plan_day_id: 42,
      exercise_count: 12,
      already_started: false,
    });
    expect(recordClientEvent).toHaveBeenCalledWith(
      "workout_viewed",
      expect.objectContaining({ plan_day_id: 42, exercise_count: 12 })
    );
  });

  it("carries the properties the activation question needs", () => {
    (recordClientEvent as jest.Mock).mockClear();
    trackEvent(AnalyticsEvent.WORKOUT_VIEWED, {
      plan_day_id: 7,
      exercise_count: 18,
      already_started: true,
    });
    const props = (recordClientEvent as jest.Mock).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    // exercise_count is what makes "was it daunting?" answerable per view;
    // already_started separates a first look from a return to one in progress.
    expect(props).toEqual({
      plan_day_id: 7,
      exercise_count: 18,
      already_started: true,
    });
  });
});
