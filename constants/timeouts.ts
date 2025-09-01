// Timeout and interval constants

export const TIMEOUTS = {
  // Background job polling
  POLL_INTERVAL: 5000, // 5 seconds
  
  // Cache durations
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  
  // API request timeouts
  API_TIMEOUT: 10000, // 10 seconds
  
  // UI interaction timeouts
  DEBOUNCE_DELAY: 300, // 300ms for search/input debouncing
  THROTTLE_DELAY: 100, // 100ms for scroll/resize throttling
} as const;