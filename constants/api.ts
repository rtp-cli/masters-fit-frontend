// API-related constants
import { API_URL } from "@/config";

// For socket connections, we need just the base URL without /api
export const API_BASE_URL = API_URL.replace('/api', '');

// Main API URL (already includes /api)
export { API_URL };