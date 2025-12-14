import {
  type AVAILABLE_EQUIPMENT,
  type FITNESS_GOALS,
  type FITNESS_LEVELS,
  type GENDER,
  type IntensityLevels,
  type PHYSICAL_LIMITATIONS,
  type PREFERRED_STYLES,
  type PreferredDays,
  type WORKOUT_ENVIRONMENTS,
} from "../enums/fitness.enums";

export interface FormData {
  email: string;
  age: number;
  height: number;
  weight: number;
  gender: GENDER;
  goals: FITNESS_GOALS[];
  limitations?: PHYSICAL_LIMITATIONS[];
  fitnessLevel: FITNESS_LEVELS;
  environment?: WORKOUT_ENVIRONMENTS;
  equipment?: AVAILABLE_EQUIPMENT[];
  otherEquipment?: string;
  preferredStyles: PREFERRED_STYLES[];
  availableDays: PreferredDays[];
  workoutDuration: number;
  intensityLevel: IntensityLevels;
  medicalNotes?: string;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
}

export interface OnboardingFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showNavigation?: boolean;
  title?: string;
  submitButtonText?: string;
  excludePersonalInfo?: boolean;
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
