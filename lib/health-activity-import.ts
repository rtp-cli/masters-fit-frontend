import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { MAX_IMPORT_BATCH_CLIENT } from "@/constants/activities";
import { ACTIVITIES_CHANGED_EVENT } from "@/hooks/use-logged-activities";
import { tabEvents } from "@/lib/tab-events";
import { fetchWorkoutsBetween, getHealthConnection } from "@/utils/health";
import {
  type ImportCandidate,
  toImportCandidates,
} from "@/utils/health-activity-mapping";

import { importActivitiesAPI } from "./activities";

/**
 * Health activity import: walks, runs, rides… recorded on the user's watch
 * show up in their activity log without being logged by hand.
 *
 * Runs on app open and on every return to the foreground (see
 * components/health-activity-sync.tsx). Never in the background — that needs
 * HealthKit background delivery and a native build.
 *
 * Consent: the privacy policy promises an in-app notice before a material
 * change in how health data is used, and this is the first time workout data
 * is stored on our server. So the FIRST time there is something to import the
 * user is asked, and the answer is remembered. Settings has the switch.
 */

const PREF_KEY = "health_activity_import";
export type ImportPref = "on" | "off" | null;

/** How far back each sync looks. The server skips anything already seen. */
const LOOKBACK_DAYS = 3;
/** A foreground bounce shouldn't re-read HealthKit; once a minute is plenty. */
const MIN_INTERVAL_MS = 60 * 1000;

export async function getImportPref(): Promise<ImportPref> {
  try {
    const v = await AsyncStorage.getItem(PREF_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export async function setImportPref(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // best-effort, like the health connection flag
  }
}

/** Our own bundle id / package, so our write-backs are never re-imported. */
function ownSourceIds(): string[] {
  const cfg = Constants.expoConfig;
  return [cfg?.ios?.bundleIdentifier, cfg?.android?.package].filter(
    (v): v is string => !!v
  );
}

let inFlight = false;
let lastRunAt = 0;

export interface SyncOptions {
  /**
   * Asked once, the first time there is something to import and the user has
   * not decided yet. Resolve true to import (and keep importing).
   */
  confirm: (candidates: ImportCandidate[]) => Promise<boolean>;
  /** Skip the once-a-minute throttle (e.g. the user just flipped it on). */
  force?: boolean;
}

/** Returns how many activities were newly added. Never throws. */
export async function syncHealthActivities({
  confirm,
  force = false,
}: SyncOptions): Promise<number> {
  if (inFlight) return 0;
  if (!force && Date.now() - lastRunAt < MIN_INTERVAL_MS) return 0;
  inFlight = true;
  lastRunAt = Date.now();

  try {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return 0;
    if (!(await getHealthConnection())) return 0;
    const pref = await getImportPref();
    if (pref === "off") return 0;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (LOOKBACK_DAYS - 1));
    const workouts = await fetchWorkoutsBetween(start, new Date());
    const candidates = toImportCandidates(workouts, ownSourceIds());
    if (candidates.length === 0) return 0;

    if (pref === null) {
      const yes = await confirm(candidates);
      await setImportPref(yes);
      if (!yes) return 0;
    }

    let added = 0;
    for (let i = 0; i < candidates.length; i += MAX_IMPORT_BATCH_CLIENT) {
      const result = await importActivitiesAPI(
        candidates.slice(i, i + MAX_IMPORT_BATCH_CLIENT)
      );
      added += result.imported.length;
    }
    if (added > 0) tabEvents.emit(ACTIVITIES_CHANGED_EVENT);
    return added;
  } catch (error) {
    // A failed health read or a network blip must never surface — the walk
    // will come in on the next open.
    console.warn("[health-activity-import] sync failed:", error);
    return 0;
  } finally {
    inFlight = false;
  }
}
