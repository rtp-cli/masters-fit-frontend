import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";

import { activityLabel } from "@/constants/activities";
import { useWorkout } from "@/contexts/workout-context";
import { syncHealthActivities } from "@/lib/health-activity-import";
import { type LoggedActivityType } from "@/types/api";
import { type ImportCandidate } from "@/utils/health-activity-mapping";

/**
 * Renderless: imports watch workouts on mount and on every return to the
 * foreground. Mounted once in the tabs layout, so it only runs signed in.
 *
 * Holds off while a MastersFit session is in progress — the consent question
 * must never pop up mid-set, and the watch recording of that very session is
 * still being written.
 */

const storeName = Platform.OS === "ios" ? "Apple Health" : "Health Connect";

/** How one activity type reads in a sentence: [singular, plural]. */
const NOUNS: Partial<Record<LoggedActivityType, [string, string]>> = {
  walk: ["a walk", "walks"],
  run: ["a run", "runs"],
  bike: ["a bike ride", "bike rides"],
  swim: ["a swim", "swims"],
  hike: ["a hike", "hikes"],
  yoga: ["a yoga session", "yoga sessions"],
  racket_sport: ["a racket sport session", "racket sport sessions"],
  golf: ["a round of golf", "rounds of golf"],
};

/** "a walk", "2 walks", "2 walks and a round of golf". */
export function describe(candidates: ImportCandidate[]): string {
  const counts = new Map<string, { n: number; one: string; many: string }>();
  for (const c of candidates) {
    const label = activityLabel(c).toLowerCase();
    const [one, many] = NOUNS[c.activityType] ?? [
      `a ${label} workout`,
      `${label} workouts`,
    ];
    const key = `${c.activityType}|${label}`;
    const entry = counts.get(key) ?? { n: 0, one, many };
    entry.n += 1;
    counts.set(key, entry);
  }
  const parts = [...counts.values()].map((e) =>
    e.n === 1 ? e.one : `${e.n} ${e.many}`
  );
  return parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The one-time consent question. Resolves true for "Add them". */
export function askToImport(candidates: ImportCandidate[]): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      `Add workouts from ${storeName}?`,
      `We found ${describe(candidates)} you recorded on your watch. ` +
        `Add ${candidates.length === 1 ? "it" : "them"} to your activity log? ` +
        `Walks, runs and other workouts you record from now on will be added ` +
        `automatically. Strength and interval sessions are skipped. You can ` +
        `turn this off in Settings.`,
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Add them", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

export default function HealthActivitySync() {
  const { isWorkoutInProgress } = useWorkout();
  const inProgressRef = useRef(isWorkoutInProgress);
  inProgressRef.current = isWorkoutInProgress;

  useEffect(() => {
    const run = () => {
      if (inProgressRef.current) return;
      void syncHealthActivities({ confirm: askToImport });
    };

    // The first run happens in the effect below, which also fires on mount.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
  }, []);

  // Finishing a session is a natural moment to pick up a walk done earlier.
  useEffect(() => {
    if (!isWorkoutInProgress) {
      void syncHealthActivities({ confirm: askToImport });
    }
  }, [isWorkoutInProgress]);

  return null;
}
