import type { TemporaryOverrides } from "@/components/profile-override-form";
import { type Profile as UserProfile } from "@/types/api";
import {
  AVAILABLE_EQUIPMENT,
  INTENSITY_LEVELS,
  PREFERRED_STYLES,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums";
import {
  describeOverrides,
  formatOverridesIntoReason,
  formatOverrideSummary,
} from "@/utils/override-summary";

// Minimal profile the comparisons read from; intensityLevel stored numerically
// (1/2/3) as the profile endpoint returns it.
const profile = (extra: Partial<UserProfile> = {}): UserProfile =>
  ({
    workoutDuration: 30,
    intensityLevel: 2,
    preferredStyles: [PREFERRED_STYLES.STRENGTH],
    environment: [WORKOUT_ENVIRONMENTS.HOME_GYM],
    equipment: [AVAILABLE_EQUIPMENT.DUMBBELLS],
    otherEquipment: "",
    includeWarmup: true,
    includeCooldown: true,
    ...extra,
  }) as unknown as UserProfile;

// Overrides exactly mirroring that profile — nothing differs.
const matchingOverrides = (): TemporaryOverrides => ({
  duration: 30,
  intensity: INTENSITY_LEVELS.MODERATE,
  styles: [PREFERRED_STYLES.STRENGTH],
  environment: WORKOUT_ENVIRONMENTS.HOME_GYM,
  equipment: [AVAILABLE_EQUIPMENT.DUMBBELLS],
  otherEquipment: "",
  includeWarmup: true,
  includeCooldown: true,
});

describe("describeOverrides", () => {
  it("returns nothing when overrides match the profile", () => {
    expect(describeOverrides(matchingOverrides(), profile())).toEqual([]);
  });

  it("returns nothing when the profile hasn't loaded", () => {
    expect(
      describeOverrides({ ...matchingOverrides(), duration: 45 }, null),
    ).toEqual([]);
  });

  it("describes a duration change", () => {
    expect(
      describeOverrides({ ...matchingOverrides(), duration: 45 }, profile()),
    ).toEqual(["45 min"]);
  });

  it("describes an intensity change against a numeric profile level", () => {
    expect(
      describeOverrides(
        { ...matchingOverrides(), intensity: INTENSITY_LEVELS.HIGH },
        profile({ intensityLevel: 2 }),
      ),
    ).toEqual(["High intensity"]);
  });

  it("normalizes a string profile intensity before comparing", () => {
    expect(
      describeOverrides(
        { ...matchingOverrides(), intensity: INTENSITY_LEVELS.MODERATE },
        profile({ intensityLevel: INTENSITY_LEVELS.MODERATE }),
      ),
    ).toEqual([]);
  });

  it("describes changed styles with display labels", () => {
    expect(
      describeOverrides(
        {
          ...matchingOverrides(),
          styles: [PREFERRED_STYLES.HIIT, PREFERRED_STYLES.CROSSFIT],
        },
        profile(),
      ),
    ).toEqual(["Styles: HIIT, Crossfit"]);
  });

  it("ignores styles cleared to empty (matches prior behavior)", () => {
    expect(
      describeOverrides({ ...matchingOverrides(), styles: [] }, profile()),
    ).toEqual([]);
  });

  it("treats reordered arrays as unchanged", () => {
    expect(
      describeOverrides(
        {
          ...matchingOverrides(),
          styles: [PREFERRED_STYLES.HIIT, PREFERRED_STYLES.STRENGTH],
        },
        profile({
          preferredStyles: [PREFERRED_STYLES.STRENGTH, PREFERRED_STYLES.HIIT],
        }),
      ),
    ).toEqual([]);
  });

  it("describes an environment change", () => {
    expect(
      describeOverrides(
        {
          ...matchingOverrides(),
          environment: WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM,
        },
        profile(),
      ),
    ).toEqual(["Full Gym"]);
  });

  it("describes equipment changes only for a home-gym environment", () => {
    const withEquipment = {
      ...matchingOverrides(),
      equipment: [AVAILABLE_EQUIPMENT.KETTLEBELLS],
    };
    expect(describeOverrides(withEquipment, profile())).toEqual([
      "Equipment: Kettlebells",
    ]);
    expect(
      describeOverrides(
        {
          ...withEquipment,
          environment: WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY,
        },
        profile(),
      ),
    ).toEqual(["Bodyweight Only"]);
  });

  it("describes non-empty other-equipment changes, trimmed", () => {
    expect(
      describeOverrides(
        { ...matchingOverrides(), otherEquipment: "  jump rope " },
        profile(),
      ),
    ).toEqual(["Other equipment: jump rope"]);
    expect(
      describeOverrides(
        { ...matchingOverrides(), otherEquipment: "   " },
        profile({ otherEquipment: "rope" }),
      ),
    ).toEqual([]);
  });

  it("describes warmup/cooldown toggles", () => {
    expect(
      describeOverrides(
        {
          ...matchingOverrides(),
          includeWarmup: false,
          includeCooldown: false,
        },
        profile(),
      ),
    ).toEqual(["Skip warmup", "Skip cooldown"]);
  });
});

describe("formatOverrideSummary", () => {
  it("falls back when nothing differs", () => {
    expect(formatOverrideSummary([])).toBe("Using your profile settings");
  });

  it("joins up to two entries with a dot", () => {
    expect(formatOverrideSummary(["45 min"])).toBe("45 min");
    expect(formatOverrideSummary(["45 min", "Moderate intensity"])).toBe(
      "45 min · Moderate intensity",
    );
  });

  it("truncates past two entries with +N more", () => {
    expect(
      formatOverrideSummary([
        "45 min",
        "Moderate intensity",
        "Skip cooldown",
        "Skip warmup",
      ]),
    ).toBe("45 min · Moderate intensity +2 more");
  });
});

describe("formatOverridesIntoReason", () => {
  it("uses feedback alone when the profile hasn't loaded", () => {
    expect(
      formatOverridesIntoReason("too much volume", matchingOverrides(), null),
    ).toBe("too much volume");
    expect(formatOverridesIntoReason("  ", matchingOverrides(), null)).toBe(
      "User requested regeneration",
    );
  });

  it("returns trimmed feedback when nothing differs", () => {
    expect(
      formatOverridesIntoReason(
        " shorter please ",
        matchingOverrides(),
        profile(),
      ),
    ).toBe("shorter please");
  });

  it("appends overrides after the feedback", () => {
    expect(
      formatOverridesIntoReason(
        "less volume",
        { ...matchingOverrides(), duration: 45 },
        profile(),
      ),
    ).toBe("less volume\n\nProfile overrides for this workout: 45 min");
  });

  it("describes overrides alone when there is no feedback", () => {
    expect(
      formatOverridesIntoReason(
        "",
        { ...matchingOverrides(), duration: 45, includeCooldown: false },
        profile(),
      ),
    ).toBe(
      "User requested regeneration with the following changes: 45 min, Skip cooldown",
    );
  });

  it("falls back when there is nothing at all", () => {
    expect(
      formatOverridesIntoReason("", matchingOverrides(), profile()),
    ).toBe("User requested regeneration");
  });
});
