import {
  countSessionsForDate,
  selectSessionForDate,
} from "@/utils/session-for-date";

const normalize = (d: string | Date) =>
  typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

const TODAY = "2026-09-17";

describe("selectSessionForDate", () => {
  it("returns today's only session", () => {
    const days = [
      { date: "2026-09-16", isComplete: true },
      { date: TODAY, isComplete: false },
      { date: "2026-09-19", isComplete: false },
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
    const morning = { date: TODAY, isComplete: true, id: "morning" };
    const bonus = { date: TODAY, isComplete: false, id: "bonus" };
    expect(selectSessionForDate([morning, bonus], TODAY, normalize)).toBe(bonus);
  });

  it("prefers the unfinished one regardless of order", () => {
    const bonus = { date: TODAY, isComplete: false, id: "bonus" };
    const morning = { date: TODAY, isComplete: true, id: "morning" };
    expect(selectSessionForDate([bonus, morning], TODAY, normalize)).toBe(bonus);
  });

  // Both done: show the one finished most recently, not the first of the day.
  it("falls back to the LAST session when everything today is complete", () => {
    const morning = { date: TODAY, isComplete: true, id: "morning" };
    const evening = { date: TODAY, isComplete: true, id: "evening" };
    expect(selectSessionForDate([morning, evening], TODAY, normalize)).toBe(
      evening,
    );
  });

  it("returns null when today has no session", () => {
    const days = [{ date: "2026-09-18", isComplete: false }];
    expect(selectSessionForDate(days, TODAY, normalize)).toBeNull();
  });

  it("returns null for an empty or missing plan rather than throwing", () => {
    expect(selectSessionForDate([], TODAY, normalize)).toBeNull();
    expect(selectSessionForDate(null, TODAY, normalize)).toBeNull();
    expect(selectSessionForDate(undefined, TODAY, normalize)).toBeNull();
  });

  // isComplete is nullable in the schema; null must read as "not finished".
  it("treats a null isComplete as unfinished", () => {
    const days = [{ date: TODAY, isComplete: null }];
    expect(selectSessionForDate(days, TODAY, normalize)).toBe(days[0]);
  });

  // Dates arrive from the API as timestamps.
  it("normalises a timestamp before comparing", () => {
    const days = [{ date: "2026-09-17T14:30:00.000Z", isComplete: false }];
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
