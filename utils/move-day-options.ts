/**
 * The days a planned workout can be moved to — the rows of the "Swap with
 * another day" sheet.
 *
 * Mirrors the backend's rules (plan-day-move.service.ts) so the sheet never
 * offers a move the server will refuse:
 *  - today or later, and inside the plan's window;
 *  - not the source workout's own date;
 *  - a day whose sessions include a completed one is shown but disabled (the
 *    user should see why that day isn't on offer, not have it vanish).
 * A day with nothing scheduled is a rest day: the workout moves there and its
 * old date becomes the rest day.
 *
 * "Started but not completed" can't be seen from the plan payload, so the
 * server is the last word on that and the sheet shows its message.
 *
 * Pure (dates normalised by the caller) so it's testable without the API.
 */

interface MoveDayCandidate {
  id: number;
  date: string | Date;
  name?: string | null;
  isComplete?: boolean | null;
}

export interface MoveDayOption {
  date: string;
  /** Workouts scheduled on this date. Empty = rest day. */
  sessions: { id: number; name: string }[];
  disabled: boolean;
  isToday: boolean;
}

/** Add n days to a YYYY-MM-DD string without touching timezones. */
export function addDaysToDateString(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + n));
  return next.toISOString().slice(0, 10);
}

export function buildMoveDayOptions<T extends MoveDayCandidate>(
  planDays: T[],
  source: { id: number; date: string },
  window: { today: string; planStart: string; planEnd: string },
  normalize: (date: string | Date) => string
): MoveDayOption[] {
  const { today, planStart, planEnd } = window;
  const first = today > planStart ? today : planStart;
  const options: MoveDayOption[] = [];

  for (let date = first; date <= planEnd; date = addDaysToDateString(date, 1)) {
    if (date === source.date) continue;
    const onDate = planDays.filter(
      (day) => day.id !== source.id && normalize(day.date) === date
    );
    options.push({
      date,
      sessions: onDate.map((day) => ({
        id: day.id,
        name: day.name || "Workout",
      })),
      disabled: onDate.some((day) => !!day.isComplete),
      isToday: date === today,
    });
  }

  return options;
}
