import { Platform } from "react-native";

// Get the API URL based on the environment
const getApiUrl = (): string => {
  // If running in a development environment
  if (__DEV__) {
    if (Platform.OS === "android") {
      // For Android, we need to use the special IP address
      return `http://192.168.68.113:5000/api`;
    } else if (Platform.OS === "ios") {
      // For iOS simulator, use localhost
      return `http://192.168.68.113:5000/api`;
    }
    // Default development API URL
    return "http://192.168.68.113:5000/api";
  }

  // For production, use the production URL
  return "https://masters-fit-backend.onrender.com/api";
};

// Export the API URL
export const API_URL = getApiUrl();

// Add other configuration variables as needed
