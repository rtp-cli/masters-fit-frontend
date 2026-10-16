/**
 * Which of this plan's days the user missed — offered by the repeat picker as
 * "Missed this week" so a skipped session can be done on another day.
 *
 * The repeat picker only listed COMPLETED days (/past-completed-days), so a
 * user who missed Wednesday and wanted to do it today had no way to pick it.
 * The backend's repeat-day already copies ANY of the user's plan days, done or
 * not, so this is purely a question of what to list.
 *
 * A day counts as missed when it is:
 *  - in the past: before today AND before the target date (a day later in the
 *    week hasn't been missed yet, and copying onto an earlier date from a
 *    later one isn't "catching up");
 *  - not the target day itself;
 *  - not complete;
 *  - a real session: at least one exercise. Rest days and placeholders still
 *    being generated have none, and there's nothing to copy from them.
 *
 * Pure (dates come in already normalised to YYYY-MM-DD through the caller's
 * normaliser) so it's testable without the API client.
 */

interface MissedDayCandidate {
  date: string | Date;
  isComplete?: boolean | null;
  blocks?: { exercises?: unknown[] | null }[] | null;
}

export function countPlanDayExercises(day: MissedDayCandidate): number {
  return (day.blocks ?? []).reduce(
    (total, block) => total + (block.exercises?.length ?? 0),
    0
  );
}

/**
 * @param planDays  every plan day in the active plan
 * @param targetDate the day the workout would be copied onto (YYYY-MM-DD)
 * @param today      today's local date (YYYY-MM-DD)
 * @param normalize  the caller's date normaliser, so this reads dates the same
 *                   way the rest of the app does
 * @returns the missed days, oldest first (reads like the week did)
 */
export function selectMissedDays<T extends MissedDayCandidate>(
  planDays: T[] | null | undefined,
  targetDate: string,
  today: string,
  normalize: (d: string | Date) => string
): T[] {
  if (!planDays?.length) return [];

  return planDays
    .map((day) => ({ day, date: normalize(day.date) }))
    .filter(
      ({ day, date }) =>
        date < today &&
        date < targetDate &&
        !day.isComplete &&
        countPlanDayExercises(day) > 0
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map(({ day }) => day);
}
