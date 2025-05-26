// Utility functions for the Masters Fit mobile app

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
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
}

/**
 * Format a number with a specified number of decimal places
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toFixed(decimals);
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
 * Calculate BMI based on height (cm) and weight (kg)
 */
export function calculateBMI(height: number, weight: number): number {
  // Convert height from cm to meters
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
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
 * Get current date in "YYYY-MM-DD" format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
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
 */
export function getDayOfWeek(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
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
