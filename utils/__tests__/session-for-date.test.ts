import {
  countSessionsForDate,
  selectSessionForDate,
  sessionsForDate,
} from "@/utils/session-for-date";

const normalize = (d: string | Date) =>
  typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

const TODAY = "2026-09-17";

describe("selectSessionForDate", () => {
  it("returns today's only session", () => {
    const days = [
      { date: "2026-09-16", isComplete: true, blocks: [1] },
      { date: TODAY, isComplete: false, blocks: [1] },
      { date: "2026-09-19", isComplete: false, blocks: [1] },
    ];
    expect(selectSessionForDate(days, TODAY, normalize)).toEqual(days[1]);
  });

  /**
   * [LR-069] The case the old `.find()` got wrong, and the reason this exists.
   * After finishing the morning workout and adding a bonus session, `.find()`
   * returned the FINISHED one — so the session the user had just asked for was
   * invisible and the screen looked like nothing had happened.
   */
  it("prefers the unfinished session when today has two", () => {
    const morning = { date: TODAY, isComplete: true, id: "morning", blocks: [1] };
    const bonus = { date: TODAY, isComplete: false, id: "bonus", blocks: [1] };
    expect(selectSessionForDate([morning, bonus], TODAY, normalize)).toBe(bonus);
  });

  it("prefers the unfinished one regardless of order", () => {
    const bonus = { date: TODAY, isComplete: false, id: "bonus", blocks: [1] };
    const morning = { date: TODAY, isComplete: true, id: "morning", blocks: [1] };
    expect(selectSessionForDate([bonus, morning], TODAY, normalize)).toBe(bonus);
  });

  // Both done: show the one finished most recently, not the first of the day.
  it("falls back to the LAST session when everything today is complete", () => {
    const morning = { date: TODAY, isComplete: true, id: "morning", blocks: [1] };
    const evening = { date: TODAY, isComplete: true, id: "evening", blocks: [1] };
    expect(selectSessionForDate([morning, evening], TODAY, normalize)).toBe(
      evening,
    );
  });

  it("returns null when today has no session", () => {
    const days = [{ date: "2026-09-18", isComplete: false, blocks: [1] }];
    expect(selectSessionForDate(days, TODAY, normalize)).toBeNull();
  });

  it("returns null for an empty or missing plan rather than throwing", () => {
    expect(selectSessionForDate([], TODAY, normalize)).toBeNull();
    expect(selectSessionForDate(null, TODAY, normalize)).toBeNull();
    expect(selectSessionForDate(undefined, TODAY, normalize)).toBeNull();
  });

  // isComplete is nullable in the schema; null must read as "not finished".
  it("treats a null isComplete as unfinished", () => {
    const days = [{ date: TODAY, isComplete: null, blocks: [1] }];
    expect(selectSessionForDate(days, TODAY, normalize)).toBe(days[0]);
  });

  // Dates arrive from the API as timestamps.
  it("normalises a timestamp before comparing", () => {
    const days = [{ date: "2026-09-17T14:30:00.000Z", isComplete: false, blocks: [1] }];
    expect(selectSessionForDate(days, TODAY, normalize)).toBe(days[0]);
  });
});

describe("countSessionsForDate", () => {
  it("counts only today", () => {
    const days = [
      { date: "2026-09-16" },
      { date: TODAY },
      { date: TODAY },
      { date: "2026-09-18" },
    ];
    expect(countSessionsForDate(days, TODAY, normalize)).toBe(2);
  });

  it("is 0 for an empty or missing plan", () => {
    expect(countSessionsForDate([], TODAY, normalize)).toBe(0);
    expect(countSessionsForDate(null, TODAY, normalize)).toBe(0);
  });
});

/**
 * Regression: production, 2026-09-17.
 *
 * A bonus workout's plan day is created BEFORE its exercises are generated, so
 * for the life of that job the date holds an empty placeholder alongside the
 * real session. The workout screen renders a blockless day as a rest day — so
 * preferring the placeholder showed "Rest Day" on top of a workout the user had
 * already completed, which is indistinguishable from data loss.
 */
describe("selectSessionForDate — sessions still generating", () => {
  const done = { date: TODAY, isComplete: true, id: "done", blocks: [1, 2] };
  const generating = { date: TODAY, isComplete: false, id: "generating", blocks: [] };

  it("does NOT shadow a completed workout with a session still generating", () => {
    expect(selectSessionForDate([done, generating], TODAY, normalize)).toBe(done);
  });

  it("ignores the placeholder regardless of order", () => {
    expect(selectSessionForDate([generating, done], TODAY, normalize)).toBe(done);
  });

  it("picks the bonus session once its blocks have arrived", () => {
    const ready = { date: TODAY, isComplete: false, id: "ready", blocks: [1] };
    expect(selectSessionForDate([done, ready], TODAY, normalize)).toBe(ready);
  });

  it("treats a missing blocks field as no content", () => {
    const noField = { date: TODAY, isComplete: false, id: "noField" };
    expect(selectSessionForDate([done, noField], TODAY, normalize)).toBe(done);
  });

  // A genuine rest day IS a plan day with no blocks. When that is all there is,
  // it must still resolve, or the rest-day screen breaks.
  it("still returns a genuine blockless rest day when it is the only session", () => {
    const restDay = { date: TODAY, isComplete: false, id: "rest", blocks: [] };
    expect(selectSessionForDate([restDay], TODAY, normalize)).toBe(restDay);
  });
});

describe("sessionsForDate", () => {
  const normalize2 = (d: string | Date) =>
    typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

  it("returns both sessions on a doubled-up day, in order", () => {
    const morning = { date: TODAY, isComplete: true, id: "m", blocks: [1] };
    const bonus = { date: TODAY, isComplete: false, id: "b", blocks: [1] };
    const other = { date: "2026-09-18", isComplete: false, blocks: [1] };
    expect(sessionsForDate([morning, bonus, other], TODAY, normalize2)).toEqual([
      morning,
      bonus,
    ]);
  });

  // A placeholder mid-generation is not something to offer as a choice.
  it("excludes a session that has no blocks yet", () => {
    const real = { date: TODAY, isComplete: true, id: "r", blocks: [1] };
    const generating = { date: TODAY, isComplete: false, id: "g", blocks: [] };
    expect(sessionsForDate([real, generating], TODAY, normalize2)).toEqual([real]);
  });

  it("is empty for a date with nothing on it", () => {
    expect(sessionsForDate([], TODAY, normalize2)).toEqual([]);
    expect(sessionsForDate(null, TODAY, normalize2)).toEqual([]);
  });
});
