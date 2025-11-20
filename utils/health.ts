import { Platform, AppState, Linking } from "react-native";
import AppleHealthKit, { HealthKitPermissions } from "react-native-health";
const HK: any = AppleHealthKit;
import {
  initialize,
  requestPermission,
  readRecords,
} from "react-native-health-connect";

export async function connectHealth(): Promise<boolean> {
  if (Platform.OS === "ios") {
    if (!HK || typeof HK.initHealthKit !== "function") {
      return false;
    }
    const available = await isHealthKitAvailable();
    if (!available) return false;
    const perms = HK?.Constants?.Permissions || {};
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          perms.Steps,
          perms.StepCount,
          perms.FlightsClimbed,
          perms.DistanceWalkingRunning,
        ].filter(Boolean),
        write: [perms.Steps].filter(Boolean),
      },
    };
    await new Promise<void>((resolve, reject) => {
      HK.initHealthKit(permissions, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const authorized = await new Promise<boolean>((resolve) => {
      if (typeof HK.getAuthStatus !== "function") return resolve(true);
      HK.getAuthStatus(permissions, (_err: any, results: any) => {
        const codes: number[] = results?.permissions?.write || [];
        // 2 = SharingAuthorized
        resolve(codes.some((c) => c === 2));
      });
    });
    return authorized;
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
    if (!HK || typeof HK.getDailyStepCountSamples !== "function") {
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
      HK.getDailyStepCountSamples(options, (error: any, res: any) => {
        if (error) reject(error);
        else resolve(res || []);
      });
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
  if (!HK || typeof HK.isAvailable !== "function") return false;
  return await new Promise<boolean>((resolve) => {
    HK.isAvailable((err: any, available: boolean) => {
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
