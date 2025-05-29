import { apiRequest } from "./api";
import { getCurrentUser } from "./auth";
// Types
export interface Profile {
  id: number;
  userId: number;
  email?: string;
  age?: number;
  height?: number;
  weight?: number;
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
  medicalNotes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UpdateProfileParams {
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  goals?: string[];
  limitations?: string[];
  fitnessLevel?: string;
  environment?: string[];
  equipment?: string[];
  workoutStyles?: string[];
  availableDays?: string[];
  preferredTime?: string;
  weeklyTarget?: number;
  workoutDuration?: number;
  intensityLevel?: number;
  medicalNotes?: string;
  aerobicLevel?: number;
  strengthLevel?: number;
  remindersEnabled?: boolean;
}

/**
 * Fetch the current user's profile
 */
export async function fetchUserProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not found");
    }

    const response = await apiRequest<{ success: boolean; profile: Profile }>(
      `/profile/${user.id}`
    );
    return response.profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(
  params: UpdateProfileParams
): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not found");
    }

    const response = await apiRequest<{ success: boolean; profile: Profile }>(
      `/profile/user/${user.id}`,
      {
        method: "PUT",
        body: JSON.stringify(params),
      }
    );
    return response.profile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}

/**
 * Get workout recommendation based on profile
 */
export function getWorkoutRecommendation(profile: Profile): {
  workoutType: string;
  intensity: string;
  frequency: number;
  duration: number;
} {
  // Default recommendation
  const defaultRecommendation = {
    workoutType: "Full Body",
    intensity: "Moderate",
    frequency: 3,
    duration: 45,
  };

  if (!profile) return defaultRecommendation;

  // Adjust based on fitness level
  let recommendation = { ...defaultRecommendation };

  if (profile.fitnessLevel === "beginner") {
    recommendation = {
      workoutType: "Full Body",
      intensity: "Light to Moderate",
      frequency: 3,
      duration: 30,
    };
  } else if (profile.fitnessLevel === "intermediate") {
    recommendation = {
      workoutType: "Split (Upper/Lower)",
      intensity: "Moderate",
      frequency: 4,
      duration: 45,
    };
  } else if (profile.fitnessLevel === "advanced") {
    recommendation = {
      workoutType: "Split (Push/Pull/Legs)",
      intensity: "High",
      frequency: 5,
      duration: 60,
    };
  }

  // Adjust based on goals
  if (profile.goals?.includes("weight_loss")) {
    recommendation.workoutType = "HIIT";
    recommendation.intensity = "High";
  } else if (profile.goals?.includes("muscle_gain")) {
    recommendation.workoutType = "Progressive Overload";
    recommendation.intensity = "Moderate to High";
  } else if (profile.goals?.includes("endurance")) {
    recommendation.workoutType = "Circuit Training";
    recommendation.duration = 60;
  }

  return recommendation;
}
