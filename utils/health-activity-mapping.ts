import { type LoggedActivityType } from "@/types/api";

/**
 * Health activity import: which watch workouts become logged activities, and
 * as what.
 *
 * Pure on purpose (no native imports) so the mapping is unit-testable — it is
 * the part most likely to be wrong, and a wrong entry either duplicates a
 * MastersFit session or silently drops someone's walk.
 *
 * Three outcomes per watch type:
 *  - a known activity type (walk, run, …) → imported as that type
 *  - EXCLUDED → never imported. These are what people record DURING a
 *    MastersFit session (functional/traditional strength, HIIT, mixed cardio,
 *    core, cross training, cooldown). The server's time-overlap check is the
 *    primary guard against duplicating a session; this list is the backstop,
 *    and it also covers a session the user never logged in the app.
 *    Trade-off, decided 2026-10-08: a strength class done OUTSIDE MastersFit
 *    is not imported either — it can be logged by hand.
 *  - anything else → "other", labelled with the watch's own name ("Rowing").
 */

export interface MappedActivity {
  activityType: LoggedActivityType;
  /** Only for "other". */
  customType: string | null;
}

/** A watch recording shorter than this is an accidental start, not a workout. */
export const MIN_IMPORT_MINUTES = 5;

// ---------------------------------------------------------------- Apple Health
// Names as react-native-health reports them (activityName).

const HEALTHKIT_TYPES: Readonly<Record<string, LoggedActivityType>> = {
  Walking: "walk",
  WheelchairWalkPace: "walk",
  Running: "run",
  WheelchairRunPace: "run",
  Cycling: "bike",
  HandCycling: "bike",
  Swimming: "swim",
  Hiking: "hike",
  Yoga: "yoga",
  Pilates: "yoga",
  Flexibility: "yoga",
  MindAndBody: "yoga",
  TaiChi: "yoga",
  Tennis: "racket_sport",
  Pickleball: "racket_sport",
  Badminton: "racket_sport",
  Squash: "racket_sport",
  Racquetball: "racket_sport",
  TableTennis: "racket_sport",
  Golf: "golf",
};

const HEALTHKIT_EXCLUDED = new Set([
  "FunctionalStrengthTraining",
  "TraditionalStrengthTraining",
  "HighIntensityIntervalTraining",
  "MixedCardio",
  "MixedMetabolicCardioTraining",
  "CoreTraining",
  "CrossTraining",
  "Cooldown",
  "PreparationAndRecovery",
  // The watch's generic "Other" says nothing about what happened, and is a
  // common pick for a gym session.
  "Other",
]);

