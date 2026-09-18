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
  /**
   * Present so a session still being generated can be skipped. The backend
   * creates the plan day FIRST and fills in blocks when the job finishes, so a
   * blockless day is a placeholder, not something the user can do.
   */
  blocks?: unknown[] | null;
}

/**
 * @param planDays  every plan day in the active plan
 * @param date      the target date, already normalised
 * @param normalize the same date normaliser the caller uses elsewhere, so this
 *                  cannot disagree with how the rest of the screen reads dates
 *
 * Preference order:
 *  1. The first session that is NOT complete AND has blocks — the one you can
 *     actually do, which after finishing the morning workout is the bonus just
 *     generated.
 *  2. Failing that, the LAST session WITH blocks, so a fully-trained day shows
 *     what you finished most recently rather than the first thing you did.
 *  3. Failing that, the last session at all.
 *
 * Blockless days are skipped at every step, and that is the load-bearing part.
 * A bonus workout's plan day is created BEFORE its exercises are generated, so
 * for the length of that job the date holds an empty placeholder. The workout
 * screen treats a blockless day as a rest day, so preferring it shadowed the
 * real completed workout and rendered "Rest Day" over a session the user had
 * already finished — which looks exactly like data loss. Seen on production
 * 2026-09-17.
 */
export function selectSessionForDate<T extends SessionLike>(
  planDays: T[] | null | undefined,
  date: string,
  normalize: (d: string | Date) => string
): T | null {
  if (!planDays?.length) return null;

  const onDate = planDays.filter((day) => normalize(day.date) === date);
  if (onDate.length === 0) return null;

  // A day mid-generation has no blocks yet; it is not something to show.
  const real = onDate.filter((day) => (day.blocks?.length ?? 0) > 0);

  const firstUnfinished = real.find((day) => !day.isComplete);
  if (firstUnfinished) return firstUnfinished;

  if (real.length > 0) return real[real.length - 1];

  // Nothing on this date has content — fall back so a genuine rest day (a plan
  // day deliberately created with no blocks) still resolves as it always did.
  return onDate[onDate.length - 1];
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

/**
 * Every session on a date that has content, in plan order.
 *
 * [LR-069] The Workout tab can only render one session at a time, so when a
 * date holds two it needs to offer a choice — otherwise the one it does not
 * pick becomes unreachable, and a completed workout can disappear behind a
 * bonus session the user did not want. Blockless days are excluded for the
 * same reason selectSessionForDate skips them: a placeholder mid-generation is
 * not something to switch to.
 */
export function sessionsForDate<T extends SessionLike>(
  planDays: T[] | null | undefined,
  date: string,
  normalize: (d: string | Date) => string
): T[] {
  if (!planDays?.length) return [];
  return planDays.filter(
    (day) => normalize(day.date) === date && (day.blocks?.length ?? 0) > 0
  );
}
