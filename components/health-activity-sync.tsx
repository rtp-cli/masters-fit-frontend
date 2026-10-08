import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";

import { activityLabel } from "@/constants/activities";
import { useWorkout } from "@/contexts/workout-context";
import { syncHealthActivities } from "@/lib/health-activity-import";
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

/** "a walk", "2 walks and a rowing session" — kept short and plain. */
function describe(candidates: ImportCandidate[]): string {
  if (candidates.length === 1) {
    return `a ${activityLabel(candidates[0]).toLowerCase()}`;
  }
  const labels = [
    ...new Set(candidates.map((c) => activityLabel(c).toLowerCase())),
  ];
  return `${candidates.length} workouts (${labels.join(", ")})`;
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
