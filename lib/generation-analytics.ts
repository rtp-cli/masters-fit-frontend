import { AnalyticsEvent, trackEvent } from "./analytics-events";

/**
 * Client-perceived workout-generation timing events.
 *
 * The backend already tracks generation success/failure server-side, but it can't
 * see the *user's* clock — the wait from tapping "Generate" to a usable workout, or
 * whether they stopped watching. These events capture that client-perceived journey
 * so we can measure generation UX (time-to-first-progress, time-to-ready, failure
 * rate, and drop-off), keyed to the same user (via Mixpanel identify by uuid) as the
 * backend events. Event names + property shapes live in the registry
 * (lib/analytics-events.ts).
 *
 * `ms_since_start` is measured from the job's `createdAt` (set when the generation
 * was kicked off), so it survives an app restart mid-generation.
 */

interface GenJobLike {
  id: number;
  type: string;
  createdAt: string;
  status?: string;
  error?: string;
}

// Dedup guard so "first progress" fires at most once per generation.
const firstProgressFired = new Set<number>();

function msSinceStart(createdAt: string): number | undefined {
  const started = new Date(createdAt).getTime();
  return Number.isFinite(started) ? Date.now() - started : undefined;
}

/** User initiated a generation (fired when the job is registered client-side). */
export function trackGenerationStarted(jobId: number, scope: string): void {
  firstProgressFired.delete(jobId);
  trackEvent(AnalyticsEvent.GENERATION_STARTED, {
    generation_id: jobId,
    scope,
  });
}

/** First real progress the user sees — the perceived "it's working" moment. */
export function trackGenerationFirstProgress(job: GenJobLike): void {
  if (firstProgressFired.has(job.id)) return;
  firstProgressFired.add(job.id);
  trackEvent(AnalyticsEvent.GENERATION_FIRST_PROGRESS, {
    generation_id: job.id,
    scope: job.type,
    ms_since_start: msSinceStart(job.createdAt),
  });
}

/** Generation finished and a usable workout is ready — the tap→ready number. */
export function trackGenerationCompleted(job: GenJobLike): void {
  firstProgressFired.delete(job.id);
  trackEvent(AnalyticsEvent.GENERATION_COMPLETED, {
    generation_id: job.id,
    scope: job.type,
    ms_since_start: msSinceStart(job.createdAt),
  });
}

/** Generation failed or timed out — the other half of success rate. */
export function trackGenerationFailed(job: GenJobLike): void {
  firstProgressFired.delete(job.id);
  trackEvent(AnalyticsEvent.GENERATION_FAILED, {
    generation_id: job.id,
    scope: job.type,
    status: job.status,
    error: job.error,
    ms_since_start: msSinceStart(job.createdAt),
  });
}

/**
 * User dismissed the full-screen generation modal while a generation was still
 * running. Not the same as abandoning the generation (it continues in the
 * background dock), but it's the truest "stopped watching the wait" signal — a
 * proxy for the wait feeling too long.
 */
export function trackGenerationModalDismissed(job: GenJobLike): void {
  trackEvent(AnalyticsEvent.GENERATION_MODAL_DISMISSED, {
    generation_id: job.id,
    scope: job.type,
    ms_since_start: msSinceStart(job.createdAt),
  });
}
