import { formatEnumValue as formatEnumValueOnboarding } from "@/components/onboarding/utils/formatters";
import { FITNESS_LEVELS, PREFERRED_STYLES } from "@/types/enums";
import { ENUM_DISPLAY_OVERRIDES, formatEnumValue } from "@/utils";

describe("enum display labels [LR-084]", () => {
  it("relabels the fitness levels as behaviour, not self-rating", () => {
    expect(formatEnumValue(FITNESS_LEVELS.BEGINNER)).toBe("Getting moving");
    expect(formatEnumValue(FITNESS_LEVELS.INTERMEDIATE)).toBe("Building fitness");
    expect(formatEnumValue(FITNESS_LEVELS.ADVANCED)).toBe("Training regularly");
  });

  it("names the walking modality with an ampersand, not 'Walking Movement'", () => {
    expect(formatEnumValue(PREFERRED_STYLES.WALKING_MOVEMENT)).toBe(
      "Walking & Movement"
    );
  });

  it("keeps the labels identical across BOTH formatters", () => {
    // Settings and onboarding render the same profile fields through two
    // different formatEnumValue implementations. They had already drifted once;
    // this is the test that stops it happening again.
    for (const stored of Object.keys(ENUM_DISPLAY_OVERRIDES)) {
      expect(formatEnumValueOnboarding(stored)).toBe(formatEnumValue(stored));
    }
    expect(formatEnumValueOnboarding("advanced")).toBe("Training regularly");
  });

  it("still title-cases anything without an override", () => {
    expect(formatEnumValue("commercial_gym")).toBe("Commercial Gym");
    expect(formatEnumValueOnboarding("commercial_gym")).toBe("Commercial Gym");
  });

  it("preserves the pre-existing special cases", () => {
    expect(formatEnumValue("HIIT")).toBe("HIIT");
    expect(formatEnumValue("mobility_flexibility")).toBe("Mobility & Flexibility");
  });

  it("returns empty string for empty input in both", () => {
    expect(formatEnumValue("")).toBe("");
    expect(formatEnumValueOnboarding("")).toBe("");
  });
});
