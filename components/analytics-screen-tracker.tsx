import { useSegments } from "expo-router";
import { useEffect } from "react";

import { trackScreen } from "@/lib/analytics-events";

/**
 * [AN-11] Fires a `screen_viewed` event on every route change. Renders nothing.
 * Mounted inside the router tree so `useSegments` resolves the active route.
 *
 * We track the route *pattern* (from `useSegments`, which keeps dynamic segments
 * as `[id]`) rather than the resolved `usePathname` string. A resolved path like
 * `/exercise/123` would spawn a distinct `screen` value per exercise, exploding
 * cardinality and making the `screen_viewed` breakdown useless; `/exercise/[id]`
 * collapses them into one screen. Route-group folders like `(tabs)` are dropped so
 * the value matches the user-facing URL shape.
 */
export function AnalyticsScreenTracker(): null {
  const segments = useSegments();

  // Depend on the derived string (primitive) so the effect only re-fires on a real
  // route change, not on every render where useSegments returns a fresh array.
  const screen =
    "/" +
    segments
      .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
      .join("/");

  useEffect(() => {
    trackScreen(screen);
  }, [screen]);

  return null;
}

export default AnalyticsScreenTracker;
