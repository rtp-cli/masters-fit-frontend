import React, {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";
import {
  checkEmailExists,
  completeOnboarding as apiCompleteOnboarding,
  getPendingUserId,
  signup as apiSignup,
  login as apiLogin,
  clearAllData,
  getCurrentUser,
  saveUserToSecureStorage,
} from "../lib/auth";
import { invalidateActiveWorkoutCache } from "../lib/workouts";
import { OnboardingData, User } from "@lib/types";
import * as SecureStore from "expo-secure-store";
import { logger } from "../lib/logger";

type RegenerationType = "daily" | "weekly" | "repeat" | "initial";

// Define the shape of our context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSigningUp: boolean;
  isGeneratingWorkout: boolean;
  isPreloadingData: boolean;
  needsFullAppRefresh: boolean;
  currentRegenerationType: RegenerationType;
  setIsSigningUp: (value: boolean) => void;
  setUserData: (user: User | null) => void;
  setIsGeneratingWorkout: (
    value: boolean,
    regenerationType?: RegenerationType
  ) => void;
  setIsPreloadingData: (value: boolean) => void;
  setNeedsFullAppRefresh: (value: boolean) => void;
  triggerWorkoutReady: () => void;
  checkEmail: (
    email: string
  ) => Promise<{ success: boolean; needsOnboarding?: boolean }>;
  signup: (params: {
    email: string;
    name: string;
  }) => Promise<{ success: boolean }>;
  login: (params: { email: string }) => Promise<{ success: boolean }>;
  completeOnboarding: (userData: OnboardingData) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the AuthContext for use in hooks
export { AuthContext };

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Provider component that wraps the app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [isPreloadingData, setIsPreloadingData] = useState(false);
  const [needsFullAppRefresh, setNeedsFullAppRefresh] = useState(false);
  const [currentRegenerationType, setCurrentRegenerationType] =
    useState<RegenerationType>("initial");

  // Initialize user from secure storage on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = await getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check if the email exists in the system
  const checkEmail = async (email: string) => {
    setIsLoading(true);
    try {
      const result = await checkEmailExists(email);
      if (result.success && result.token) {
        // Store the token if it's returned
        await SecureStore.setItemAsync("token", result.token);
        logger.info("User authentication successful", {
          needsOnboarding: result.needsOnboarding,
        });
      }
      return {
        success: result.success,
        needsOnboarding: result.needsOnboarding,
      };
    } catch (error) {
      logger.error("Email check failed", { error: error });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up a new user
  const signup = async (params: { email: string; name: string }) => {
    setIsLoading(true);
    try {
      const result = await apiSignup(params);
      if (result.success) {
        logger.info("User signup successful", { name: params.name });
      }
      return { success: result.success };
    } catch (error) {
      logger.error("User signup failed", {
        error: error,
        name: params.name,
      });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Login an existing user
  const login = async (params: { email: string }) => {
    setIsLoading(true);
    try {
      const result = await apiLogin(params);
      return { success: result.success };
    } catch (error) {
      logger.error("User login failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Complete the onboarding process
  const completeOnboarding = async (
    userData: OnboardingData
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Use userId from userData, or fallback to pending storage or current user ID
      const userIdToUse =
        userData.userId || (await getPendingUserId()) || user?.id;
      if (!userIdToUse) {
        throw new Error("User ID not found");
      }
      const result = await apiCompleteOnboarding({
        ...userData,
        userId:
          typeof userIdToUse === "string" ? parseInt(userIdToUse) : userIdToUse,
      });
      if (result.success && result.profile) {
        // Get current user and update with needsOnboarding: false
        const currentUser = user || (await getCurrentUser());
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            needsOnboarding: false,
          };
          setUser(updatedUser);
          await saveUserToSecureStorage(updatedUser);
          await SecureStore.deleteItemAsync("pendingEmail");
          await SecureStore.deleteItemAsync("pendingUserId");

          logger.businessEvent("Onboarding completed", {
            userId: updatedUser.id,
            fitnessLevel: userData.fitnessLevel,
            goals: userData.goals?.length || 0,
          });

          return true;
        }
      }
      throw new Error("Onboarding API call failed");
    } catch (error) {
      logger.error("Onboarding failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Log the user out
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Clear workout cache before clearing other data
      logger.info("User logout initiated", { userId: user?.id });

      invalidateActiveWorkoutCache();
      await clearAllData();
      setUser(null);
    } catch (error) {
      logger.error("Logout failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data
  const setUserData = (userData: User | null) => {
    setUser(userData);
    // Also save to SecureStore to maintain consistency
    if (userData) {
      saveUserToSecureStorage(userData);
    }
  };

  // Update generating workout state with regeneration type
  const handleSetIsGeneratingWorkout = (
    value: boolean,
    regenerationType: RegenerationType = "initial"
  ) => {
    setIsGeneratingWorkout(value);
    if (value) {
      setCurrentRegenerationType(regenerationType);
      // Mark that we need a full app refresh after generation
      setNeedsFullAppRefresh(true);
    }
  };

  // Trigger workout ready flow (called when async job completes)
  const triggerWorkoutReady = () => {
    // Invalidate workout cache
    invalidateActiveWorkoutCache();
    // Trigger preloading data which will show warming up screen
    setIsPreloadingData(true);
    // This will trigger the full app refresh flow in _layout.tsx
    setNeedsFullAppRefresh(true);
  };

  // Create the context value object
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isSigningUp,
    isGeneratingWorkout,
    isPreloadingData,
    needsFullAppRefresh,
    currentRegenerationType,
    setIsSigningUp,
    setUserData,
    setIsGeneratingWorkout: handleSetIsGeneratingWorkout,
    setIsPreloadingData,
    setNeedsFullAppRefresh,
    triggerWorkoutReady,
    checkEmail,
    signup,
    login,
    completeOnboarding,
    logout,
  };

  // Provide the context to children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
