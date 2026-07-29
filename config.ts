import { Platform } from "react-native";

// TEMP (share-feature prod test): when true, the dev app talks to the PRODUCTION
// backend instead of your local one, so you can exercise the deployed share flow
// from the simulator. Set back to false to return to local dev.
const DEV_USE_PROD_API = false;

// Get the API URL based on the environment
const getApiUrl = (): string => {
  // If running in a development environment
  if (__DEV__ && !DEV_USE_PROD_API) {
    if (Platform.OS === "android") {
      // For Android, we need to use the special IP address
      return `http://192.168.1.118:5001/api`;
    } else if (Platform.OS === "ios") {
      // For iOS simulator, use localhost
      return `http://localhost:5001/api`;
    }
    // Default development API URL
    return "http://localhost:5001/api";
  }

  // For production, use the production URL
  return "https://masters-fit-backend.onrender.com/api";
};

// Export the API URL
export const API_URL = getApiUrl();

// Set to true locally to silence RevenueCat console noise in the simulator
export const SUPPRESS_REVENUECAT_LOGS = __DEV__;

// --- RevenueCat SDK key selection --------------------------------------------
// These are RevenueCat *public* SDK keys only (appl_ / goog_ for the real
// stores, RevenueCat Test Store keys for simulator dev). They are inlined into
// the client bundle by design and are safe to ship — NEVER put a RevenueCat
// *secret* key (sk_...) here or anywhere in the client.
//
// Default = the real App Store key (appl_), used for real-device Apple sandbox
// AND production. The RevenueCat Test Store is used ONLY when a developer
// explicitly opts in with EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=true — typically
// to exercise purchases on the iOS simulator, which has no real StoreKit. The
// `__DEV__` guard is a hard safety net: a production/TestFlight build can never
// fall back to the Test Store even if that flag accidentally leaks into an EAS
// environment.
export const USE_REVENUECAT_TEST_STORE =
  __DEV__ && process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE === "true";

// Returns the public SDK key for the current platform, honoring the Test Store
// opt-in above. Android always uses its configured store key (unchanged).
export const getRevenueCatApiKey = (): string | undefined => {
  if (Platform.OS === "ios") {
    return USE_REVENUECAT_TEST_STORE
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_TEST_STORE_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  }
  return process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
};