/** "StairClimbing" → "Stair climbing". */
function humanize(name: string): string {
  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function mapHealthKitActivity(
  activityName: string | null | undefined
): MappedActivity | null {
  if (!activityName || HEALTHKIT_EXCLUDED.has(activityName)) return null;
  const known = HEALTHKIT_TYPES[activityName];
  if (known) return { activityType: known, customType: null };
  return { activityType: "other", customType: humanize(activityName) };
}

// -------------------------------------------------------------- Health Connect
// ExerciseType integers from react-native-health-connect (constants.ts). Kept
// as literals so this file never imports the native package.

const HEALTH_CONNECT_TYPES: Readonly<Record<number, LoggedActivityType>> = {
  79: "walk", // WALKING
  82: "walk", // WHEELCHAIR
  56: "run", // RUNNING
  57: "run", // RUNNING_TREADMILL
  8: "bike", // BIKING
  9: "bike", // BIKING_STATIONARY
  73: "swim", // SWIMMING_OPEN_WATER
  74: "swim", // SWIMMING_POOL
  37: "hike", // HIKING
  83: "yoga", // YOGA
  48: "yoga", // PILATES
  71: "yoga", // STRETCHING
  2: "racket_sport", // BADMINTON
  50: "racket_sport", // RACQUETBALL
  66: "racket_sport", // SQUASH
  75: "racket_sport", // TABLE_TENNIS
  76: "racket_sport", // TENNIS
  32: "golf", // GOLF
};

const HEALTH_CONNECT_EXCLUDED = new Set([
  0, // OTHER_WORKOUT
  70, // STRENGTH_TRAINING
  81, // WEIGHTLIFTING
  36, // HIGH_INTENSITY_INTERVAL_TRAINING
  13, // CALISTHENICS
  10, // BOOT_CAMP
  26, // EXERCISE_CLASS
  33, // GUIDED_BREATHING
  // Single gym movements — only ever recorded inside a strength session.
  1, 3, 6, 7, 12, 15, 17, 18, 19, 20, 21, 22, 23, 24, 30, 40, 42, 43, 49, 67,
  77,
]);

/** Labels for the Health Connect types that land in "other". */
const HEALTH_CONNECT_OTHER_LABELS: Readonly<Record<number, string>> = {
  4: "Baseball",
  5: "Basketball",
  11: "Boxing",
  14: "Cricket",
  16: "Dancing",
  25: "Elliptical",
  27: "Fencing",
  28: "American football",
  29: "Australian football",
  31: "Frisbee",
  34: "Gymnastics",
  35: "Handball",
  38: "Ice hockey",
  39: "Ice skating",
  41: "Jump rope",
  44: "Martial arts",
  46: "Paddling",
  47: "Paragliding",
  51: "Rock climbing",
  52: "Roller hockey",
  53: "Rowing",
  54: "Rowing machine",
  55: "Rugby",
  58: "Sailing",
  59: "Scuba diving",
  60: "Skating",
  61: "Skiing",
  62: "Snowboarding",
  63: "Snowshoeing",
  64: "Soccer",
  65: "Softball",
  68: "Stair climbing",
  69: "Stair climbing machine",
  72: "Surfing",
  78: "Volleyball",
  80: "Water polo",
};

export function mapHealthConnectActivity(
  exerciseType: number | null | undefined
): MappedActivity | null {
  if (exerciseType == null || HEALTH_CONNECT_EXCLUDED.has(exerciseType)) {
    return null;
  }
  const known = HEALTH_CONNECT_TYPES[exerciseType];
  if (known) return { activityType: known, customType: null };
  const label = HEALTH_CONNECT_OTHER_LABELS[exerciseType];
  // An integer we have never heard of (a newer SDK) tells us nothing — skip it
  // rather than import an unlabeled "Something else".
  return label ? { activityType: "other", customType: label } : null;
}

// ------------------------------------------------------------ candidate build

/** What the native reader hands over (see HealthWorkout in utils/health.ts). */
export interface WorkoutForImport {
  id: string;
  platform: "ios" | "android";
  activityName: string | null;
  exerciseType: number | null;
  start: Date;
  end: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  sourceId: string | null;
}

export interface ImportCandidate {
  externalId: string;
  source: "apple_health" | "health_connect";
  activityType: LoggedActivityType;
  customType: string | null;
  /** The user's LOCAL date the workout started on. */
  date: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  distanceMeters: number | null;
}

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Turn raw watch workouts into what the import endpoint takes. Drops our own
 * write-backs (by source app id), excluded types, and accidental starts.
 */
export function toImportCandidates(
  workouts: WorkoutForImport[],
  ownSourceIds: string[]
): ImportCandidate[] {
  const own = new Set(ownSourceIds.filter(Boolean));
  const out: ImportCandidate[] = [];

  for (const w of workouts) {
    if (w.sourceId && own.has(w.sourceId)) continue;
    const mapped =
      w.platform === "ios"
        ? mapHealthKitActivity(w.activityName)
        : mapHealthConnectActivity(w.exerciseType);
    if (!mapped) continue;

    const durationMinutes = Math.round(w.durationSeconds / 60);
    // Server cap is 600; anything longer is a watch left running.
    if (durationMinutes < MIN_IMPORT_MINUTES || durationMinutes > 600) continue;
    if (Number.isNaN(w.start.getTime()) || Number.isNaN(w.end.getTime())) {
      continue;
    }

    out.push({
      externalId: w.id,
      source: w.platform === "ios" ? "apple_health" : "health_connect",
      activityType: mapped.activityType,
      customType: mapped.customType,
      date: localDate(w.start),
      startedAt: w.start.toISOString(),
      endedAt: w.end.toISOString(),
      durationMinutes,
      distanceMeters: w.distanceMeters,
    });
  }
  return out;
}
