export interface Profile {
  id: number;
  userId: number;
  email?: string;
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  goals?: string[];
  limitations?: string[];
  fitnessLevel?: string;
  environment?: string;
  equipment?: string[];
  otherEquipment?: string;
  preferredStyles?: string[];
  availableDays?: string[];
  workoutDuration?: number;
  intensityLevel?: string | number;
  medicalNotes?: string;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UpdateProfileParams {
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  goals?: string[];
  limitations?: string[];
  fitnessLevel?: string;
  environment?: string[];
  equipment?: string[];
  otherEquipment?: string;
  workoutStyles?: string[];
  availableDays?: string[];
  preferredTime?: string;
  weeklyTarget?: number;
  workoutDuration?: number;
  intensityLevel?: string;
  medicalNotes?: string;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
  aerobicLevel?: number;
  strengthLevel?: number;
  remindersEnabled?: boolean;
}
