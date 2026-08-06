import {
  type CreateLocationInput,
  type TrainingLocation,
  type TrainingLocationSnapshot,
  type UpdateLocationInput,
} from "@/types/api";

import { apiRequest } from "./api";

export type {
  CreateLocationInput,
  TrainingLocation,
  TrainingLocationSnapshot,
  UpdateLocationInput,
} from "@/types/api";

/** All of a user's places, primary first (picker 1b, Settings 1f). */
export async function getLocationsAPI(
  userId: number
): Promise<TrainingLocation[]> {
  try {
    const res = await apiRequest<{
      success: boolean;
      locations: TrainingLocation[];
    }>(`/training-locations/${userId}`);
    return res.success ? res.locations : [];
  } catch (error) {
    console.error("getLocations error:", error);
    return [];
  }
}

/**
 * Save a new secondary place (1c "Save this place"). Lets the error propagate so
 * the caller can surface the stated cap reason (409 → err.message) rather than
 * silently failing.
 */
export async function createLocationAPI(
  userId: number,
  input: CreateLocationInput
): Promise<TrainingLocation> {
  const res = await apiRequest<{
    success: boolean;
    location: TrainingLocation;
  }>(`/training-locations/${userId}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.location;
}

/** Rename / re-equip a place (1f place detail). */
export async function updateLocationAPI(
  userId: number,
  locationId: number,
  patch: UpdateLocationInput
): Promise<TrainingLocation> {
  const res = await apiRequest<{
    success: boolean;
    location: TrainingLocation;
  }>(`/training-locations/${userId}/${locationId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return res.location;
}

/** Promote a secondary to primary ("Make my usual place", 1f). */
export async function makePrimaryLocationAPI(
  userId: number,
  locationId: number
): Promise<TrainingLocation> {
  const res = await apiRequest<{
    success: boolean;
    location: TrainingLocation;
  }>(`/training-locations/${userId}/${locationId}/make-primary`, {
    method: "POST",
  });
  return res.location;
}

/** Remove a saved secondary (1f). Propagates the refusal reason if primary. */
export async function deleteLocationAPI(
  userId: number,
  locationId: number
): Promise<boolean> {
  const res = await apiRequest<{ success: boolean }>(
    `/training-locations/${userId}/${locationId}`,
    { method: "DELETE" }
  );
  return !!res.success;
}

/**
 * Record the session's location on a plan day WITHOUT regenerating (§9). Used by
 * the picker when the chosen place needs no rebuild (same or more equipment), and
 * for the primary/bodyweight/one-off "Done" path.
 */
export async function setPlanDayLocationAPI(
  userId: number,
  planDayId: number,
  snapshot: TrainingLocationSnapshot
): Promise<boolean> {
  try {
    const res = await apiRequest<{ success: boolean }>(
      `/training-locations/${userId}/plan-day/${planDayId}`,
      { method: "PUT", body: JSON.stringify(snapshot) }
    );
    return !!res.success;
  } catch (error) {
    console.error("setPlanDayLocation error:", error);
    return false;
  }
}
