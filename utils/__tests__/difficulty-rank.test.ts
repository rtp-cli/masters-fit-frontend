import { difficultyRank, isEasierThan } from "@/utils/difficulty-rank";

describe("difficultyRank", () => {
  it("treats catalog and profile vocabularies as the same three steps", () => {
    expect(difficultyRank("low")).toBe(difficultyRank("beginner"));
    expect(difficultyRank("moderate")).toBe(difficultyRank("intermediate"));
    expect(difficultyRank("high")).toBe(difficultyRank("advanced"));
    expect(difficultyRank(" High ")).toBe(2);
  });

  it("has no rank for missing or unknown values", () => {
    expect(difficultyRank(null)).toBeUndefined();
    expect(difficultyRank("")).toBeUndefined();
    expect(difficultyRank("elite")).toBeUndefined();
  });
});

describe("isEasierThan", () => {
  it("is strict", () => {
    expect(isEasierThan("low", "moderate")).toBe(true);
    expect(isEasierThan("moderate", "high")).toBe(true);
    expect(isEasierThan("moderate", "moderate")).toBe(false);
    expect(isEasierThan("high", "low")).toBe(false);
  });

  it("never claims an unranked movement is easier", () => {
    expect(isEasierThan(null, "high")).toBe(false);
    expect(isEasierThan("low", undefined)).toBe(false);
  });
});
