import { isRepeatable, weeksToOffer } from "@/utils/repeat-weeks";

const week = (id: number, endDate: string, completedWorkouts = 0) => ({
  id,
  endDate,
  completedWorkouts,
  completionRate: completedWorkouts > 0 ? 50 : 0,
});

describe("weeksToOffer [LR-087]", () => {
  it("offers only plans the user did some of, by default", () => {
    const weeks = [week(1, "2026-08-08", 0), week(2, "2026-09-01", 2)];
    const { list, preselected } = weeksToOffer(weeks, { includeMostRecent: false });
    expect(list.map((w) => w.id)).toEqual([2]);
    expect(preselected).toBeNull();
  });

  it("from the plan-ended screen, offers the never-started plan that just ended", () => {
    // The regression this exists for: a never-activated user with no builds
    // left saw "No Previous Plans" under a "Repeat a past week" button.
    const weeks = [week(7, "2026-08-08", 0)];
    const { list, preselected } = weeksToOffer(weeks, { includeMostRecent: true });
    expect(list.map((w) => w.id)).toEqual([7]);
    expect(preselected?.id).toBe(7);
  });

  it("puts the most recent plan first and still offers the older ones they trained", () => {
    const weeks = [week(1, "2026-08-01", 3), week(2, "2026-09-21", 0)];
    const { list, preselected } = weeksToOffer(weeks, { includeMostRecent: true });
    expect(list.map((w) => w.id)).toEqual([2, 1]);
    expect(preselected?.id).toBe(2);
  });

  it("doesn't duplicate the most recent plan when it was already repeatable", () => {
    const weeks = [week(1, "2026-08-01", 3), week(2, "2026-09-21", 1)];
    const { list, preselected } = weeksToOffer(weeks, { includeMostRecent: true });
    expect(list.map((w) => w.id)).toEqual([1, 2]);
    expect(preselected?.id).toBe(2);
  });

  it("picks most recent by end date, not by the server's order", () => {
    const weeks = [week(9, "2026-07-01", 0), week(3, "2026-09-10", 0)];
    expect(weeksToOffer(weeks, { includeMostRecent: true }).preselected?.id).toBe(3);
  });

  it("returns nothing to offer when there are no plans at all", () => {
    expect(weeksToOffer([], { includeMostRecent: true })).toEqual({
      list: [],
      preselected: null,
    });
  });
});

describe("isRepeatable", () => {
  it("counts a plan with a completion rate or a completed day", () => {
    expect(isRepeatable({ id: 1, endDate: "", completionRate: 10 })).toBe(true);
    expect(isRepeatable({ id: 1, endDate: "", completedWorkouts: 1 })).toBe(true);
    expect(isRepeatable({ id: 1, endDate: "" })).toBe(false);
  });
});
