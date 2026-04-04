import * as Sentry from "@sentry/react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("[Sentry] No DSN configured — skipping initialization");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // Set to a lower value in production to reduce noise
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Only send events in production
    enabled: !__DEV__,
    // Attach user context, screen breadcrumbs, etc.
    attachScreenshot: true,
    environment: __DEV__ ? "development" : "production",
  });
}

export { Sentry };
