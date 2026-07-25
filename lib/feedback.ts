import { apiRequest } from "./api";

export type FeedbackEffort = "too_easy" | "just_right" | "too_hard";
export type FeedbackTimeFit = "finished_early" | "about_right" | "ran_out";
export type FeedbackEndedEarlyReason =
  | "ran_out_of_time"
  | "too_hard"
  | "something_hurt"
  | "lost_interest"
  | "interrupted";
export type FeedbackNoteSource = "text" | "voice";

export interface PlanDayFeedback {
  id: number;
  userId: number;
  planDayId: number;
  effort: FeedbackEffort | null;
  timeFit: FeedbackTimeFit | null;
  endedEarlyReason: FeedbackEndedEarlyReason | null;
  note: string | null;
  noteSource: FeedbackNoteSource | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPlanDayFeedbackParams {
  planDayId: number;
  effort?: FeedbackEffort;
  timeFit?: FeedbackTimeFit;
  endedEarlyReason?: FeedbackEndedEarlyReason;
  note?: string;
  noteSource?: FeedbackNoteSource;
}

/**
 * Upsert post-workout feedback for a plan day. Answers save independently —
 * the card calls this per tap, and only the fields sent are overwritten.
 * Returns null on failure; feedback is best-effort and must never block the
 * summary screen.
 */
export async function savePlanDayFeedback(
  params: UpsertPlanDayFeedbackParams
): Promise<PlanDayFeedback | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      feedback: PlanDayFeedback;
    }>(`/logs/feedback`, {
      method: "PUT",
      body: JSON.stringify(params),
    });
    return response.feedback;
  } catch (error) {
    console.error("Error saving workout feedback:", error);
    return null;
  }
}
