export interface User {
  id: number;
  email: string;
  name: string;
  needsOnboarding?: boolean;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  user?: User;
  needsOnboarding?: boolean;
  email?: string;
  token?: string;
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
  preferredStyles: string[];
  availableDays: string[];
  intensityLevel: string;
  medicalNotes?: string;
}
