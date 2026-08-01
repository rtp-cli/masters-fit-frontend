import * as SecureStore from "expo-secure-store";

import { API_URL } from "../config";
import { logger } from "./logger";
import { type AuthResponse,type OnboardingData, type User } from "./types";

// Callback for handling waiver redirects (set by WaiverContext)
let waiverRedirectCallback: (() => void) | null = null;

// Callback for handling auth failures (set by AuthContext)
let authFailureCallback: (() => void) | null = null;

// Callback for handling paywall (set by PaywallContext or component)
let paywallCallback:
  | ((paywallData: { type: string; message: string; limits: any }) => void)
  | null = null;

export function setPaywallCallback(
  callback: (paywallData: {
    type: string;
    message: string;
    limits: any;
  }) => void
) {
  paywallCallback = callback;
}

// Race condition protection for refresh token
let refreshInProgress = false;

// Admin impersonation state. While an admin is viewing the app as another user,
// the stored token is a short-lived, refresh-token-less impersonation token.
// When it expires we must NOT run the normal refresh/logout funnel (that would
// dump the admin out of their own account); instead we exit impersonation and
// drop back to the admin session. AuthContext registers the exit handler.
let impersonating = false;
let impersonationExpiredCallback: (() => void | Promise<void>) | null = null;

export function setImpersonating(value: boolean) {
  impersonating = value;
}

export function setImpersonationExpiredCallback(
  callback: (() => void | Promise<void>) | null
) {
  impersonationExpiredCallback = callback;
}

// Custom error class for paywall errors
export class PaywallError extends Error {
  public paywallData: {
    type: string;
    message: string;
    limits: any;
  };

  constructor(
    message: string,
    paywallData: { type: string; message: string; limits: any }
  ) {
    super(message);
    this.name = "PaywallError";
    this.paywallData = paywallData;
  }
}

export function setWaiverRedirectCallback(callback: () => void) {
  waiverRedirectCallback = callback;
}

export function setAuthFailureCallback(callback: () => void) {
  authFailureCallback = callback;
}

/**
 * Test helper to simulate waiver requirement detection
 * @param errorData - Simulated error response data
 * @param statusCode - HTTP status code to test
 * @returns true if waiver detection would be triggered
 */
export function testWaiverDetection(
  errorData: any,
  statusCode: number
): boolean {
  const isWaiverError =
    statusCode === 426 || // Explicit waiver status
    statusCode === 403 || // Forbidden - might be waiver-related
    statusCode === 428 || // Precondition Required
    (errorData.message &&
      /waiver|liability|acceptance required/i.test(errorData.message)) ||
    (errorData.error &&
      /waiver|liability|acceptance required/i.test(errorData.error)) ||
    errorData.code === "WAIVER_REQUIRED" ||
    errorData.type === "WAIVER_ERROR";

  console.log("[TEST] Waiver detection result:", {
    statusCode,
    errorData,
    isWaiverError,
  });

  return isWaiverError;
}

async function handleAuthFailure(): Promise<void> {
  if (authFailureCallback) {
    try {
      // Let AuthContext handle everything: cache clear, data clear, state, redirect
      authFailureCallback();
    } catch (error) {
      console.error("[API] Error triggering AuthContext logout:", error);
    }
  } else {
    console.error("[API] No auth callback registered!");
  }
}

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

/**
 * Get the refresh token from secure storage
 */
async function getRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    return refreshToken;
  } catch (error) {
    console.error("[TOKEN_REFRESH] Error retrieving refresh token:", error);
    return null;
  }
}

/**
 * Refresh the access token using the stored refresh token.
 *
 * Outcomes are deliberately three-way — only "invalid" may end the session:
 * - "refreshed": new tokens stored, retry the original request
 * - "invalid":   the server rejected the refresh token (401/403) or we have
 *                none stored — the session is genuinely dead
 * - "transient": network error, timeout, or a 5xx from /auth/refresh — the
 *                session is fine; fail THIS request and leave the user
 *                logged in. Treating these as fatal logged users out on a
 *                single network blip mid-flow.
 */
