import { resolveDefaultRegenerationTab } from "@/utils/regeneration-tab";

const base = {
  singleTabOnly: false,
  isRestDay: false,
  noActiveWorkoutDay: false,
  regenerationType: "day" as const,
};

describe("resolveDefaultRegenerationTab", () => {
  it("defaults to week on a rest day, regardless of regenerationType [LR-038]", () => {
    expect(resolveDefaultRegenerationTab({ ...base, isRestDay: true })).toBe(
      "week"
    );
  });

  it("defaults to week when there's no active workout day", () => {
    expect(
      resolveDefaultRegenerationTab({ ...base, noActiveWorkoutDay: true })
    ).toBe("week");
  });

  it("singleTabOnly always wins, even on a rest day", () => {
    expect(
      resolveDefaultRegenerationTab({
        ...base,
        singleTabOnly: true,
        isRestDay: true,
      })
    ).toBe("day");
  });

  it("falls back to the caller's regenerationType otherwise", () => {
    expect(
      resolveDefaultRegenerationTab({ ...base, regenerationType: "week" })
    ).toBe("week");
    expect(resolveDefaultRegenerationTab(base)).toBe("day");
  });
});
