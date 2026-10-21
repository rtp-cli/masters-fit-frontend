export interface User {
  id: number;
  uuid: string; // UUID for analytics
  // At least one of email / phone is set. A text (SMS) sign-in account has a
  // null email until they add one in Settings.
  email: string | null;
  // E.164 ("+13125550123"). Absent on sessions stored before SMS sign-in.
  phone?: string | null;
  name: string;
  needsOnboarding?: boolean;
  waiverAcceptedAt?: Date | string | null;
  waiverVersion?: string | null;
  themeMode?: string | null;
  colorTheme?: string | null;
  // Set by the backend from ADMIN_USER_IDS. Gates admin-only client surfaces
  // (enabling Developer Tools). Absent on older sessions → treated as non-admin.
  isAdmin?: boolean;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  user?: User;
  needsOnboarding?: boolean;
  needsWaiverUpdate?: boolean;
  email?: string;
  // Set instead of `email` when a NEW user verified by text.
  phone?: string;
  token?: string;
  refreshToken?: string;
  errorCode?: AuthErrorCode;
  attemptsLeft?: number;
}

export type AuthErrorCode =
  | "INVALID_CODE"
  | "EXPIRED_CODE"
  | "CODE_EXHAUSTED"
  // SMS sign-in / add-contact only:
  | "INVALID_PHONE"
  | "SMS_UNAVAILABLE"
  | "RATE_LIMITED"
  | "TAKEN";

/** How someone signs in: the identifier a code was sent to. */
export type SignInContact = { email: string } | { phone: string };

export interface OnboardingData {
  userId: number;
  email: string;
  age: number;
  height: number;
  weight: number;
  gender: string;
  goals: string[];
  limitations?: string[];
  fitnessLevel: string;
  environment: string;
  equipment?: string[];
  otherEquipment?: string;
  preferredStyles: string[];
  availableDays: string[];
  intensityLevel: string;
  medicalNotes?: string;
}
