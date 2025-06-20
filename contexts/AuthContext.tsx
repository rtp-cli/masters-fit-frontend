import React, {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import {
  checkEmailExists,
  completeOnboarding as apiCompleteOnboarding,
  logout as apiLogout,
  getPendingUserId,
  signup as apiSignup,
  login as apiLogin,
  clearAllData,
  getCurrentUser,
  saveUserToSecureStorage,
} from "../lib/auth";
import { OnboardingData, User } from "@lib/types";
import * as SecureStore from "expo-secure-store";
import { colors } from "../lib/theme";

// Define the shape of our context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSigningUp: boolean;
  isGeneratingWorkout: boolean;
  setIsSigningUp: (value: boolean) => void;
  setUserData: (user: User | null) => void;
  setIsGeneratingWorkout: (value: boolean) => void;
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
      }
      return {
        success: result.success,
        needsOnboarding: result.needsOnboarding,
      };
    } catch (error) {
      console.error("Email check error:", error);
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
      return { success: result.success };
    } catch (error) {
      console.error("Signup error:", error);
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
      console.error("Login error:", error);
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
      const pendingUserId = await getPendingUserId();
      if (!pendingUserId) {
        throw new Error("User ID not found");
      }
      const result = await apiCompleteOnboarding({
        ...userData,
        userId: parseInt(pendingUserId),
      });
      if (result.success && result.user) {
        // Ensure needsOnboarding is set to false
        const updatedUser = {
          ...result.user,
          needsOnboarding: false,
        };
        setUser(updatedUser);
        await saveUserToSecureStorage(updatedUser);
        await SecureStore.deleteItemAsync("pendingEmail");
        await SecureStore.deleteItemAsync("pendingUserId");
        return true;
      }
      throw new Error("Onboarding API call failed");
    } catch (error) {
      console.error("Onboarding error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Log the user out
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await clearAllData();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data
  const setUserData = (userData: User | null) => {
    console.log("🔄 AuthContext - Setting user data:", userData);
    setUser(userData);
    // Also save to SecureStore to maintain consistency
    if (userData) {
      saveUserToSecureStorage(userData);
    }
  };

  // Create the context value object
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isSigningUp,
    isGeneratingWorkout,
    setIsSigningUp,
    setUserData,
    setIsGeneratingWorkout,
    checkEmail,
    signup,
    login,
    completeOnboarding,
    logout,
  };

  // Provide the context to children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.muted,
  },
});
