import { Platform, AppState } from "react-native";
import AppleHealthKit from "react-native-health";
import { initialize, requestPermission, readRecords } from "react-native-health-connect";

export async function connectHealth(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const permissions = {
      permissions: { read: [AppleHealthKit.Constants.Permissions.StepCount] },
    } as any;
    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const options = { startDate: start.toISOString() } as any;
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
