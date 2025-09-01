// Limit constants for arrays, collections, and processing

export const LIMITS = {
  // Background job processing
  MAX_PROCESSED_COMPLETIONS: 100,
  
  // Event listener management
  MAX_LISTENERS: 50,
  
  // UI limits
  MAX_SEARCH_RESULTS: 100,
  MAX_RECENT_ITEMS: 20,
  
  // Data processing limits
  MAX_WORKOUT_EXERCISES: 50,
  MAX_CIRCUIT_ROUNDS: 20,
} as const;