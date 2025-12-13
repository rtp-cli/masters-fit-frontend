import { Platform, AppState, Linking } from "react-native";
import BrokenHealthKit, { HealthKitPermissions } from "react-native-health";
import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AppleHealthKit = NativeModules.AppleHealthKit as typeof BrokenHealthKit;
if (Platform.OS === "ios") {
  AppleHealthKit.Constants = BrokenHealthKit.Constants;
}
import {
  initialize,
  requestPermission,
  readRecords,
} from "react-native-health-connect";

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
        ],
        write: [perms.Steps],
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
  if (Platform.OS === "ios") {
    if (
      !AppleHealthKit ||
      typeof AppleHealthKit.getHeartRateSamples !== "function"
    ) {
      return { max: null, avg: null };
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
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
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
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
