import * as SecureStore from "expo-secure-store";

/**
 * Keychain accessibility for auth credentials (token, refreshToken, user, and
 * the impersonation backups).
 *
 * The default (WHEN_UNLOCKED) makes iOS keychain reads THROW while the device
 * is locked or mid-unlock — exactly the window in which tapping a push
 * notification from the lock screen launches the app. The auth layer used to
 * swallow that throw into `null`, mistake "keychain sealed" for "no session",
 * and log the user out (the workout-ready-notification logout bug, 2026-09-03).
 *
 * AFTER_FIRST_UNLOCK keeps the items readable any time after the first unlock
 * since boot, which is the standard choice for tokens an app needs during
 * background/launch work. Android has no equivalent restriction and ignores
 * the option.
 *
 * Write-time attribute: existing items adopt it on their next write (login,
 * signup, or any token rotation), so the fleet migrates on its own.
 */
const AUTH_KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/** Store an auth-critical item with lock-screen-safe accessibility. */
export async function setAuthItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, AUTH_KEYCHAIN_OPTIONS);
}
