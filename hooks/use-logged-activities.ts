import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createActivityAPI,
  type CreateLoggedActivityInput,
  deleteActivityAPI,
  getActivitiesAPI,
  type LoggedActivity,
} from "@/lib/activities";
import { tabEvents } from "@/lib/tab-events";

/**
 * [LR-077] Loads the user's logged activities for a date window, and keeps
 * every screen showing them in agreement.
 *
 * The cross-screen part is the load-bearing bit. LR-069 shipped the ability to
 * CREATE a second session per date while the surfaces that render a date still
 * showed one, and a user who generated a bonus workout saw what looked exactly
 * like his completed one being destroyed. A logged activity has the same shape
 * of risk: log one on the dashboard, switch to the calendar, and if the
 * calendar is still holding a stale list the activity has silently vanished.
 *
 * So a write anywhere broadcasts, and every mounted hook refetches. tabEvents
 * is the emitter the app already uses for exactly this kind of cross-screen
 * nudge — this adds no new mechanism.
 */

/** Broadcast on every successful create/delete, from whichever screen did it. */
export const ACTIVITIES_CHANGED_EVENT = "logged-activities-changed";

interface UseLoggedActivitiesArgs {
  /** Inclusive "YYYY-MM-DD" window. Omit both for everything. */
  startDate?: string;
  endDate?: string;
  /** Skip loading entirely (e.g. before auth resolves). */
  enabled?: boolean;
}

export function useLoggedActivities({
  startDate,
  endDate,
  enabled = true,
}: UseLoggedActivitiesArgs = {}) {
  const [activities, setActivities] = useState<LoggedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      // getActivitiesAPI swallows its own errors and returns [] — a failed
      // activity fetch must never blank the calendar or dashboard around it.
      setActivities(await getActivitiesAPI(startDate, endDate));
    } finally {
      setLoading(false);
    }
  }, [enabled, startDate, endDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Any screen's write refreshes this one.
  useEffect(() => {
    const onChanged = () => {
      void refresh();
    };
    tabEvents.on(ACTIVITIES_CHANGED_EVENT, onChanged);
    return () => tabEvents.off(ACTIVITIES_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const logActivity = useCallback(
    async (input: CreateLoggedActivityInput) => {
      setSubmitting(true);
      try {
        const created = await createActivityAPI(input);
        // Tell every other mounted surface before returning, so the calendar is
        // already correct by the time the user gets there.
        tabEvents.emit(ACTIVITIES_CHANGED_EVENT);
        return created;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const removeActivity = useCallback(
    async (id: number) => {
      setDeletingId(id);
      try {
        await deleteActivityAPI(id);
        // Drop it locally too: the emit below refetches, but without this the
        // row lingers for the length of the round trip and looks undeleted.
        setActivities((prev) => prev.filter((a) => a.id !== id));
        tabEvents.emit(ACTIVITIES_CHANGED_EVENT);
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  /** Activities grouped by date — what every calendar-shaped surface wants. */
  const byDate = useMemo(() => {
    const map = new Map<string, LoggedActivity[]>();
    for (const activity of activities) {
      const existing = map.get(activity.date);
      if (existing) existing.push(activity);
      else map.set(activity.date, [activity]);
    }
    return map;
  }, [activities]);

  const activitiesForDate = useCallback(
    (date: string) => byDate.get(date) ?? [],
    [byDate]
  );

  return {
    activities,
    byDate,
    activitiesForDate,
    loading,
    submitting,
    deletingId,
    refresh,
    logActivity,
    removeActivity,
  };
}
