import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { apiRequest } from "./api";

export type AppFeedbackCategory = "bug" | "idea" | "praise" | "other";
export type AppFeedbackNoteSource = "text" | "voice";

/**
 * Diagnostics attached when the user leaves the toggle on. Deliberately only
 * the fields the UI names — never workout content, health data, or profile.
 */
export interface FeedbackDiagnostics {
  appVersion: string;
  build: string;
  os: string;
  osVersion: string;
  device: string;
  locale: string;
  activePlanId: number | null;
  lastRoute: string | null;
}

/**
 * Local flag a `praise` submission sets. It does NOT prompt — the native
 * store-review sheet (expo-store-review) fires later, at an earned high point
 * (plan completed / streak milestone), gated on this flag. See SPEC §8.
 */
export const STORE_REVIEW_PENDING_KEY = "@store_review_pending";

/**
 * Per-draft idempotency key. Not security-sensitive — it only has to be
 * unique per draft so a retried send can't file a duplicate (the server
 * unique-indexes it). Math.random is sufficient; no crypto dependency needed.
 */
export function generateClientId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildDiagnostics(opts: {
  activePlanId: number | null;
  lastRoute: string | null;
}): FeedbackDiagnostics {
  const appVersion = Constants.expoConfig?.version || "unknown";
  const build =
    Platform.OS === "ios"
      ? String(Constants.expoConfig?.ios?.buildNumber ?? "unknown")
      : String(Constants.expoConfig?.android?.versionCode ?? "unknown");
  let locale = "unknown";
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale || "unknown";
  } catch {
    locale = "unknown";
  }
  return {
    appVersion,
    build,
    os: Platform.OS,
    osVersion: String(Device.osVersion ?? "unknown"),
    device: Device.modelName || "unknown",
    locale,
    activePlanId: opts.activePlanId,
    lastRoute: opts.lastRoute,
  };
}

/** Human summary shown beside the toggle — the real values, not a description. */
export function formatDiagnosticsSummary(d: FeedbackDiagnostics): string {
  const osLabel = d.os === "ios" ? "iOS" : d.os === "android" ? "Android" : d.os;
  return `Version ${d.appVersion} · ${d.device} · ${osLabel} ${d.osVersion}`;
}

export interface SubmitAppFeedbackParams {
  clientId: string;
  category: AppFeedbackCategory;
  message: string;
  noteSource: AppFeedbackNoteSource;
  diagnostics: FeedbackDiagnostics | null;
}

/**
 * Submit app feedback. The user is taken from the session on the server, never
 * sent here. Throws on failure so the screen can keep the draft and offer an
 * inline retry (the clientId makes that retry idempotent server-side).
 */
export async function submitAppFeedback(
  params: SubmitAppFeedbackParams
): Promise<{ feedbackId: number }> {
  const response = await apiRequest<{
    success: boolean;
    feedbackId?: number;
    error?: string;
  }>(`/feedback`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!response.success) {
    throw new Error(response.error || "Failed to send feedback");
  }
  return { feedbackId: response.feedbackId ?? 0 };
}

/** Mark that the user gave praise, so a later flow can request a store review. */
export async function markPraiseForStoreReview(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORE_REVIEW_PENDING_KEY,
      new Date().toISOString()
    );
  } catch {
    // Non-critical — a missed review prompt is not worth surfacing.
  }
}
