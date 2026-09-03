import * as SecureStore from "expo-secure-store";

import { setAuthItem } from "@/lib/secure-store";

import { apiRequest, setImpersonating } from "./api";
import { logger } from "./logger";
import { type User } from "./types";

// Admin "view as user" (impersonation) — client side.
//
// The token swap is the whole trick: apiRequest reads the auth token fresh from
// SecureStore on every call (lib/api.ts), so once we write the impersonation
// token to "token", every request is made AS the target user with no other
// plumbing. The session is READ-ONLY — the backend blocks any non-GET made with
// an impersonation token (auth.middleware), so this can never mutate prod.
//
// We stash the admin's own token/refresh/user under separate keys so exiting
// restores the admin session exactly. These backup keys are intentionally NOT
// in auth.ts's STORAGE_KEYS so a stray clearAllData() can't strand them.

const BACKUP_TOKEN = "impersonatorToken";
const BACKUP_REFRESH = "impersonatorRefreshToken";
const BACKUP_USER = "impersonatorUser";

let impersonatedUser: User | null = null;

export function getImpersonatedUser(): User | null {
  return impersonatedUser;
}

interface ImpersonateResponse {
  success: boolean;
  token: string;
  user: User;
  error?: string;
}

/**
 * Starts an impersonation session for `email`. Backs up the current (admin)
 * credentials, swaps in the read-only impersonation token, and returns the
 * target user. Callers should then put the target user into auth state.
 */
export async function startImpersonationSession(
  email: string,
  reason?: string
): Promise<User> {
  // Mint the read-only token (this call is still made as the admin).
  const res = await apiRequest<ImpersonateResponse>("/admin/impersonate", {
    method: "POST",
    body: JSON.stringify({ email, reason }),
  });

  if (!res?.token || !res?.user) {
    throw new Error(res?.error || "Impersonation failed");
  }

  // Back up the admin's real credentials before swapping.
  const [adminToken, adminRefresh, adminUser] = await Promise.all([
    SecureStore.getItemAsync("token"),
    SecureStore.getItemAsync("refreshToken"),
    SecureStore.getItemAsync("user"),
  ]);
  if (adminToken) await setAuthItem(BACKUP_TOKEN, adminToken);
  if (adminRefresh)
    await setAuthItem(BACKUP_REFRESH, adminRefresh);
  if (adminUser) await setAuthItem(BACKUP_USER, adminUser);

  // Swap to the impersonation token. Remove the refresh token so a background
  // 401 can't silently rotate the admin's session while impersonating — an
  // expired impersonation token should drop us back to admin, not refresh.
  await setAuthItem("token", res.token);
  await SecureStore.deleteItemAsync("refreshToken");

  impersonatedUser = res.user;
  setImpersonating(true);
  logger.info("Impersonation started", { targetUserId: res.user.id });
  return res.user;
}

/**
 * Ends the impersonation session and restores the admin's credentials. Returns
 * the restored admin user (or null if no backup was present — caller should
 * then treat it as a hard logout).
 */
export async function endImpersonationSession(): Promise<User | null> {
  const [adminToken, adminRefresh, adminUserStr] = await Promise.all([
    SecureStore.getItemAsync(BACKUP_TOKEN),
    SecureStore.getItemAsync(BACKUP_REFRESH),
    SecureStore.getItemAsync(BACKUP_USER),
  ]);

  // Restore (or clear) the admin token + refresh + user. Restoring the "user"
  // key is essential, not just cosmetic: code paths read the current user id
  // from SecureStore via getCurrentUser() (e.g. fetchActiveWorkout hits
  // /workouts/<id>/active-workout), NOT from React state. If left as the target,
  // the app would request the TARGET's resources with the ADMIN's token →
  // ownership 403s, which cascade into failed fetches AND a spurious waiver
  // redirect (api.ts treats any 403 as possibly-waiver).
  if (adminToken) await setAuthItem("token", adminToken);
  else await SecureStore.deleteItemAsync("token");
  if (adminRefresh)
    await setAuthItem("refreshToken", adminRefresh);
  if (adminUserStr) await setAuthItem("user", adminUserStr);

  // Clear the backups.
  await Promise.all([
    SecureStore.deleteItemAsync(BACKUP_TOKEN),
    SecureStore.deleteItemAsync(BACKUP_REFRESH),
    SecureStore.deleteItemAsync(BACKUP_USER),
  ]);

  impersonatedUser = null;
  setImpersonating(false);
  logger.info("Impersonation ended");

  return adminUserStr ? (JSON.parse(adminUserStr) as User) : null;
}
