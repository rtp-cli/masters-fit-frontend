/**
 * Mixpanel Analytics Types for MastersFit
 * Comprehensive type definitions for fitness tracking analytics
 */

// ==================== Event Properties ====================

export interface VideoEngagementProperties {
  exercise_id: number;
  exercise_name: string;
  video_url: string;
}

export interface AppOpenedProperties {
  session_id: string;
  app_version: string;
  platform: "ios" | "android" | "web";
}

export interface WorkoutAbandonedProperties {
  workout_id: number;
  plan_day_id?: number;
  days_completed: number;
  exercises_completed: number;
  time_spent_minutes: number;
  progress_percentage: number;
  current_exercise?: string;
  current_block?: string;
}

// ==================== User Profile Types ====================

/**
 * Basic user profile properties for analytics identification
 */
export interface UserProfileProperties {
  $email: string;
  $name: string;
  uuid: string; // Analytics distinct_id
}

/**
 * Combined user profile for easier handling
 */
export interface UserProfile {
  // From User table
  uuid: string;
  email: string;
  name: string;
  emailVerified: boolean | null;
  createdAt: Date | null;
  needsOnboarding: boolean | null;

  // From Profile table (when available)
  age?: number;
  gender?: string;
  goals?: string[];
  limitations?: string[];
  fitnessLevel?: string;
  environment?: string;
  equipment?: string[];
  preferredStyles?: string[];
  availableDays?: string[];
  workoutDuration?: number;
  intensityLevel?: string;

  // Analytics metadata
  signup_source?: string;
  first_platform?: string;
  total_workouts_completed?: number;
  total_sessions?: number;
  last_login?: string;
}

// ==================== Context Interface ====================

export interface MixpanelContextType {
  isEnabled: boolean;

  // Event tracking methods
  trackVideoEngagement: (properties: VideoEngagementProperties) => void;
  trackAppOpened: (properties: AppOpenedProperties) => void;
  trackWorkoutAbandoned: (properties: WorkoutAbandonedProperties) => void;

  // Basic user management
  identifyUser: (userUuid: string) => void;
  setUserProfile: (properties: UserProfileProperties) => void;
  clearUserData: () => void;
}

// ==================== Utility Types ====================

/**
 * Platform detection for analytics
 */
export type Platform = "ios" | "android" | "web";
