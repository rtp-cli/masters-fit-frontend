/**
 * [LR-087] Which past weeks the repeat picker offers, and which to preselect.
 *
 * Normally the picker shows only plans the user actually did some of — that
 * hides stale, never-started plans left behind by rebuilds (see
 * `isRepeatablePreviousWorkout` in lib/workouts, which `isRepeatable` mirrors).
 *
 * From the plan-ended screen that rule backfires. The people most likely to be
 * there with no plan builds left are the ones who never logged a set, so every
 * plan they have is "never started" — and the list comes back empty, under a
 * button that promised "Repeat a past week". For them the plan that just ended
 * is exactly the one to repeat: they never did it. So `includeMostRecent`
 * always offers it, and preselects it, even with zero completed days.
 *
 * "Most recent" is by end date (then id), computed here rather than trusting the
 * server's ordering. Kept in utils — not next to the predicate in lib/workouts —
 * so it's testable without pulling the API client into jest.
 */
export interface RepeatableWeek {
  id: number;
  endDate: string;
  completionRate?: number;
  completedWorkouts?: number;
}

export function isRepeatable(week: RepeatableWeek): boolean {
  return (week.completionRate ?? 0) > 0 || (week.completedWorkouts ?? 0) > 0;
}

export function weeksToOffer<T extends RepeatableWeek>(
  weeks: T[],
  { includeMostRecent }: { includeMostRecent: boolean },
): { list: T[]; preselected: T | null } {
  const repeatable = weeks.filter(isRepeatable);
  if (!includeMostRecent || weeks.length === 0) {
    return { list: repeatable, preselected: null };
  }

  const mostRecent = [...weeks].sort(
    (a, b) => b.endDate.localeCompare(a.endDate) || b.id - a.id,
  )[0];
  const list = repeatable.some((w) => w.id === mostRecent.id)
    ? repeatable
    : [mostRecent, ...repeatable];
  return { list, preselected: mostRecent };
}
