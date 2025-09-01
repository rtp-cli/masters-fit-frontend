import { API_URL } from "../config";
import { User, OnboardingData, AuthResponse } from "./types";
import * as SecureStore from "expo-secure-store";
import { logger } from "./logger";

/**
 * Get the JWT token from secure storage
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (typeof token === "string" || token === null) {
      return token;
    } else {
      logger.error("Unexpected token type retrieved from SecureStore", {
        token,
      });
      return null;
    }
  } catch (error) {
    logger.error("Error retrieving authentication token", {
      error: error instanceof Error ? error.message : String(error),
    });
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

  const startTime = Date.now();
  const method = options.method || "GET";

  try {
    logger.apiRequest(endpoint, method);

    const response = await fetch(url, config);
    const duration = Date.now() - startTime;

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[API] ${response.status} Error Response:`,
        JSON.stringify(errorData, null, 2)
      );
      logger.apiError(
        endpoint,
        {
          status: response.status,
          message: errorData.message || `HTTP error ${response.status}`,
          ...errorData,
        },
        method
      );
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    // Parse JSON response
    const data: T = await response.json();
    logger.apiRequest(endpoint, method, duration);
    return data;
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("HTTP error"))) {
      // Only log network/unexpected errors, not HTTP errors (already logged above)
      logger.apiError(endpoint, error, method);
    }
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
    const endpoint = `/profile/user/${userData.userId}`;
    console.log(
      "[API] Sending onboarding data to",
      endpoint,
      ":",
      JSON.stringify(userData, null, 2)
    );
    const result = await apiRequest<{ success: boolean; user?: User }>(
      endpoint,
      {
        method: "PUT",
        body: JSON.stringify(userData),
      }
    );
    console.log(
      "[API] Onboarding API response:",
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[API] Onboarding error details:", error);
    console.error("[API] Error message:", errorMessage);
    if (errorStack) console.error("[API] Error stack:", errorStack);

    // Try to extract more detailed error information
    if (error instanceof Error) {
      try {
        // If the error message contains JSON, try to parse it
        const errorMatch = error.message.match(/HTTP error (\d+)/);
        if (errorMatch) {
          console.error(`[API] HTTP Status Code: ${errorMatch[1]}`);
          console.error(
            "[API] This suggests a validation error. Check data format against backend schema."
          );
        }
      } catch (parseError) {
        console.error("[API] Could not parse error details:", parseError);
      }
    }

    return { success: false };
  }
}
