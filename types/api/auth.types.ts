export interface User {
  id: number;
  uuid: string; // UUID for analytics
  email: string;
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
  token?: string;
  refreshToken?: string;
  errorCode?: "INVALID_CODE" | "EXPIRED_CODE" | "CODE_EXHAUSTED";
  attemptsLeft?: number;
}

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
