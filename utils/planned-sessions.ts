import { FITNESS_LEVELS } from "@/types/enums";

/**
 * [LR-085] Training days per week a "getting moving" user's plan is built with,
 * whatever they said they're free. Mirrors the backend default
 * (BEGINNER_DAYS_PER_WEEK in plan-schedule.ts). If that env var is changed in
 * Render, change this too — otherwise the schedule step's count and the plan
 * disagree.
 */
export const BEGINNER_SESSIONS_PER_WEEK = 3;

/**
 * How many sessions a week the NEXT plan will actually hold. Everyone trains on
 * every day they pick — except "getting moving", whose plan spreads 3 across the
 * days they're free, because ten straight training days is how a beginner quits.
 */
export function plannedSessionsPerWeek(
  fitnessLevel: string | null | undefined,
  availableDayCount: number,
): number {
  if (fitnessLevel === FITNESS_LEVELS.BEGINNER) {
    return Math.min(availableDayCount, BEGINNER_SESSIONS_PER_WEEK);
  }
  return availableDayCount;
}

/** True when the plan deliberately trains fewer days than the user picked. */
export function isSpreadingDays(
  fitnessLevel: string | null | undefined,
  availableDayCount: number,
): boolean {
  return plannedSessionsPerWeek(fitnessLevel, availableDayCount) < availableDayCount;
}
