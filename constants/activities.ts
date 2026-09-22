import { type LoggedActivity, type LoggedActivityType } from "@/types/api";

/**
 * [LR-077] How a logged activity is named and iconed, in one place.
 *
 * Three surfaces render these rows (the calendar day, the dashboard's today
 * card, and the workout tab) and they must agree — a walk that is "Walk" with a
 * boot icon in one place and "Walking" with a shoe in another reads as two
 * different things.
 */

interface ActivityDisplay {
  label: string;
  /** Ionicons name. */
  icon: string;
}

export const ACTIVITY_DISPLAY: Readonly<
  Record<LoggedActivityType, ActivityDisplay>
> = {
  walk: { label: "Walk", icon: "walk-outline" },
  run: { label: "Run", icon: "footsteps-outline" },
  bike: { label: "Bike", icon: "bicycle-outline" },
  swim: { label: "Swim", icon: "water-outline" },
  hike: { label: "Hike", icon: "trail-sign-outline" },
  strength: { label: "Strength", icon: "barbell-outline" },
  yoga: { label: "Yoga & stretching", icon: "body-outline" },
  // One row rather than separate tennis/pickleball/padel entries: they are the
  // same answer to "what did you do", and a longer list is slower to scan.
  racket_sport: { label: "Racket sport", icon: "tennisball-outline" },
  golf: { label: "Golf", icon: "golf-outline" },
  other: { label: "Something else", icon: "ellipsis-horizontal-circle-outline" },
};

/** Picker order — the ones a masters audience actually does, most-likely first. */
export const ACTIVITY_PICKER_ORDER: readonly LoggedActivityType[] = [
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
];

export const ACTIVITY_EFFORT_LABELS: Readonly<Record<string, string>> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};

/**
 * What to call one logged activity on screen.
 *
 * A user's own label for "Something else" wins over the generic one — they
 * typed "Pickleball" so the row should say Pickleball, not "Something else".
 */
export function activityLabel(
  activity: Pick<LoggedActivity, "activityType" | "customType">
): string {
  if (activity.activityType === "other" && activity.customType?.trim()) {
    return activity.customType.trim();
  }
  return ACTIVITY_DISPLAY[activity.activityType]?.label ?? "Activity";
}

export function activityIcon(activityType: LoggedActivityType): string {
  return ACTIVITY_DISPLAY[activityType]?.icon ?? "ellipse-outline";
}
