import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking,Platform } from "react-native";
import { NativeModules } from "react-native";
import BrokenHealthKit, { type HealthKitPermissions } from "react-native-health";
import {
  ExerciseType,
  getSdkStatus,
  initialize,
  insertRecords,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";

const AppleHealthKit = NativeModules.AppleHealthKit as typeof BrokenHealthKit;
if (Platform.OS === "ios") {
  AppleHealthKit.Constants = BrokenHealthKit.Constants;
}

export const HEALTH_CONNECTION_KEY = "health_connection_enabled";

export async function setHealthConnection(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      HEALTH_CONNECTION_KEY,
      enabled ? "true" : "false"
    );
  } catch {
    // Swallow storage errors to avoid breaking UX; connection state is best-effort
  }
}

export async function getHealthConnection(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HEALTH_CONNECTION_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function clearHealthConnection(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HEALTH_CONNECTION_KEY);
  } catch {
    // ignore cleanup errors
  }
}

/**
 * [LR-026] Thrown when Health Connect can't be used on this Android device —
 * the Health Connect app isn't installed, or its provider needs a Play-store
 * update. Carries a user-facing `message` (callers already surface `err.message`
 * gracefully) plus a machine-readable `reason`. Replaces the previous behavior
 * where requesting permissions with no availability check would crash rather
 * than degrade.
 */
export class HealthConnectUnavailableError extends Error {
  reason: "unavailable" | "update-required";
  constructor(reason: "unavailable" | "update-required") {
    super(
      reason === "update-required"
        ? "Health Connect needs an update from the Play Store before it can sync your health data."
        : "Health Connect isn't set up on this device. Install it from the Play Store to sync your health data."
    );
    this.name = "HealthConnectUnavailableError";
    this.reason = reason;
  }
}

/**
 * [LR-026] Health Connect SDK availability (Android only). Returns
 * "not-supported" on non-Android so callers can branch without a Platform
 * check. Never throws — a missing native module resolves to "unavailable".
 */
export async function getHealthConnectStatus(): Promise<
  "available" | "unavailable" | "update-required" | "not-supported"
> {
  if (Platform.OS !== "android") return "not-supported";
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return "available";
    if (
      status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
    ) {
      return "update-required";
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function connectHealth(): Promise<boolean> {
  if (Platform.OS === "ios") {
    if (!AppleHealthKit) {
      throw new Error(
        "HealthKit unavailable. Build and run a custom dev client (expo run:ios)."
      );
    }
    const available = await isHealthKitAvailable();
    if (!available) throw new Error("HealthKit not available on this device.");
    const perms = AppleHealthKit?.Constants?.Permissions || {};
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          perms.StepCount,
          perms.Steps,
          perms.FlightsClimbed,
          perms.DistanceWalkingRunning,
          perms.HeartRate,
          perms.ActiveEnergyBurned,
          perms.Workout,
          perms.EnergyConsumed,
        ],
        // Write access powers MastersFit+ workout sync (saveWorkout on
        // completion). Requested up front so "Update Permissions" in settings
        // heals users who connected before writes existed.
        write: [perms.Workout, perms.ActiveEnergyBurned],
      },
    };

    const granted = await new Promise<boolean>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });

    if (granted) {
      await setHealthConnection(true);
    }
    return granted;
  }
  await ensureHealthConnectInitialized();
  const granted = await requestPermission([
    { recordType: "Steps", accessType: "read" },
    { recordType: "HeartRate", accessType: "read" },
    { recordType: "ExerciseSession", accessType: "read" },
    { recordType: "ActiveCaloriesBurned", accessType: "read" },
    { recordType: "TotalCaloriesBurned", accessType: "read" },
    { recordType: "Nutrition", accessType: "read" },
    { recordType: "ExerciseSession", accessType: "write" },
  ]);
  if (granted) {
    await setHealthConnection(true);
  }
  return !!granted;
}

let hcInitialized = false;

export async function ensureHealthConnectInitialized(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (hcInitialized) return;
  await new Promise<void>((resolve) => {
    if (AppState.currentState === "active") return resolve();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        sub.remove();
        resolve();
      }
    });
  });
  // [LR-026] Check availability BEFORE initialize()/requestPermission — on a
  // device without Health Connect (or one needing a provider update) those
  // native calls would otherwise throw opaquely / crash. Throw a clean, typed
  // error the UI already surfaces gracefully instead.
  const status = await getHealthConnectStatus();
  if (status !== "available") {
    throw new HealthConnectUnavailableError(
      status === "update-required" ? "update-required" : "unavailable"
    );
  }
  await initialize();
  await new Promise((r) => setTimeout(r, 200));
  hcInitialized = true;
}

