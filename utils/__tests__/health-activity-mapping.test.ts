import {
  mapHealthConnectActivity,
  mapHealthKitActivity,
  toImportCandidates,
  type WorkoutForImport,
} from "../health-activity-mapping";

const OWN = ["com.mastersfit.ai"];

const watchWorkout = (
  overrides: Partial<WorkoutForImport> = {}
): WorkoutForImport => ({
  id: "6F1C-UUID",
  platform: "ios",
  activityName: "Walking",
  exerciseType: null,
  start: new Date(2026, 9, 8, 7, 0),
  end: new Date(2026, 9, 8, 7, 45),
  durationSeconds: 45 * 60,
  distanceMeters: 2800,
  sourceId: "com.apple.health.watch",
  ...overrides,
});

describe("mapHealthKitActivity", () => {
  it("maps the activities on our list", () => {
    expect(mapHealthKitActivity("Walking")?.activityType).toBe("walk");
    expect(mapHealthKitActivity("Pickleball")?.activityType).toBe("racket_sport");
    expect(mapHealthKitActivity("Pilates")?.activityType).toBe("yoga");
  });

  it("never imports what people record during a MastersFit session", () => {
    // Rich records his sessions as these three; they must never duplicate.
    for (const t of [
      "FunctionalStrengthTraining",
      "MixedCardio",
      "HighIntensityIntervalTraining",
      "TraditionalStrengthTraining",
      "CoreTraining",
      "CrossTraining",
      "Cooldown",
      "Other",
    ]) {
      expect(mapHealthKitActivity(t)).toBeNull();
    }
  });

  it("labels everything else with the watch's own name", () => {
    expect(mapHealthKitActivity("StairClimbing")).toEqual({
      activityType: "other",
      customType: "Stair climbing",
    });
    expect(mapHealthKitActivity("Rowing")?.customType).toBe("Rowing");
  });
});

describe("mapHealthConnectActivity", () => {
  it("maps walking, pool swims and tennis", () => {
    expect(mapHealthConnectActivity(79)?.activityType).toBe("walk");
    expect(mapHealthConnectActivity(74)?.activityType).toBe("swim");
    expect(mapHealthConnectActivity(76)?.activityType).toBe("racket_sport");
  });

  it("skips strength, HIIT and single gym movements", () => {
    for (const t of [70, 81, 36, 13, 0, 17, 67]) {
      expect(mapHealthConnectActivity(t)).toBeNull();
    }
  });

  it("skips a type it has never heard of", () => {
    expect(mapHealthConnectActivity(999)).toBeNull();
  });
});

describe("toImportCandidates", () => {
  it("builds the import payload with the LOCAL start date", () => {
    const [c] = toImportCandidates([watchWorkout()], OWN);
    expect(c).toMatchObject({
      externalId: "6F1C-UUID",
      source: "apple_health",
      activityType: "walk",
      customType: null,
      date: "2026-10-08",
      durationMinutes: 45,
      distanceMeters: 2800,
    });
  });

  it("drops our own write-backs", () => {
    expect(
      toImportCandidates(
        [watchWorkout({ sourceId: "com.mastersfit.ai", activityName: "Walking" })],
        OWN
      )
    ).toEqual([]);
  });

  it("drops an accidental start under 5 minutes", () => {
    expect(
      toImportCandidates([watchWorkout({ durationSeconds: 4 * 60 })], OWN)
    ).toEqual([]);
  });

  it("drops a watch left running past the server's 10-hour cap", () => {
    expect(
      toImportCandidates([watchWorkout({ durationSeconds: 11 * 3600 })], OWN)
    ).toEqual([]);
  });

  it("uses health_connect as the Android source", () => {
    const [c] = toImportCandidates(
      [
        watchWorkout({
          platform: "android",
          activityName: null,
          exerciseType: 79,
          distanceMeters: null,
        }),
      ],
      OWN
    );
    expect(c.source).toBe("health_connect");
    expect(c.distanceMeters).toBeNull();
  });
});
