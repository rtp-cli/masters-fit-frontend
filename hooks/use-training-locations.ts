import { useCallback, useEffect, useMemo, useState } from "react";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import {
  getLocationsAPI,
  setPlanDayLocationAPI,
  type TrainingLocation,
  type TrainingLocationSnapshot,
} from "@/lib/training-locations";
import { regenerateDailyWorkoutAsync } from "@/lib/workouts";
import { type TodayWorkout } from "@/types/api";
import { WORKOUT_ENVIRONMENTS } from "@/types/enums/fitness.enums";

/** Equipment values that mean "no equipment needed" — never a conflict. */
const FREE_EQUIPMENT = new Set(["", "bodyweight", "none"]);

export interface LocationConflict {
  snapshot: TrainingLocationSnapshot;
  /** Equipment the place lacks that today's plan prescribes. */
  missing: string[];
  /** Names of the exercises that need the missing equipment. */
  affectedExercises: string[];
}

/**
 * Equipment reaches the client in more than one shape: the active-workout
 * projection joins it into a comma string ("barbells, bench"), while other paths
 * keep the raw array. Normalize both (and null) to an array so conflict detection
 * never does `.filter` on a string (which silently threw and suppressed 1d).
 */
function toEquipmentArray(eq: unknown): string[] {
  if (Array.isArray(eq)) return eq as string[];
  if (typeof eq === "string") {
    return eq
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Flatten today's workout into {name, equipment[]} regardless of block/legacy shape. */
function flattenExercises(
  today: TodayWorkout | null
): { name: string; equipment: string[] }[] {
  if (!today) return [];
  const out: { name: string; equipment: string[] }[] = [];
  const anyToday = today as any;
  const push = (ex: any) => {
    const name = ex?.exercise?.name ?? ex?.name;
    const equipment = toEquipmentArray(ex?.exercise?.equipment ?? ex?.equipment);
    if (name) out.push({ name, equipment });
  };
  if (Array.isArray(anyToday.blocks)) {
    for (const block of anyToday.blocks) {
      for (const ex of block.exercises ?? []) push(ex);
    }
  } else if (Array.isArray(anyToday.exercises)) {
    for (const ex of anyToday.exercises) push(ex);
  }
  return out;
}

/**
 * Orchestrates the training-locations experience on the today card (1a–1d):
 * loads the user's places, tracks which one today's session is set to, opens the
 * picker, detects an equipment conflict against the planned exercises, and drives
 * either a no-op snapshot write or a rebuild.
 */
export function useTrainingLocations(args: {
  userId: number | undefined;
  todaysWorkout: TodayWorkout | null;
  planDayId: number | undefined;
  /**
   * Registers the rebuild's async job with the background-job context so the
   * global generation progress overlay shows and the dashboard refreshes on
   * completion — the same wiring the Adjust flow uses (addJob from
   * useBackgroundJobs). Without it the rebuild runs headless. Optional because
   * the Settings mount never rebuilds.
   */
  onRebuildJobCreated?: (jobId: number) => void | Promise<unknown>;
}) {
  const { userId, todaysWorkout, planDayId, onRebuildJobCreated } = args;

  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [conflict, setConflict] = useState<LocationConflict | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  // Optimistic override of the displayed name once the user picks a place this
  // session. Falls back to the day's saved snapshot, then the primary.
  const [chosen, setChosen] = useState<TrainingLocationSnapshot | null>(null);

  const primary = useMemo(
    () => locations.find((l) => l.isPrimary),
    [locations]
  );
  const secondaries = useMemo(
    () => locations.filter((l) => !l.isPrimary),
    [locations]
  );

  const daySnapshot =
    (todaysWorkout as any)?.locationSnapshot as
      | TrainingLocationSnapshot
      | null
      | undefined;

  const todayLocationName =
    chosen?.name ?? daySnapshot?.name ?? primary?.name ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const fresh = await getLocationsAPI(userId);
      setLocations(fresh);
      // Reconcile the optimistic pick: if the chosen SAVED place was deleted
      // (e.g. in Settings), drop it so the row falls back to the day snapshot /
      // primary rather than showing a place that no longer exists. One-offs
      // (locationId null) are left alone.
      setChosen((prev) =>
        prev &&
        prev.locationId != null &&
        !fresh.some((l) => l.id === prev.locationId)
          ? null
          : prev
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const openPicker = useCallback(() => {
    if (!userId) return;
    trackEvent(AnalyticsEvent.LOCATION_PICKER_OPENED);
    // Refetch on open — this hook has a separate instance on the dashboard vs
    // Settings, so a place added/removed in Settings would otherwise show stale
    // here. Cheap call; the sheet re-renders when it resolves.
    load();
    setPickerVisible(true);
  }, [userId, load]);

  /** Missing equipment + affected exercises for a candidate equipment set. */
  const computeConflict = useCallback(
    (equipment: string[]): { missing: string[]; affected: string[] } => {
      const have = new Set(equipment.map((e) => e.toLowerCase()));
      const missing = new Set<string>();
      const affected: string[] = [];
      for (const ex of flattenExercises(todaysWorkout)) {
        const needs = (ex.equipment ?? []).filter(
          (e) => e && !FREE_EQUIPMENT.has(e.toLowerCase())
        );
        const unmet = needs.filter((e) => !have.has(e.toLowerCase()));
        if (unmet.length > 0) {
          affected.push(ex.name);
          unmet.forEach((e) => missing.add(e));
        }
      }
      return { missing: [...missing], affected };
    },
    [todaysWorkout]
  );

  const persistSnapshot = useCallback(
    async (snapshot: TrainingLocationSnapshot) => {
      setChosen(snapshot);
      if (userId && planDayId) {
        await setPlanDayLocationAPI(userId, planDayId, snapshot);
      }
    },
    [userId, planDayId]
  );

  /**
   * Choose a place for today. Same-or-more equipment → just record it. Missing
   * equipment → raise the conflict for the dialog (§7); moving to a better place
   * never prompts.
   */
  const selectLocation = useCallback(
    async (snapshot: TrainingLocationSnapshot) => {
      setPickerVisible(false);
      trackEvent(AnalyticsEvent.LOCATION_CHOSEN, {
        kind:
          snapshot.locationId == null
            ? snapshot.environment === WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY
              ? "bodyweight"
              : "one_off"
            : snapshot.locationId === primary?.id
              ? "primary"
              : "saved",
      });
      const { missing, affected } = computeConflict(snapshot.equipment);
      if (missing.length > 0) {
        trackEvent(AnalyticsEvent.LOCATION_REBUILD_OFFERED, {
          missing_count: missing.length,
        });
        setConflict({ snapshot, missing, affectedExercises: affected });
        return;
      }
      await persistSnapshot(snapshot);
    },
    [computeConflict, persistSnapshot, primary?.id]
  );

  /** "Keep it as it is" (Rule 2): record where, leave the workout untouched. */
  const keepConflictWorkout = useCallback(async () => {
    if (!conflict) return;
    trackEvent(AnalyticsEvent.LOCATION_REBUILD_CHOICE, { choice: "keep" });
    await persistSnapshot(conflict.snapshot);
    setConflict(null);
  }, [conflict, persistSnapshot]);

  /** "Rebuild today's workout": regenerate around the new place's equipment. */
  const rebuildForConflict = useCallback(async () => {
    if (!conflict || !userId || !planDayId) return;
    trackEvent(AnalyticsEvent.LOCATION_REBUILD_CHOICE, { choice: "rebuild" });
    setRebuilding(true);
    try {
      setChosen(conflict.snapshot);
      const response = await regenerateDailyWorkoutAsync(userId, planDayId, {
        reason: `Rebuild today's workout for ${conflict.snapshot.name}, which has different equipment. Keep the same muscles and length.`,
        locationOverride: {
          environment: conflict.snapshot.environment,
          equipment: conflict.snapshot.equipment,
          snapshot: conflict.snapshot,
        },
      });
      // Register the job so the global generation progress overlay shows and the
      // dashboard refreshes on completion (same as the Adjust flow). Without
      // this the rebuild ran headless — "Rebuilding…" flashed and nothing else.
      // A null response means a paywall intercept (out of free adjustments).
      if (response?.success && response.jobId) {
        await onRebuildJobCreated?.(response.jobId);
      }
      setConflict(null);
    } finally {
      setRebuilding(false);
    }
  }, [conflict, userId, planDayId, onRebuildJobCreated]);

  return {
    // data
    locations,
    primary,
    secondaries,
    loading,
    todayLocationName,
    // picker (1b) + create (1c)
    pickerVisible,
    openPicker,
    closePicker: () => setPickerVisible(false),
    createVisible,
    openCreate: () => setCreateVisible(true),
    closeCreate: () => setCreateVisible(false),
    // selection
    selectLocation,
    // conflict (1d)
    conflict,
    rebuilding,
    keepConflictWorkout,
    rebuildForConflict,
    dismissConflict: () => setConflict(null),
    // misc
    reloadLocations: load,
  };
}
