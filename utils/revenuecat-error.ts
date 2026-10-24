/**
 * RevenueCat error helpers.
 *
 * A device with no connection makes RevenueCat throw a network error — an
 * expected state, not a bug, so it shouldn't page us via Sentry or show the
 * user iOS's raw "Error performing request because..." text.
 */

// Mirrors PURCHASES_ERROR_CODE.NETWORK_ERROR / OFFLINE_CONNECTION_ERROR from
// react-native-purchases (kept as literals so this stays a pure, testable helper).
const OFFLINE_ERROR_CODES = new Set(["10", "35"]);

export const REVENUECAT_OFFLINE_MESSAGE =
  "You're offline. Check your connection and try again.";

export function isRevenueCatOfflineError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code !== undefined && OFFLINE_ERROR_CODES.has(String(code))) return true;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    /internet connection appears to be offline|network connection was lost/i.test(
      message,
    )
  );
}
