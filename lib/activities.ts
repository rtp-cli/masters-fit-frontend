import {
  type CreateLoggedActivityInput,
  type LoggedActivity,
} from "@/types/api";
import { getCurrentDate } from "@/utils";

import { apiRequest } from "./api";

export type {
  CreateLoggedActivityInput,
  LoggedActivity,
  LoggedActivityEffort,
  LoggedActivityType,
} from "@/types/api";

/**
 * [LR-077] Activities the user logged themselves.
 *
 * Nothing here touches workout generation — these endpoints record what already
 * happened and never prescribe anything.
 */

/**
 * Log an activity.
 *
 * Sends the device's local `today` alongside the activity: the server cannot
 * know what day it is where the user is standing, and without it a 7pm walk in
 * a US timezone gets rejected as "in the future" once UTC has rolled over.
 *
 * Lets the error propagate so the caller can show the server's stated reason.
 */
export async function createActivityAPI(
  input: CreateLoggedActivityInput
): Promise<LoggedActivity> {
  const res = await apiRequest<{
    success: boolean;
    activity: LoggedActivity;
  }>("/activities", {
    method: "POST",
    body: JSON.stringify({ ...input, today: getCurrentDate() }),
  });
  return res.activity;
}

/**
 * The user's logged activities, optionally within an inclusive date window.
 *
 * Returns [] rather than throwing: an activity list that fails to load must not
 * take the calendar or dashboard down with it — those screens have a plan to
 * render regardless, and a missing extra row is a far smaller failure than a
 * blank screen.
 */
export async function getActivitiesAPI(
  startDate?: string,
  endDate?: string
): Promise<LoggedActivity[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString();

    const res = await apiRequest<{
      success: boolean;
      activities: LoggedActivity[];
    }>(`/activities${query ? `?${query}` : ""}`);
    return res.success ? res.activities : [];
  } catch (error) {
    console.error("getActivities error:", error);
    return [];
  }
}

/**
 * Remove one. Propagates the error so a failed delete can say so rather than
 * silently leaving the row on screen.
 */
export async function deleteActivityAPI(id: number): Promise<void> {
  await apiRequest<{ success: boolean }>(`/activities/${id}`, {
    method: "DELETE",
  });
}
