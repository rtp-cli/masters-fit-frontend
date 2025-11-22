import { Platform, AppState, Linking } from "react-native";
import BrokenHealthKit, { HealthKitPermissions } from "react-native-health";
import { NativeModules } from "react-native";

const AppleHealthKit = NativeModules.AppleHealthKit as typeof BrokenHealthKit;
AppleHealthKit.Constants = BrokenHealthKit.Constants;
import {
  initialize,
  requestPermission,
  readRecords,
} from "react-native-health-connect";

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
    AppleHealthKit.initHealthKit(permissions, (err) => {
      if (err) throw err;
    });
    return true;
  }
  await ensureHealthConnectInitialized();
  const granted = await requestPermission([
    { recordType: "Steps", accessType: "read" },
  ]);
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
