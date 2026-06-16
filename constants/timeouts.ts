// Timeout and interval constants

export const TIMEOUTS = {
  // Background job polling
  POLL_INTERVAL: 5000, // 5 seconds
  // Faster cadence while a generation job is active so the progressive
  // timeline stays in near-lockstep with the backend (each day-done event
  // surfaces within ~1.5s instead of up to 5s) — the device can't rely on the
  // websocket, so polling drives the UI and a tight interval is what makes it
  // feel responsive. Generation jobs are short-lived (~30s), so the extra
  // poll volume is bounded.
  GENERATION_POLL_INTERVAL: 1500, // 1.5 seconds

  // Cache durations
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  
  // API request timeouts
  API_TIMEOUT: 10000, // 10 seconds
  
  // UI interaction timeouts
  DEBOUNCE_DELAY: 300, // 300ms for search/input debouncing
  THROTTLE_DELAY: 100, // 100ms for scroll/resize throttling
} as const;