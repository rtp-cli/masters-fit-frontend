import { API_URL } from "../config";
import { User, OnboardingData, AuthResponse } from "./types";
import * as SecureStore from "expo-secure-store";

/**
 * Get the JWT token from secure storage
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("token");
  } catch (error) {
    console.error("❌ Error retrieving token:", error);
    return null;
  }
}

// Helper function to make API requests
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  // Get the auth token
  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    console.log(`🔄 API Request: ${endpoint}`, {
      method: options.method || "GET",
      headers: config.headers,
    });

    const response = await fetch(url, config);

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ API Error: ${endpoint}`, {
        status: response.status,
        error: errorData,
      });
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    // Parse JSON response
    const data: T = await response.json();
    console.log(`✅ API Response: ${endpoint}`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Request Failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Check if a user with the given email exists
 */
export async function checkEmailAPI(email: string): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    console.error("Check email error:", error);
    return { success: false, error: "Failed to check email" };
  }
}

/**
 * Sign up a new user
 */
export async function signupAPI(params: {
  email: string;
  name: string;
}): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return { success: false, error: "Failed to sign up" };
  }
}

/**
 * Login with email
 */
export async function loginAPI(params: {
  email: string;
}): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Failed to login" };
  }
}

/**
 * Generate auth code
 */
export async function generateAuthCodeAPI(params: {
  email: string;
}): Promise<AuthResponse> {
  return await apiRequest<AuthResponse>("/auth/generate-auth-code", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Verify auth code
 */
export async function verifyAPI(params: {
  authCode: string;
}): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("Verify error:", error);
    return { success: false, error: "Failed to verify code" };
  }
}

/**
 * Complete user onboarding
 */
export async function completeOnboardingAPI(
  userData: OnboardingData
): Promise<{ success: boolean; user?: User }> {
  try {
    return await apiRequest<{ success: boolean; user?: User }>("/profile", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return { success: false };
  }
}
