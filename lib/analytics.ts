import { apiRequest } from "./api";
import { logger } from "./logger";
import { Platform } from "react-native";

// ==================== Analytics API Types ====================

export interface VideoEngagementData {
  exercise_id: number;
  exercise_name: string;
  video_url: string;
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

export interface WorkoutCompletedData {
  workout_id: number;
  plan_day_id: number;
  duration: number;
  completion_percentage: number;
}

export interface OnboardingStartedData {
  // No fields needed - user_id comes from authentication
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
export async function trackVideoEngagement(data: VideoEngagementData): Promise<AnalyticsResponse> {
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
export async function trackAppOpened(data: AppOpenedData): Promise<AnalyticsResponse> {
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
export async function trackWorkoutAbandoned(data: WorkoutAbandonedData): Promise<AnalyticsResponse> {
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
export async function trackWorkoutStarted(data: WorkoutStartedData): Promise<AnalyticsResponse> {
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

/**
 * Track workout completed
 */
export async function trackWorkoutCompleted(data: WorkoutCompletedData): Promise<AnalyticsResponse> {
  try {
    return await apiRequest<AnalyticsResponse>("/analytics/workout-completed", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error("Failed to track workout completed", error as Error);
    throw error;
  }
}

/**
 * Track onboarding started
 */
export async function trackOnboardingStarted(data: OnboardingStartedData): Promise<AnalyticsResponse> {
  try {
    return await apiRequest<AnalyticsResponse>("/analytics/onboarding-started", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error("Failed to track onboarding started", error as Error);
    throw error;
  }
}

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