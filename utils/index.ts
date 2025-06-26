// Utility functions for the Masters Fit mobile app

/**
 * Robust date parsing function that handles various input formats
 */
export function parseDateSafely(
  dateInput: string | Date | null | undefined
): Date {
  if (!dateInput) {
    return new Date();
  }

  // If it's already a Date object, return it
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // If it's a string, try to parse it
  if (typeof dateInput === "string") {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split("-").map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }

    // Handle ISO date strings (YYYY-MM-DDTHH:mm:ss.sssZ)
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateInput)) {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try general date parsing
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Fallback to current date
  console.warn(
    "parseDateSafely: Invalid date input:",
    dateInput,
    "using current date"
  );
  return new Date();
}

/**
 * Format a date string into a readable format
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
): string {
  const dateObj = parseDateSafely(date);
  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
}

/**
 * Convert any date input to UTC Date object
 */
export function toUTCDate(dateInput: string | Date | null | undefined): Date {
  const date = parseDateSafely(dateInput);
  return new Date(date.toISOString());
}

/**
 * Format date for display in local timezone
 */
export function formatDateForDisplay(
  dateInput: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const date = parseDateSafely(dateInput);
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Format date as YYYY-MM-DD string in UTC
 */
export function formatDateAsString(
  dateInput: Date | string | null | undefined
): string {
  const date = parseDateSafely(dateInput);
  return date.toISOString().split("T")[0];
}

/**
 * Format date as YYYY-MM-DD string in local timezone (for display, avoiding timezone conversion issues)
 */
export function formatDateAsLocalString(
  dateInput: Date | string | null | undefined
): string {
  const date = parseDateSafely(dateInput);
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

/**
 * Check if two dates are the same day (in local timezone)
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = parseDateSafely(date1);
  const d2 = parseDateSafely(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Get today's date as YYYY-MM-DD in local timezone (avoiding timezone conversion issues)
 */
export function getTodayString(): string {
  const today = new Date();
  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}

/**
 * Format a number with a specified number of decimal places
 */
export function formatNumber(
  num: number | string | undefined,
  decimals: number = 0
): string {
  // Handle undefined, null, or empty string
  if (num === undefined || num === null || num === "") {
    return "0";
  }

  // Convert string to number if needed
  const numValue = typeof num === "string" ? parseFloat(num) : num;

  // Handle NaN or invalid numbers
  if (isNaN(numValue)) {
    return "0";
  }

  return numValue.toFixed(decimals);
}

/**
 * Format duration in minutes to hours and minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Get intensity level text from numeric value
 */
export function getIntensityText(level: number): string {
  switch (level) {
    case 1:
      return "Very Light";
    case 2:
      return "Light";
    case 3:
      return "Moderate";
    case 4:
      return "Intense";
    case 5:
      return "Very Intense";
    default:
      return "Unknown";
  }
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Convert a hex color to rgba
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Format a date for display in calendar
 */
export function formatCalendarDate(date: Date): string {
  return date.toISOString().split("T")[0]; // Returns "YYYY-MM-DD" format
}

/**
 * Get current date in "YYYY-MM-DD" format (using local date to avoid timezone issues)
 */
export function getCurrentDate(): string {
  const today = new Date();
  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}

/**
 * Generate a random color (useful for testing and placeholders)
 */
export function getRandomColor(): string {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

/**
 * Format a file size from bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Get day of week (Monday, Tuesday, etc.) from a date
 * Uses timezone-safe parsing for date strings
 */
export function getDayOfWeek(date: Date | string): string {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // If it's a string in YYYY-MM-DD format, parse it safely
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    const safeDate = new Date(year, month - 1, day); // month is 0-indexed
    return dayNames[safeDate.getDay()];
  }

  // Otherwise use the date object directly
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dayNames[dateObj.getDay()];
}

/**
 * Get short month name (Jan, Feb, etc.) from a date
 */
export function getShortMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

/**
 * Get day of month (1-31) from a date
 */
export function getDayOfMonth(date: Date): number {
  return date.getDate();
}

/**
 * Generate a unique ID
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Calculate total time for a single exercise including rest periods
 * @param duration Duration per set in seconds
 * @param sets Number of sets
 * @param restTime Rest time between sets in seconds
 * @returns Total exercise time in seconds
 */
export function calculateExerciseTime(
  duration: number = 0,
  sets: number = 1,
  restTime: number = 0
): number {
  if (duration <= 0 || sets <= 0) return 0;

  const workTime = duration * sets;
  const totalRestTime = sets > 1 ? restTime * (sets - 1) : 0;

  return workTime + totalRestTime;
}

/**
 * Calculate total workout duration from exercises
 * @param exercises Array of exercises with duration, sets, and restTime
 * @returns Total workout time in seconds
 */
export function calculateWorkoutDuration(
  exercises: Array<{
    duration?: number;
    sets?: number;
    restTime?: number;
  }>
): number {
  return exercises.reduce((total, exercise) => {
    return (
      total +
      calculateExerciseTime(
        exercise.duration || 0,
        exercise.sets || 1,
        exercise.restTime || 0
      )
    );
  }, 0);
}

/**
 * Format exercise duration for display
 * @param duration Duration per set in seconds
 * @param sets Number of sets
 * @param restTime Rest time between sets in seconds
 * @returns Formatted duration string (e.g., "8.5 min")
 */
export function formatExerciseDuration(
  duration: number = 0,
  sets: number = 1,
  restTime: number = 0
): string {
  const totalSeconds = calculateExerciseTime(duration, sets, restTime);
  const minutes = totalSeconds / 60;

  if (minutes < 1) {
    return `${Math.round(totalSeconds)}s`;
  } else if (minutes < 60) {
    return `${Math.round(minutes * 10) / 10} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round((minutes % 60) * 10) / 10;
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Format enum values for display by removing underscores and capitalizing properly
 * @param value The enum value to format (e.g., "muscle_gain", "weight_loss")
 * @returns Formatted string (e.g., "Muscle Gain", "Weight Loss")
 */
export function formatEnumValue(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format equipment array for display
 * @param equipment Array of equipment strings or single equipment string
 * @returns Formatted equipment string
 */
export function formatEquipment(
  equipment: string | string[] | null | undefined
): string {
  if (!equipment) return "None";

  if (Array.isArray(equipment)) {
    if (equipment.length === 0) return "None";
    return equipment.map((item) => formatEnumValue(item)).join(", ");
  }

  // Handle single string with underscore formatting
  if (equipment === "none") return "None";
  return formatEnumValue(equipment);
}

/**
 * Format muscle groups array for display
 * @param muscleGroups Array of muscle group strings
 * @returns Formatted muscle groups string
 */
export function formatMuscleGroups(
  muscleGroups: string[] | null | undefined
): string {
  if (!muscleGroups || muscleGroups.length === 0) return "Unknown";
  return muscleGroups.map((group) => formatEnumValue(group)).join(", ");
}

/**
 * Format difficulty level for display
 * @param difficulty The difficulty level (e.g., "beginner", "intermediate", "advanced")
 * @returns Formatted difficulty string
 */
export function formatDifficulty(
  difficulty: string | null | undefined
): string {
  if (!difficulty) return "Unknown";
  return formatEnumValue(difficulty);
}

/**
 * Format fitness goals for display
 * @param goals Array of fitness goal strings
 * @returns Formatted goals string
 */
export function formatFitnessGoals(goals: string[] | null | undefined): string {
  if (!goals || goals.length === 0) return "None";
  return goals.map((goal) => formatEnumValue(goal)).join(", ");
}

/**
 * Format physical limitations for display
 * @param limitations Array of limitation strings
 * @returns Formatted limitations string
 */
export function formatPhysicalLimitations(
  limitations: string[] | null | undefined
): string {
  if (!limitations || limitations.length === 0) return "None";
  return limitations
    .map((limitation) => formatEnumValue(limitation))
    .join(", ");
}

/**
 * Format preferred days for display
 * @param days Array of day strings
 * @returns Formatted days string
 */
export function formatPreferredDays(days: string[] | null | undefined): string {
  if (!days || days.length === 0) return "None";
  return days.map((day) => formatEnumValue(day)).join(", ");
}

/**
 * Format workout environment for display
 * @param environment The workout environment string
 * @returns Formatted environment string
 */
export function formatWorkoutEnvironment(
  environment: string | null | undefined
): string {
  if (!environment) return "Unknown";
  return formatEnumValue(environment);
}

/**
 * Format fitness level for display
 * @param level The fitness level string
 * @returns Formatted level string
 */
export function formatFitnessLevel(level: string | null | undefined): string {
  if (!level) return "Unknown";
  return formatEnumValue(level);
}

/**
 * Format gender for display
 * @param gender The gender string
 * @returns Formatted gender string
 */
export function formatGender(gender: string | null | undefined): string {
  if (!gender) return "Unknown";
  return formatEnumValue(gender);
}

/**
 * Format workout styles for display
 * @param styles Array of workout style strings
 * @returns Formatted styles string
 */
export function formatWorkoutStyles(
  styles: string[] | null | undefined
): string {
  if (!styles || styles.length === 0) return "None";
  return styles
    .map((style) => {
      // Special case for HIIT - keep it uppercase
      if (style.toUpperCase() === "HIIT") return "HIIT";
      return formatEnumValue(style);
    })
    .join(", ");
}
