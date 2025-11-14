export interface User {
  id: number;
  email: string;
  name: string;
  needsOnboarding?: boolean;
  waiverAcceptedAt?: Date | string | null;
  waiverVersion?: string | null;
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
