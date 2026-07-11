import { usePathname } from "expo-router";
import { useEffect } from "react";

import { trackScreen } from "@/lib/analytics-events";

/**
 * [AN-11] Fires a `screen_viewed` event on every route change. Renders nothing.
 * Mounted inside the router tree so `usePathname` resolves the active route.
 */
export function AnalyticsScreenTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackScreen(pathname);
    }
  }, [pathname]);

  return null;
}

export default AnalyticsScreenTracker;
