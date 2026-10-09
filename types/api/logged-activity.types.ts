/**
 * [LR-077] Something the user did that the app never prescribed.
 *
 * Not a PlanDay and not a session. It has no blocks, no exercises, no sets and
 * no reps, because nothing generated it — it is a record that something
 * happened, which is a different kind of object from a prescription.
 */

/** Mirrors LOGGED_ACTIVITY_TYPES in the backend schema. */
export const LOGGED_ACTIVITY_TYPES = [
  "walk",
  "run",
  "bike",
  "swim",
  "hike",
  "strength",
  "yoga",
  "racket_sport",
  "golf",
  "other",
] as const;

export type LoggedActivityType = (typeof LOGGED_ACTIVITY_TYPES)[number];

export const LOGGED_ACTIVITY_EFFORTS = ["easy", "moderate", "hard"] as const;

export type LoggedActivityEffort = (typeof LOGGED_ACTIVITY_EFFORTS)[number];

/** Mirrors LOGGED_ACTIVITY_SOURCES in the backend schema. */
export type LoggedActivitySource = "manual" | "apple_health" | "health_connect";

export interface LoggedActivity {
  id: number;
  userId: number;
  /** "YYYY-MM-DD" in the user's own local date, same as PlanDay.date. */
  date: string;
  activityType: LoggedActivityType;
  /** Only set when activityType is "other". */
  customType: string | null;
  durationMinutes: number;
  effort: LoggedActivityEffort | null;
  notes: string | null;
  /** "manual" = the Log-an-activity sheet; otherwise read off the watch. */
  source: LoggedActivitySource;
  /** Imports only. */
  startedAt: string | null;
  distanceMeters: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoggedActivityInput {
  date: string;
  activityType: LoggedActivityType;
  customType?: string | null;
  durationMinutes: number;
  effort?: LoggedActivityEffort | null;
  notes?: string | null;
}

/** One watch workout, already mapped, as POST /activities/import takes it. */
export interface ImportedActivityInput {
  externalId: string;
  source: "apple_health" | "health_connect";
  activityType: LoggedActivityType;
  customType: string | null;
  date: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  distanceMeters: number | null;
}

export interface ImportActivitiesResult {
  imported: LoggedActivity[];
  skippedExisting: number;
  skippedSessionOverlap: number;
  skippedManualDuplicate: number;
}
