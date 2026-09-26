import { FITNESS_LEVELS } from "@/types/enums";
import { isSpreadingDays, plannedSessionsPerWeek } from "@/utils/planned-sessions";

describe("plannedSessionsPerWeek [LR-085]", () => {
  it("builds 3 sessions for a getting-moving user who is free every day", () => {
    expect(plannedSessionsPerWeek(FITNESS_LEVELS.BEGINNER, 7)).toBe(3);
    expect(isSpreadingDays(FITNESS_LEVELS.BEGINNER, 7)).toBe(true);
  });

  it("leaves a getting-moving user with three or fewer days alone", () => {
    expect(plannedSessionsPerWeek(FITNESS_LEVELS.BEGINNER, 2)).toBe(2);
    expect(isSpreadingDays(FITNESS_LEVELS.BEGINNER, 3)).toBe(false);
  });

  it("uses every picked day for other levels, and for an unanswered level", () => {
    expect(plannedSessionsPerWeek(FITNESS_LEVELS.INTERMEDIATE, 6)).toBe(6);
    expect(plannedSessionsPerWeek(FITNESS_LEVELS.ADVANCED, 7)).toBe(7);
    expect(plannedSessionsPerWeek(undefined, 5)).toBe(5);
    expect(isSpreadingDays(FITNESS_LEVELS.ADVANCED, 7)).toBe(false);
  });
});
