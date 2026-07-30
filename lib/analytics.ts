import { Platform } from "react-native";

import { apiRequest } from "./api";
import { logger } from "./logger";

// ==================== Analytics API Types ====================

/** Where the demo was opened from — carried on the "Video Link Opened" event
 *  so we can tell which surface drives demo usage. */
export type DemoSurface = "workout" | "calendar_scheduled" | "calendar_complete";

export interface VideoEngagementData {
  exercise_id: number;
  exercise_name: string;
  video_url: string;
  surface?: DemoSurface;
}

export interface AppOpenedData {
  app_version: string;
  platform: "ios" | "android" | "web";
}

export interface WorkoutAbandonedData {
  workout_id: number;
  plan_day_id: number;
  block_id: number;
  block_name: string;
}

export interface WorkoutStartedData {
  workout_id: number;
  plan_day_id: number;
  workout_name: string;
}

interface AnalyticsResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ==================== Analytics API Functions ====================

/**
 * Track video engagement event
 */
export async function trackVideoEngagement(
  data: VideoEngagementData,
): Promise<AnalyticsResponse> {
  try {
    return await apiRequest<AnalyticsResponse>("/analytics/video-engagement", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error("Failed to track video engagement", error as Error);
    throw error;
  }
}

/**
 * Track app session start
 */
export async function trackAppOpened(
  data: AppOpenedData,
): Promise<AnalyticsResponse> {
  try {
    return await apiRequest<AnalyticsResponse>("/analytics/app-opened", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error("Failed to track app session", error as Error);
    throw error;
  }
}

/**
 * Track workout abandonment
 */
export async function trackWorkoutAbandoned(
  data: WorkoutAbandonedData,
): Promise<AnalyticsResponse> {
  try {
    return await apiRequest<AnalyticsResponse>("/analytics/workout-abandoned", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error("Failed to track workout abandonment", error as Error);
    throw error;
  }
}

/**
 * Track workout started
 */
export async function trackWorkoutStarted(
  data: WorkoutStartedData,
): Promise<AnalyticsResponse> {
  try {
    return await apiRequest<AnalyticsResponse>("/analytics/workout-started", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error("Failed to track workout started", error as Error);
    throw error;
  }
}

// Note: workout-completed and onboarding-started previously had wrapper functions
// here that were never called (dead code). Removed 2026-07-11 (AN-03).
// Ownership today: onboarding completion is a client event (ONBOARDING_COMPLETED in
// lib/analytics-events.ts). Workout completion is server-authoritative and owned by
// the backend, which emits "Workout Completed" from logs.service — it is intentionally
// NOT a client event (see the note in lib/analytics-events.ts).

// ==================== Analytics Utilities ====================

export const AnalyticsUtils = {
  /**
   * Generate consistent session ID
   */
  generateSessionId: (): string => Date.now().toString(),
  /**
   * Detect platform consistently
   */
  getPlatform: (): "ios" | "android" | "web" => {
    if (Platform.OS === "ios") return "ios";
    if (Platform.OS === "android") return "android";
    return "web";
  },
};
