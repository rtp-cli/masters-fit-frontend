import { Platform } from "react-native";

// Get the API URL based on the environment
const getApiUrl = (): string => {
  // If running in a development environment
  if (__DEV__) {
    if (Platform.OS === "android") {
      // For Android, we need to use the special IP address
      return `http://192.168.1.170:5001/api`;
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
