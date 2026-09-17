/**
 * Which session to show for a date that may hold more than one.
 *
 * [LR-069] Until now this was `planDays.find(d => d.date === today)` — the
 * FIRST match. A date could only ever have one session, so that was fine. Now
 * that a bonus session can be added to a day already trained, "first" is the
 * wrong answer: it returns the morning workout you already finished and the
 * session you just asked for is invisible.
 *
 * Pure so the choice can be tested without the workout screen's dependency
 * tree, and because the failure it prevents is silent — the wrong session
 * simply renders, with nothing to indicate another one exists.
 */

interface SessionLike {
  date: string | Date;
  isComplete?: boolean | null;
}

/**
 * @param planDays  every plan day in the active plan
 * @param date      the target date, already normalised
 * @param normalize the same date normaliser the caller uses elsewhere, so this
 *                  cannot disagree with how the rest of the screen reads dates
 *
 * Preference order:
 *  1. The first session today that is NOT complete — the one you can act on,
 *     which after finishing the morning workout is the bonus just generated.
 *  2. Failing that (everything today is done), the LAST one, so the summary
 *     reflects the session you finished most recently rather than the first.
 */
export function selectSessionForDate<T extends SessionLike>(
  planDays: T[] | null | undefined,
  date: string,
  normalize: (d: string | Date) => string
): T | null {
  if (!planDays?.length) return null;

  const onDate = planDays.filter((day) => normalize(day.date) === date);
  if (onDate.length === 0) return null;

  const firstUnfinished = onDate.find((day) => !day.isComplete);
  return firstUnfinished ?? onDate[onDate.length - 1];
}

/** How many sessions fall on that date — drives "1 of 2" style affordances. */
export function countSessionsForDate<T extends SessionLike>(
  planDays: T[] | null | undefined,
  date: string,
  normalize: (d: string | Date) => string
): number {
  if (!planDays?.length) return 0;
  return planDays.filter((day) => normalize(day.date) === date).length;
}
