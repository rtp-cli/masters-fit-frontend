import { formatEnumValue } from "@/components/onboarding/utils/formatters";
import type { TemporaryOverrides } from "@/components/profile-override-form";
import { type Profile as UserProfile } from "@/types/api";
import {
  type AVAILABLE_EQUIPMENT,
  INTENSITY_LEVELS,
  type PREFERRED_STYLES,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums";

const INTENSITY_LABELS: Record<INTENSITY_LEVELS, string> = {
  [INTENSITY_LEVELS.LOW]: "Low intensity",
  [INTENSITY_LEVELS.MODERATE]: "Moderate intensity",
  [INTENSITY_LEVELS.HIGH]: "High intensity",
};

const ENVIRONMENT_LABELS: Record<WORKOUT_ENVIRONMENTS, string> = {
  [WORKOUT_ENVIRONMENTS.HOME_GYM]: "Home Gym",
  [WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM]: "Commercial Gym",
  [WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY]: "Bodyweight Only",
};

/** Profile stores intensity as 1/2/3 or as the enum string; normalize to enum. */
function profileIntensity(profile: UserProfile): INTENSITY_LEVELS {
  if (!profile.intensityLevel) return INTENSITY_LEVELS.MODERATE;
  if (typeof profile.intensityLevel === "number") {
    return profile.intensityLevel === 1
      ? INTENSITY_LEVELS.LOW
      : profile.intensityLevel === 2
        ? INTENSITY_LEVELS.MODERATE
        : INTENSITY_LEVELS.HIGH;
  }
  return profile.intensityLevel as INTENSITY_LEVELS;
}

/** Profile stores environment as a string or a one-element array; normalize. */
function profileEnvironment(profile: UserProfile): WORKOUT_ENVIRONMENTS {
  if (!profile.environment) return WORKOUT_ENVIRONMENTS.HOME_GYM;
  return (
    Array.isArray(profile.environment)
      ? profile.environment[0]
      : profile.environment
  ) as WORKOUT_ENVIRONMENTS;
}

function sameSet(a: string[], b: string[]): boolean {
  return (
    a.length === b.length &&
    a.every((v) => b.includes(v)) &&
    b.every((v) => a.includes(v))
  );
}

/**
 * One short entry per override field that differs from the user's profile.
 * Single source of truth for changed-vs-profile: the Adjust modal's summary
 * row renders these entries, and formatOverridesIntoReason joins them into
 * the AI reason string — one comparison, two consumers. Pure per LR-020
 * (same pattern as computeFreeAdjustmentNote in utils/entitlements.ts).
 */
export function describeOverrides(
  overrides: TemporaryOverrides,
  profile: UserProfile | null
): string[] {
  if (!profile) return [];

  const entries: string[] = [];

  if (
    overrides.duration !== undefined &&
    overrides.duration !== (profile.workoutDuration || 30)
  ) {
    entries.push(`${overrides.duration} min`);
  }

  if (
    overrides.intensity !== undefined &&
    overrides.intensity !== profileIntensity(profile)
  ) {
    entries.push(INTENSITY_LABELS[overrides.intensity]);
  }

  const currentStyles = (profile.preferredStyles as PREFERRED_STYLES[]) || [];
  const newStyles = overrides.styles || [];
  if (!sameSet(newStyles, currentStyles) && newStyles.length > 0) {
    entries.push(
      `Styles: ${newStyles.map((s) => formatEnumValue(s.toUpperCase())).join(", ")}`
    );
  }

  if (
    overrides.environment !== undefined &&
    overrides.environment !== profileEnvironment(profile)
  ) {
    entries.push(ENVIRONMENT_LABELS[overrides.environment]);
  }

  // Equipment only applies in a home gym; other environments imply their own.
  if (overrides.environment === WORKOUT_ENVIRONMENTS.HOME_GYM) {
    const currentEquipment =
      (profile.equipment as AVAILABLE_EQUIPMENT[]) || [];
    const newEquipment = overrides.equipment || [];
    if (!sameSet(newEquipment, currentEquipment) && newEquipment.length > 0) {
      entries.push(
        `Equipment: ${newEquipment
          .map((e) => formatEnumValue(e.toUpperCase()))
          .join(", ")}`
      );
    }

    const currentOther = (profile.otherEquipment || "").trim();
    if (
      overrides.otherEquipment !== undefined &&
      overrides.otherEquipment.trim() !== currentOther &&
      overrides.otherEquipment.trim()
    ) {
      entries.push(`Other equipment: ${overrides.otherEquipment.trim()}`);
    }
  }

  if (
    overrides.includeWarmup !== undefined &&
    overrides.includeWarmup !== (profile.includeWarmup ?? true)
  ) {
    entries.push(overrides.includeWarmup ? "Include warmup" : "Skip warmup");
  }

  if (
    overrides.includeCooldown !== undefined &&
    overrides.includeCooldown !== (profile.includeCooldown ?? true)
  ) {
    entries.push(
      overrides.includeCooldown ? "Include cooldown" : "Skip cooldown"
    );
  }

  return entries;
}

/**
 * Summary line for the "Customize settings for this workout" row: the first
 * two changed entries plus "+N more" (eight override fields exist — the line
 * must truncate, never grow the row).
 */
export function formatOverrideSummary(entries: string[]): string {
  if (entries.length === 0) return "Using your profile settings";
  const shown = entries.slice(0, 2).join(" · ");
  const rest = entries.length - 2;
  return rest > 0 ? `${shown} +${rest} more` : shown;
}

/**
 * The AI reason string sent with a daily regeneration: the user's typed
 * feedback plus the changed-override entries from describeOverrides.
 */
export function formatOverridesIntoReason(
  customFeedback: string,
  overrides: TemporaryOverrides,
  profile: UserProfile | null
): string {
  const feedback = customFeedback.trim();
  if (!profile) return feedback || "User requested regeneration";

  const entries = describeOverrides(overrides, profile);
  if (entries.length === 0) return feedback || "User requested regeneration";

  const changes = entries.join(", ");
  return feedback
    ? `${feedback}\n\nProfile overrides for this workout: ${changes}`
    : `User requested regeneration with the following changes: ${changes}`;
}
