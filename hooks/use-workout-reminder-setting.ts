import { useCallback, useEffect, useState } from "react";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications";

/**
 * The Settings "Workout reminders" switch (the 8am daily push).
 *
 * `enabled` is null until the server answers — and stays null if it never
 * does (offline, or a backend without the endpoint), so the row can stay
 * hidden instead of showing a guess. Toggling is optimistic and rolls back if
 * the save fails.
 */
export function useWorkoutReminderSetting() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationPreferences().then((prefs) => {
      if (!cancelled && prefs) setEnabled(prefs.workoutReminders);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setWorkoutReminders = useCallback(async (value: boolean) => {
    setEnabled(value);
    const saved = await updateNotificationPreferences({
      workoutReminders: value,
    });
    if (!saved) setEnabled(!value);
  }, []);

  return { enabled, setWorkoutReminders };
}
