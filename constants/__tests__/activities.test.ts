import { LOGGED_ACTIVITY_TYPES } from "@/types/api";

import {
  ACTIVITY_DISPLAY,
  ACTIVITY_PICKER_ORDER,
  activityIcon,
  activityLabel,
} from "../activities";

describe("logged activity display [LR-077]", () => {
  it("names every type in the vocabulary", () => {
    // A type with no display entry renders as a bare enum value ("racket_sport")
    // on three separate surfaces, so the two lists must not drift apart.
    for (const type of LOGGED_ACTIVITY_TYPES) {
      expect(ACTIVITY_DISPLAY[type]).toBeDefined();
      expect(ACTIVITY_DISPLAY[type].label.length).toBeGreaterThan(0);
      expect(ACTIVITY_DISPLAY[type].icon.length).toBeGreaterThan(0);
    }
  });

  it("offers every type in the picker, and nothing else", () => {
    expect([...ACTIVITY_PICKER_ORDER].sort()).toEqual(
      [...LOGGED_ACTIVITY_TYPES].sort()
    );
  });

  it("prefers the user's own label for 'other'", () => {
    // They typed "Pickleball", so the row says Pickleball — showing them
    // "Something else" instead reads as the app having discarded what they said.
    expect(
      activityLabel({ activityType: "other", customType: "Pickleball" })
    ).toBe("Pickleball");
  });

  it("trims a custom label and falls back when it is blank", () => {
    expect(
      activityLabel({ activityType: "other", customType: "  Padel  " })
    ).toBe("Padel");
    expect(activityLabel({ activityType: "other", customType: "   " })).toBe(
      "Something else"
    );
    expect(activityLabel({ activityType: "other", customType: null })).toBe(
      "Something else"
    );
  });

  it("ignores a custom label on a known type", () => {
    // The server nulls customType unless the type is "other"; if a legacy row
    // ever carries both, the known type wins rather than showing two names.
    expect(activityLabel({ activityType: "walk", customType: "Stroll" })).toBe(
      "Walk"
    );
  });

  it("returns a real icon for every type", () => {
    for (const type of LOGGED_ACTIVITY_TYPES) {
      expect(activityIcon(type)).toBe(ACTIVITY_DISPLAY[type].icon);
    }
  });
});
