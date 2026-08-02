import {
  type AVAILABLE_EQUIPMENT,
  type FITNESS_GOALS,
  type FITNESS_LEVELS,
  type GENDER,
  type INTENSITY_LEVELS,
  type ONBOARDING_STEP,
  type PHYSICAL_LIMITATIONS,
  type PREFERRED_DAYS,
  type PREFERRED_STYLES,
  type WORKOUT_ENVIRONMENTS,
} from "../enums/fitness.enums";

export interface FormData {
  email: string;
  age: number;
  height: number;
  weight: number;
  // §4: optional so onboarding can start with nothing selected (a filled card
  // is a claim the user never made). handleSubmit assumes both present because
  // validateStep gates it. A saved profile always has real values in edit mode.
  gender?: GENDER;
  goals: FITNESS_GOALS[];
  limitations?: PHYSICAL_LIMITATIONS[];
  fitnessLevel?: FITNESS_LEVELS;
  environment?: WORKOUT_ENVIRONMENTS;
  equipment?: AVAILABLE_EQUIPMENT[];
  otherEquipment?: string;
  preferredStyles: PREFERRED_STYLES[];
  availableDays: PREFERRED_DAYS[];
  workoutDuration: number;
  intensityLevel: INTENSITY_LEVELS;
  medicalNotes?: string;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
}

export interface OnboardingFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
  submitButtonText?: string;
  /**
   * §10: chrome + behaviour only — greeting, skip control, `onboarding_step_viewed`
   * analytics, and the default primary-button label ("Save" in edit). Defaults to
   * "edit" so a mount that forgets to declare itself can't pollute the funnel.
   */
  mode?: "onboarding" | "edit";
  /**
   * §10: which steps render, in order. Defaults to all seven. Onboarding omits it;
   * a Settings-card editor passes one step; regeneration passes the six (all but
   * PERSONAL_INFO). The progress bar shows when this has length > 1.
   */
  steps?: ONBOARDING_STEP[];
  /** §10: passed in, not read from useAuth — the form is presentational. */
  userName?: string;
  /**
   * §A2.1: fired when the single-step edit editor's values diverge from (or return
   * to) the values it was mounted with. The host screen (profile-edit) uses it to
   * gate the discard-changes dialog and is otherwise a no-op.
   */
  onDirtyChange?: (dirty: boolean) => void;
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
