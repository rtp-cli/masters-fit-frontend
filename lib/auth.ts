import * as SecureStore from "expo-secure-store";
import { User, AuthResponse, OnboardingData } from "./types";
import {
  checkEmailAPI,
  completeOnboardingAPI,
  loginAPI,
  verifyAPI,
  signupAPI,
  generateAuthCodeAPI,
} from "./api";

// List of all keys used in SecureStore
const STORAGE_KEYS = [
  "token",
  "refreshToken",
  "user",
  "pendingEmail",
  "pendingUserId",
] as const;

// Authentication Functions

/**
 * Check if a user with the given email exists
 * If they do, return user data, otherwise indicate onboarding is needed
 */
export async function checkEmailExists(email: string): Promise<AuthResponse> {
  try {
    const data = await checkEmailAPI(email);
    return data;
  } catch (error) {
    console.error("Check email error:", error);
    return { success: false, error: "Failed to check email" };
  }
}

/**
 * Sign up a new user
 */
export async function signup(params: {
  email: string;
  name: string;
}): Promise<AuthResponse> {
  try {
    const data = await signupAPI(params);
    if (data.success && data.user?.id) {
      // Store user ID and email for verification
      await Promise.all([
        SecureStore.setItemAsync("pendingUserId", data.user.id.toString()),
        SecureStore.setItemAsync("pendingEmail", params.email),
      ]);
    }
    return data;
  } catch (error) {
    console.error("Signup error:", error);
    return { success: false, error: "Failed to sign up" };
  }
}

/**
 * Login an existing user
 */
export async function login(params: { email: string }): Promise<AuthResponse> {
  try {
    const data = await loginAPI(params);
    if (data.success && data.user?.id) {
      // Store user ID and email for verification
      await Promise.all([
        SecureStore.setItemAsync("pendingUserId", data.user.id.toString()),
        SecureStore.setItemAsync("pendingEmail", params.email),
      ]);
    }
    return data;
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Failed to login" };
  }
}

/**
 * Generate auth code
 */
export async function generateAuthCode(params: {
  email: string;
}): Promise<AuthResponse> {
  try {
    const data = await generateAuthCodeAPI(params);
    return data;
  } catch (error) {
    console.error("Generate auth code error:", error);
    return { success: false, error: "Failed to generate auth code" };
  }
}

/**
 * Verify auth code
 */
export async function verify(params: {
  authCode: string;
}): Promise<AuthResponse> {
  try {
    const data = await verifyAPI(params);
    if (data.success && data.token) {
      // Store the auth token and refresh token
      await SecureStore.setItemAsync("token", data.token);
      if (data.refreshToken) {
        await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      }
      if (data.user) {
        // Include needsOnboarding from the response in the user object
        const userWithOnboardingStatus = {
          ...data.user,
          needsOnboarding: data.needsOnboarding ?? false,
        };
        await SecureStore.setItemAsync(
          "user",
          JSON.stringify(userWithOnboardingStatus)
        );
      }
    } else {
      console.warn("[Auth] Verify failed or no token received");
    }
    return data;
  } catch (error) {
    console.error("Verify error:", error);
    return { success: false, error: "Failed to verify code" };
  }
}

/**
 * Complete user onboarding
 */
export async function completeOnboarding(
  userData: OnboardingData
): Promise<{ success: boolean; user?: User }> {
  try {
    const data = await completeOnboardingAPI(userData);

    if (data.success) {
      // Clean up stored data after successful onboarding
      await Promise.all([
        SecureStore.deleteItemAsync("pendingEmail"),
        SecureStore.deleteItemAsync("pendingUserId"),
      ]);
    }

    return data;
  } catch (error) {
    console.error("Onboarding error:", error);
    return { success: false };
  }
}

/**
 * Get pending email for onboarding
 */
export async function getPendingEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("pendingEmail");
  } catch (error) {
    console.error("Error retrieving pending email:", error);
    return null;
  }
}

/**
 * Get pending user ID for onboarding
 */
export async function getPendingUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("pendingUserId");
  } catch (error) {
    console.error("Error retrieving pending user ID:", error);
    return null;
  }
}

/**
 * Get the refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) {
      console.warn("[Auth] No refresh token found in storage");
    }
    return refreshToken;
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
}

/**
 * Get the current user from secure storage
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const userStr = await SecureStore.getItemAsync("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Save user data to secure storage
 */
export async function saveUserToSecureStorage(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync("user", JSON.stringify(user));
  } catch (error) {
    console.error("Error saving user:", error);
  }
}

/**
 * Log out the current user
 */
export async function logout(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync("token"),
      SecureStore.deleteItemAsync("refreshToken"),
      SecureStore.deleteItemAsync("user"),
      SecureStore.deleteItemAsync("pendingEmail"),
      SecureStore.deleteItemAsync("pendingUserId"),
    ]);
  } catch (error) {
    console.error("Logout error:", error);
  }
}

/**
 * Clear all stored data from SecureStore
 * This is used for debugging purposes to reset the app state
 */
export async function clearAllData(): Promise<void> {
  try {
    await Promise.all(
      STORAGE_KEYS.map((key) => SecureStore.deleteItemAsync(key))
    );
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

/**
 * Debug function to reset authentication state completely
 * This can help users who are stuck in an incorrect onboarding state
 */
export async function resetAuthState(): Promise<void> {
  try {
    await clearAllData();
  } catch (error) {
    console.error("Error resetting auth state:", error);
    throw error;
  }
}