type RefreshOutcome = "refreshed" | "invalid" | "transient";

let lastRefreshOutcome: RefreshOutcome = "transient";

async function refreshAccessToken(): Promise<RefreshOutcome> {
  const startTime = Date.now();

  // Prevent concurrent refresh attempts
  if (refreshInProgress) {
    // Wait for the current refresh to complete and share its outcome —
    // checking "does a token exist" here was wrong: the OLD token still
    // exists after a failed refresh, so waiters retried with a dead token.
    while (refreshInProgress) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return lastRefreshOutcome;
  }

  refreshInProgress = true;

  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      lastRefreshOutcome = "invalid";
      return lastRefreshOutcome;
    }

    // Make refresh request directly (avoid recursion by not using apiRequest)
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(
        "[TOKEN_REFRESH] Refresh failed:",
        response.status,
        errorData
      );
      // Only an explicit auth rejection kills the session; a 5xx/429 from
      // the refresh endpoint is the server's problem, not the session's.
      lastRefreshOutcome =
        response.status === 401 || response.status === 403
          ? "invalid"
          : "transient";
      return lastRefreshOutcome;
    }

    const data = await response.json();

    if (!data.success || !data.token || !data.refreshToken) {
      console.log(
        "[TOKEN_REFRESH] Refresh response missing required fields:",
        data
      );
      lastRefreshOutcome = "transient";
      return lastRefreshOutcome;
    }

    await Promise.all([
      SecureStore.setItemAsync("token", data.token),
      SecureStore.setItemAsync("refreshToken", data.refreshToken),
    ]);
    lastRefreshOutcome = "refreshed";
    return lastRefreshOutcome;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[TOKEN_REFRESH] Refresh failed after ${duration}ms:`, error);
    lastRefreshOutcome = "transient";
    return lastRefreshOutcome;
  } finally {
    refreshInProgress = false;
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

  // Build headers - ensure Authorization is not overridden by options.headers
  const baseHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Add Authorization header if token exists
  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  // Merge with options.headers, but ensure Authorization takes precedence
  const headers: HeadersInit = {
    ...baseHeaders,
    ...options.headers,
    // Always use our Authorization header if we have a token
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  const startTime = Date.now();
  const method = options.method || "GET";

  // Endpoints that poll on an interval — skip per-request logging to avoid noise
  const isNoisyEndpoint = endpoint.startsWith("/auth/waiver-status");

  try {
    if (!isNoisyEndpoint) {
      logger.apiRequest(endpoint, method);

      // Log auth token presence for debugging (don't log the actual token)
      if (__DEV__) {
        const authHeader = (headers as Record<string, string>).Authorization;
        console.log(
          `[API] ${method} ${endpoint} - Token present: ${!!token}, Has Auth header: ${!!authHeader}`
        );
      }
    }

    const response = await fetch(url, config);
    const duration = Date.now() - startTime;

    // Handle HTTP errors
    if (!response.ok) {
      let errorData = await response.json().catch(() => ({}));

      // Debug: Log the raw error response
      if (__DEV__ && response.status === 403) {
        console.log(
          "[PAYWALL] Raw 403 error response:",
          JSON.stringify(errorData, null, 2)
        );
      }

      // Handle double-encoded JSON in error responses
      if (errorData.error && typeof errorData.error === "string") {
        try {
          // Try to parse the error string as JSON
          const parsedError = JSON.parse(errorData.error);
          // Use the parsed error data instead
          errorData = parsedError;
        } catch (parseError) {
          // If parsing fails, keep the original error string
          console.warn(
            "[API] Error field is string but not valid JSON:",
            errorData.error
          );
        }
      }

      // Handle waiver update required (HTTP 426)
      if (response.status === 426) {
        logger.info("Waiver enforcement intercepted", {
          operation: "apiRequest",
          metadata: endpoint,
        });

        // Redirect to waiver screen using callback
        if (waiverRedirectCallback) {
          setTimeout(() => {
            waiverRedirectCallback!();
          }, 100); // Small delay to ensure current operation completes
        }
      }

      // Handle paywall (HTTP 403 with paywall info) - check before waiver
      // Accept any paywall type (subscription_required, weekly_limit_exceeded, daily_limit_exceeded, etc.)
      const isPaywallError =
        response.status === 403 &&
        errorData.paywall &&
        typeof errorData.paywall === "object" &&
        errorData.paywall.type &&
        errorData.paywall.message;

      if (isPaywallError) {
        console.log("[PAYWALL] Paywall error detected:", {
          endpoint,
          status: response.status,
          paywallData: errorData.paywall,
          hasCallback: !!paywallCallback,
        });

        logger.info("Paywall requirement detected from error response", {
          operation: "apiRequest",
          metadata: {
            endpoint,
            status: response.status,
            paywallType: errorData.paywall?.type,
            limits: errorData.paywall?.limits,
          },
        });

        // Trigger paywall callback with paywall data synchronously
        if (paywallCallback && errorData.paywall) {
          const paywallData = {
            type: errorData.paywall.type,
            message: errorData.paywall.message,
            limits: errorData.paywall.limits || {},
          };

          console.log(
            "[PAYWALL] Triggering paywall callback with data:",
            paywallData
          );
          try {
            paywallCallback(paywallData);
            console.log("[PAYWALL] Paywall callback executed successfully");
          } catch (callbackError) {
            console.error(
              "[PAYWALL] Error in paywall callback:",
              callbackError
            );
          }
        } else {
          console.warn(
            "[PAYWALL] No paywall callback registered or missing paywall data"
          );
        }

        // Throw PaywallError instead of generic error - this will skip all error logging below
        throw new PaywallError(
          errorData.message || errorData.error || "Subscription required",
          {
            type: errorData.paywall.type,
            message: errorData.paywall.message,
            limits: errorData.paywall.limits || {},
          }
        );
      }

      // Enhanced waiver detection for other status codes and error messages.
      // Excludes paywall (handled above) AND 426 (handled above, its own
      // dedicated branch) — [LR-045] found via testing: a 426 whose error
      // message happens to mention "waiver" (a very likely message for that
      // exact status) matched this OR-condition too, firing
      // waiverRedirectCallback a second time for the same response.
      // A read-only impersonation 403 (a write attempted while "viewing as"
      // another user) is NOT a waiver problem — but it's a non-paywall 403, so
      // the heuristic below (which treats any 403 as possibly-waiver) would
      // otherwise bounce us to the waiver screen. Exclude it via both the
      // session flag AND a message sentinel: the flag covers the live session,
      // the sentinel covers the exit-window race where a stale impersonation-
      // token request lands just after the flag flips off. (The backend skips
      // waiver validation entirely while impersonating, so no real waiver 403s
      // occur in this state — excluding them is safe.)
      const isImpersonationReadOnly =
        response.status === 403 &&
        (impersonating ||
          /read-only session|impersonation/i.test(errorData.error || "") ||
          /read-only session|impersonation/i.test(errorData.message || ""));

      // The backend signals a real waiver requirement with a dedicated 426
      // (handled above) — never a bare 403. A 403 is either a paywall (handled
      // above) or a genuine authorization "Forbidden" (e.g. a cross-user request
      // during an identity switch). Treating any 403 as possibly-waiver caused
      // spurious bounces to the waiver screen, so we now require an explicit
      // waiver signal (message/code) rather than the raw status.
      const isWaiverError =
        !isPaywallError &&
        !isImpersonationReadOnly &&
        response.status !== 426 &&
        (response.status === 428 || // Precondition Required
          (errorData.message &&
            /waiver|liability|acceptance required/i.test(errorData.message)) ||
          (errorData.error &&
            /waiver|liability|acceptance required/i.test(errorData.error)) ||
          errorData.code === "WAIVER_REQUIRED" ||
          errorData.type === "WAIVER_ERROR");

      if (isWaiverError) {
        logger.info("Waiver requirement detected from error response", {
          operation: "apiRequest",
          metadata: {
            endpoint,
            status: response.status,
            errorMessage: errorData.message,
            errorCode: errorData.code,
          },
        });

        // Redirect to waiver screen using callback
        if (waiverRedirectCallback) {
          setTimeout(() => {
            waiverRedirectCallback!();
          }, 100);
        }
      }

      // Handle unauthorized (HTTP 401) - try refresh before logout
      // Skip auto-refresh for /auth/verify endpoint - 401 here means invalid auth code, not expired token
      // A 401 on a request we already retried after a refresh gets no second
      // refresh (prevents a refresh loop) and no logout (the fresh token was
      // just accepted by /auth/refresh — this 401 is the endpoint's problem).
      if (
        response.status === 401 &&
        endpoint !== "/auth/verify" &&
        !(options as { __isRetryAfterRefresh?: boolean }).__isRetryAfterRefresh
      ) {
        // Impersonating: a 401 means the read-only impersonation token expired.
        // Do NOT refresh or log out (that would end the ADMIN's own session).
        // Exit impersonation, restoring the admin, and fail just this request.
        if (impersonating) {
          console.log(
            `[API] 401 while impersonating on ${endpoint} — token expired, exiting impersonation`
          );
          try {
            await impersonationExpiredCallback?.();
          } catch (e) {
            console.error("[API] Error exiting impersonation on 401:", e);
          }
          throw new Error("Impersonation session expired");
        }

        // Even with no readable access token, a stored refresh token can
        // rescue the session — instant logout here killed sessions whose
        // token read failed (e.g. keychain unavailable for a background poll).
        console.log(
          `[API] 401 Unauthorized for ${endpoint} (token present: ${!!token}), attempting token refresh...`
        );
        const refreshOutcome = await refreshAccessToken();

        if (refreshOutcome === "refreshed") {
          // Get the new token after refresh
          const newToken = await getAuthToken();
          console.log(
            `[API] Token refreshed successfully, retrying ${endpoint} with new token`
          );

          if (!newToken) {
            // Tokens were just written; an unreadable store here is a device
            // storage hiccup, not a dead session. Fail the request only.
            console.error(
              `[API] Token refresh reported success but no token found!`
            );
            throw new Error("Temporary authentication problem - please retry");
          }

          // Retry the original request with the new token
          // Create new options to ensure fresh headers with new token
          const retryBaseHeaders: HeadersInit = {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${newToken}`,
          };

          const retryOptions: RequestInit & {
            __isRetryAfterRefresh?: boolean;
          } = {
            ...options,
            headers: {
              ...retryBaseHeaders,
              // Merge with any existing headers from options, but Authorization takes precedence
              ...(options.headers || {}),
              Authorization: `Bearer ${newToken}`, // Ensure new token is used
            },
            __isRetryAfterRefresh: true,
          };

          const retryStartTime = Date.now();
          const retryResponse = await apiRequest<T>(endpoint, retryOptions);
          const retryDuration = Date.now() - retryStartTime;
          console.log(
            `[API] Retry successful for ${endpoint} after ${retryDuration}ms`
          );

          return retryResponse;
        } else if (refreshOutcome === "invalid") {
          // The server explicitly rejected the refresh token — session over.
          console.error(`[API] Refresh token rejected for ${endpoint}`);
          await handleAuthFailure();
          throw new Error("Session expired - user logged out");
        } else {
          // Transient refresh failure (network blip, refresh endpoint 5xx):
          // fail this request, keep the session. The next request retries.
          console.warn(
            `[API] Token refresh temporarily unavailable for ${endpoint}, keeping session`
          );
          throw new Error("Temporary authentication problem - please retry");
        }
      }

      // If we reach here, it's not a paywall, waiver, or 401 error
      // Log and throw the error
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
      // Prefer the server's own message; some endpoints send `error`, others
      // `message`. Attach the status so callers can branch (e.g. 429) without
      // string-matching. Additive — existing callers reading `.message` are
      // unaffected.
      const httpError = new Error(
        errorData.message ||
          errorData.error ||
          `HTTP error ${response.status}`
      ) as Error & { status?: number };
      httpError.status = response.status;
      throw httpError;
    }

    // Parse JSON response
    const data: T = await response.json();
    if (!isNoisyEndpoint) {
      logger.apiRequest(endpoint, method, duration);
    }
    return data;
  } catch (error) {
    // Don't log PaywallErrors - they're handled by the paywall modal
    if (error instanceof PaywallError) {
      throw error; // Re-throw without logging
    }

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
 * Refresh access token using refresh token
 */
export async function refreshTokenAPI(params: {
  refreshToken: string;
}): Promise<AuthResponse> {
  try {
    // Use direct fetch to avoid recursion with apiRequest's 401 handling
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Opportunistically refresh the user's persisted timezone on every token
      // refresh (i.e. when the app comes back). Backend stores it best-effort.
      body: JSON.stringify({
        ...params,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.message || "Refresh failed" };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Refresh token error:", error);
    return { success: false, error: "Failed to refresh token" };
  }
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
 * Check waiver status for current user
 */
export async function getWaiverStatusAPI(): Promise<{
  success: boolean;
  waiverInfo: {
    currentVersion: string;
    userVersion: string | null;
    hasAccepted: boolean;
    isUpdate: boolean;
    needsAcceptance: boolean;
  };
}> {
  try {
    return await apiRequest<{
      success: boolean;
      waiverInfo: {
        currentVersion: string;
        userVersion: string | null;
        hasAccepted: boolean;
        isUpdate: boolean;
        needsAcceptance: boolean;
      };
    }>("/auth/waiver-status", {
      method: "GET",
    });
  } catch (error) {
    console.error("Waiver status check error:", error);
    return {
      success: false,
      waiverInfo: {
        currentVersion: "1.0",
        userVersion: null,
        hasAccepted: false,
        isUpdate: false,
        needsAcceptance: true,
      },
    };
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
        // Capture the user's timezone at onboarding so off-request work has it
        // before the first token refresh.
        body: JSON.stringify({
          ...userData,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
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

/**
 * Fetch subscription plans from the backend
 */
export async function fetchSubscriptionPlans(): Promise<{
  success: boolean;
  plans: {
    id: number;
    planId: string;
    name: string;
    description: string | null;
    billingPeriod: "monthly" | "annual";
    priceUsd: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  error?: string;
}> {
  try {
    // This is a public endpoint, so we don't need auth
    const response = await fetch(`${API_URL}/subscriptions/plans`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[API] Failed to fetch subscription plans:",
        response.status,
        errorData
      );
      return {
        success: false,
        plans: [],
        error: errorData.message || `HTTP error ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.plans)) {
      console.error("[API] Invalid subscription plans response:", data);
      return {
        success: false,
        plans: [],
        error: "Invalid response format",
      };
    }

    return {
      success: true,
      plans: data.plans,
    };
  } catch (error) {
    console.error("[API] Error fetching subscription plans:", error);
    return {
      success: false,
      plans: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch subscription plans",
    };
  }
}

/**
 * Sync theme preferences to backend
 */
export async function updateThemeAPI(params: {
  themeMode?: string;
  colorTheme?: string;
}): Promise<{ success: boolean }> {
  try {
    return await apiRequest<{ success: boolean }>("/auth/theme", {
      method: "PUT",
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("Failed to sync theme to backend:", error);
    return { success: false };
  }
}

/**
 * Delete user account
 */
export async function deleteAccountAPI(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    return await apiRequest<{
      success: boolean;
      message?: string;
      error?: string;
    }>("/auth/delete-account", {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}
