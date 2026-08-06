import { WORKOUT_ENVIRONMENTS } from "@/types/enums/fitness.enums";

/**
 * Single source of truth for how a workout ENVIRONMENT is presented (label,
 * description, icon) and the order the three cards appear in. Display-only —
 * the enum VALUES are unchanged, so generation (which keys off the stored value
 * and backend-hardcoded prose, never these strings) is unaffected.
 *
 * Labels adopt the training-locations naming: a gym is a "Full Gym", a home/
 * custom setup is "Custom Equipment", and bodyweight stays "Bodyweight Only".
 * Reused verbatim by onboarding step 6 and the "Somewhere else" create screen
 * (1c) — do not fork.
 */
export interface EnvironmentDisplay {
  label: string;
  description: string;
  icon: string; // Ionicons name
}

export const ENVIRONMENT_DISPLAY: Record<
  WORKOUT_ENVIRONMENTS,
  EnvironmentDisplay
> = {
  [WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM]: {
    label: "Full Gym",
    description: "Everything you'd find in a gym",
    icon: "business-outline",
  },
  [WORKOUT_ENVIRONMENTS.HOME_GYM]: {
    label: "Custom Equipment",
    description: "Choose exactly what you have access to",
    icon: "home-outline",
  },
  [WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY]: {
    label: "Bodyweight Only",
    description: "No equipment needed, just your body",
    icon: "body-outline",
  },
};

/** Most equipment → least, matching the frames' card order. */
export const ENVIRONMENTS_IN_DISPLAY_ORDER: WORKOUT_ENVIRONMENTS[] = [
  WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM,
  WORKOUT_ENVIRONMENTS.HOME_GYM,
  WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY,
];

/** Display label for an environment value, with a safe fallback. */
export function getEnvironmentLabel(
  environment: string | null | undefined
): string {
  if (!environment) return "";
  const entry = ENVIRONMENT_DISPLAY[environment as WORKOUT_ENVIRONMENTS];
  return entry ? entry.label : environment;
}

/** Only a custom/home setup shows the equipment grid. */
export function environmentUsesEquipment(
  environment: string | null | undefined
): boolean {
  return environment === WORKOUT_ENVIRONMENTS.HOME_GYM;
}
