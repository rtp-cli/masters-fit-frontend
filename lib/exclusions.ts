import {
  type ExcludedExercise,
  type ExclusionReason,
  type RelatedScheduledExercise,
  type ReplacementCandidate,
} from "@/types/api";

import { apiRequest } from "./api";

export type {
  ExcludedExercise,
  ExclusionReason,
  RelatedScheduledExercise,
  ReplacementCandidate,
} from "@/types/api";

/**
 * The user's excluded exercises (Settings → Excluded exercises, 1g). Returned
 * flat and reason-ordered; the screen groups them.
 */
export async function getExclusionsAPI(
  userId: number
): Promise<ExcludedExercise[]> {
  try {
    const res = await apiRequest<{
      success: boolean;
      exclusions: ExcludedExercise[];
    }>(`/exclusions/${userId}`);
    return res.success ? res.exclusions : [];
  } catch (error) {
    console.error("getExclusions error:", error);
    return [];
  }
}

/**
 * Ranked replacements for a slot (1e / 1f): owned-equipment only, original and
 * all exclusions filtered out, ordered by muscle-overlap → difficulty distance
 * → hasDemo.
 */
export async function getReplacementsAPI(
  userId: number,
  exerciseId: number,
  limit = 3
): Promise<ReplacementCandidate[]> {
  try {
    const res = await apiRequest<{
      success: boolean;
      candidates: ReplacementCandidate[];
    }>(`/exclusions/${userId}/replacements?exerciseId=${exerciseId}&limit=${limit}`);
    return res.success ? res.candidates : [];
  } catch (error) {
    console.error("getReplacements error:", error);
    return [];
  }
}

/**
 * Future incomplete plan days that still contain the exercise — day names only,
 * for the 1c sweep disclosure ("It's also in Saturday's workout").
 */
export async function getSweepPreviewAPI(
  userId: number,
  exerciseId: number
): Promise<string[]> {
  try {
    const res = await apiRequest<{ success: boolean; dayNames: string[] }>(
      `/exclusions/${userId}/sweep-preview?exerciseId=${exerciseId}`
    );
    return res.success ? res.dayNames : [];
  } catch (error) {
    console.error("getSweepPreview error:", error);
    return [];
  }
}

/**
 * Other exercises scheduled in the upcoming plan overlapping on muscle group —
 * the 1d list.
 */
export async function getRelatedScheduledAPI(
  userId: number,
  exerciseId: number
): Promise<RelatedScheduledExercise[]> {
  try {
    const res = await apiRequest<{
      success: boolean;
      related: RelatedScheduledExercise[];
    }>(`/exclusions/${userId}/related?exerciseId=${exerciseId}`);
    return res.success ? res.related : [];
  } catch (error) {
    console.error("getRelatedScheduled error:", error);
    return [];
  }
}

/**
 * Commit exclusions (the originating exercise plus any 1d additions), optionally
 * add a limitation (explicit opt-in, never inferred), and sweep future plan
 * days. Returns the swept day names (for confirmation — never a count).
 */
export async function addExclusionsAPI(
  userId: number,
  exclusions: { exerciseId: number; reason: ExclusionReason }[],
  addLimitation?: string | null
): Promise<{ success: boolean; sweptDayNames: string[] }> {
  try {
    const res = await apiRequest<{
      success: boolean;
      sweptDayNames: string[];
    }>(`/exclusions/${userId}`, {
      method: "POST",
      body: JSON.stringify({ exclusions, addLimitation: addLimitation ?? null }),
    });
    return { success: !!res.success, sweptDayNames: res.sweptDayNames ?? [] };
  } catch (error) {
    console.error("addExclusions error:", error);
    return { success: false, sweptDayNames: [] };
  }
}

/**
 * Allow an excluded exercise back into future plans (the 1g reversal).
 */
export async function removeExclusionAPI(
  userId: number,
  exerciseId: number
): Promise<boolean> {
  try {
    const res = await apiRequest<{ success: boolean }>(
      `/exclusions/${userId}/${exerciseId}`,
      { method: "DELETE" }
    );
    return !!res.success;
  } catch (error) {
    console.error("removeExclusion error:", error);
    return false;
  }
}
