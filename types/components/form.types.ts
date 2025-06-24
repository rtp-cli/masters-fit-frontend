import {
  Gender,
  FitnessGoals,
  FitnessLevels,
  IntensityLevels,
  WorkoutEnvironments,
  PreferredDays,
  PhysicalLimitations,
  AvailableEquipment,
  PreferredStyles,
} from "../enums/fitness.enums";

export interface FormData {
  email: string;
  age: number;
  height: number;
  weight: number;
  gender: Gender;
  goals: FitnessGoals[];
  limitations?: PhysicalLimitations[];
  fitnessLevel: FitnessLevels;
  environment?: WorkoutEnvironments;
  equipment?: AvailableEquipment[];
  otherEquipment?: string;
  preferredStyles: PreferredStyles[];
  availableDays: PreferredDays[];
  workoutDuration: number;
  intensityLevel: IntensityLevels;
  medicalNotes?: string;
}

export interface OnboardingFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showNavigation?: boolean;
  title?: string;
  submitButtonText?: string;
}

export type ArrayFields = Extract<
  keyof FormData,
  | "goals"
  | "limitations"
  | "environment"
  | "equipment"
  | "preferredStyles"
  | "availableDays"
>;

export type ArrayValue = string;