export async function fetchStepsToday(): Promise<number> {
  if (Platform.OS === "ios") {
    if (
      !AppleHealthKit ||
      typeof AppleHealthKit.getDailyStepCountSamples !== "function"
    ) {
      return 0;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    } as any;
    const results: any[] = await new Promise((resolve, reject) => {
      AppleHealthKit.getDailyStepCountSamples(
        options,
        (error: any, res: any) => {
          if (error) reject(error);
          else resolve(res || []);
        }
      );
    });
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    const total = results.reduce((sum: number, item: any) => {
      const sd = new Date(item.startDate);
      return sd.getFullYear() === y && sd.getMonth() === m && sd.getDate() === d
        ? sum + (item.value ?? 0)
        : sum;
    }, 0);
    return total || (results[0]?.value ?? 0) || 0;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const resp = await readRecords("Steps", {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  const total = (resp?.records || []).reduce(
    (sum: number, r: any) => sum + (r.count ?? 0),
    0
  );
  return total;
}

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  if (!AppleHealthKit) return false;
  return await new Promise<boolean>((resolve) => {
    AppleHealthKit.isAvailable((err: any, available: boolean) => {
      if (err) resolve(false);
      else resolve(!!available);
    });
  });
}

export function openHealthApp(): void {
  if (Platform.OS === "ios") {
    Linking.openURL("x-apple-health://");
  }
}

export async function fetchHeartRateSamples(): Promise<{
  max: number | null;
  avg: number | null;
}> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return fetchHeartRateForWindow(start, new Date());
}

/**
 * Heart-rate stats for an arbitrary time window (e.g. a workout session).
 * Returns nulls when there are no samples or the native module is missing —
 * callers treat health data as best-effort.
 */
export async function fetchHeartRateForWindow(
  start: Date,
  end: Date
): Promise<{
  max: number | null;
  avg: number | null;
}> {
  if (Platform.OS === "ios") {
    if (
      !AppleHealthKit ||
      typeof AppleHealthKit.getHeartRateSamples !== "function"
    ) {
      return { max: null, avg: null };
    }
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    } as any;
    const results: any[] = await new Promise((resolve, reject) => {
      AppleHealthKit.getHeartRateSamples(options, (error: any, res: any) => {
        if (error) reject(error);
        else resolve(res || []);
      });
    });
    if (results.length === 0) return { max: null, avg: null };
    const values = results.map((item) => item.value);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return { max, avg };
  }
  await ensureHealthConnectInitialized();
  const resp = await readRecords("HeartRate", {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  const values = (resp?.records || []).map((r: any) => r.value);
  if (values.length === 0) return { max: null, avg: null };
  const max = Math.max(...values);
  const avg =
    values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
  return { max, avg };
}

export async function fetchCaloriesToday(): Promise<number | null> {
  if (Platform.OS === "ios") {
    if (
      !AppleHealthKit ||
      typeof AppleHealthKit.getActiveEnergyBurned !== "function"
    ) {
      return null;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    } as any;
    const results: any[] = await new Promise((resolve, reject) => {
      AppleHealthKit.getActiveEnergyBurned(options, (error: any, res: any) => {
        if (error) reject(error);
        else resolve(res || []);
      });
    });
    const total = results.reduce(
      (sum: number, item: any) => sum + (item.value ?? 0),
      0
    );
    return total || null;
  }
  await ensureHealthConnectInitialized();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const resp = await readRecords("ActiveCaloriesBurned", {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  const records = (resp as any)?.records ?? (resp as any)?.result ?? [];
  const total = records.reduce((sum: number, r: any) => {
    const e = r.energy;
    let kcal = 0;
    if (e) {
      if (typeof e.inKilocalories === "number") kcal = e.inKilocalories;
      else if (typeof e.inCalories === "number") kcal = e.inCalories / 1000;
      else if (typeof e.value === "number") kcal = e.value;
    }
    return sum + kcal;
  }, 0);
  return total || null;
}

export async function fetchWorkoutDuration(): Promise<number | null> {
  if (Platform.OS === "ios") {
    if (
      !AppleHealthKit ||
      typeof AppleHealthKit.getAnchoredWorkouts !== "function"
    ) {
      return null;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    } as any;
    const results: any[] = await new Promise((resolve, reject) => {
      AppleHealthKit.getAnchoredWorkouts(options, (error: any, res: any) => {
        if (error) reject(error);
        else resolve(res || []);
      });
    });
    const total = results.reduce((sum: number, item: any) => {
      return sum + (item.duration ?? 0) / 60;
    }, 0);
    return total || null;
  }
  await ensureHealthConnectInitialized();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const resp = await readRecords("ExerciseSession", {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  const total = (resp?.records || []).reduce((sum: number, r: any) => {
    const duration =
      new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
    return sum + duration / 60000;
  }, 0);
  return total || null;
}

export async function fetchNutritionCaloriesToday(): Promise<number | null> {
  if (Platform.OS === "ios") {
    if (
      !AppleHealthKit ||
      typeof AppleHealthKit.getEnergyConsumedSamples !== "function"
    ) {
      return null;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    } as any;
    const results: any[] = await new Promise((resolve, reject) => {
      AppleHealthKit.getEnergyConsumedSamples(
        options,
        (error: any, res: any) => {
          if (error) reject(error);
          else resolve(res || []);
        }
      );
    });
    const total = results.reduce(
      (sum: number, item: any) => sum + (item.value ?? 0),
      0
    );
    return total || null;
  }
  await ensureHealthConnectInitialized();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const resp = await readRecords("Nutrition", {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  const records = (resp as any)?.records ?? (resp as any)?.result ?? [];
  const total = records.reduce((sum: number, r: any) => {
    const e = r.energy;
    let kcal = 0;
    if (e) {
      if (typeof e.inKilocalories === "number") kcal = e.inKilocalories;
      else if (typeof e.inCalories === "number") kcal = e.inCalories / 1000;
      else if (typeof e.value === "number") kcal = e.value;
    }
    return sum + kcal;
  }, 0);
  return total;
}

/**
 * Whether any heart-rate sample landed in the health store recently. Used as
 * a proxy for "a watch workout is (or was just) recording" — during an active
 * watch workout samples stream near-continuously, otherwise they arrive every
 * several minutes at best. Best-effort: any failure reads as "has samples" so
 * callers never nag when we simply can't tell.
 */
export async function hasRecentHeartRateSample(
  windowMinutes: number = 5
): Promise<boolean> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - windowMinutes * 60_000);
    const { max } = await fetchHeartRateForWindow(start, end);
    return max !== null;
  } catch {
    return true;
  }
}

/**
 * Save a completed MastersFit session to the platform health store as a
 * strength-training workout (MastersFit+ sync). Returns false instead of
 * throwing — a denied write permission or missing native module must never
 * disturb the completion flow. Requires the write grants requested by
 * connectHealth(); users connected before writes existed heal via
 * "Update Permissions" in settings.
 */
export async function writeWorkoutToHealth(session: {
  startDate: Date;
  endDate: Date;
  caloriesBurned?: number;
}): Promise<boolean> {
  try {
    if (Platform.OS === "ios") {
      if (!AppleHealthKit || typeof AppleHealthKit.saveWorkout !== "function") {
        return false;
      }
      const options = {
        type:
          AppleHealthKit.Constants?.Activities?.FunctionalStrengthTraining ||
          "FunctionalStrengthTraining",
        startDate: session.startDate.toISOString(),
        endDate: session.endDate.toISOString(),
        ...(session.caloriesBurned
          ? {
              energyBurned: session.caloriesBurned,
              energyBurnedUnit: "calorie",
            }
          : {}),
      } as any;
      return await new Promise<boolean>((resolve) => {
        AppleHealthKit.saveWorkout(options, (err: any) => resolve(!err));
      });
    }
    await ensureHealthConnectInitialized();
    await insertRecords([
      {
        recordType: "ExerciseSession",
        exerciseType: ExerciseType.STRENGTH_TRAINING,
        title: "MastersFit Workout",
        startTime: session.startDate.toISOString(),
        endTime: session.endDate.toISOString(),
      },
    ]);
    return true;
  } catch {
    return false;
  }
}
