import { useEffect, useRef } from "react";

import {
  trackGenerationCompleted,
  trackGenerationFailed,
  trackGenerationFirstProgress,
} from "@/lib/generation-analytics";

interface LifecycleJob {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  error?: string;
}

const GENERATION_JOB_TYPES = [
  "generation",
  "regeneration",
  "daily-regeneration",
];

/**
 * [AN-07] Emits client-perceived generation lifecycle events (first-progress,
 * completed, failed/timeout) by diffing job status transitions. Extracted from
 * BackgroundJobProvider so the analytics concern is isolated and the provider stays
 * smaller. `started` and `modal_dismissed` are emitted at their explicit call sites
 * (addJob / closeGenerationModal); this hook owns the status-transition events.
 *
 * Diffing covers the websocket, poll, and timeout update paths uniformly and fires
 * each event once. Jobs restored from storage already in a terminal state are
 * skipped (they aren't transitions we witnessed).
 */
export function useGenerationLifecycleEvents(jobs: LifecycleJob[]): void {
  const prevJobStatusRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const prev = prevJobStatusRef.current;
    for (const job of jobs) {
      if (!GENERATION_JOB_TYPES.includes(job.type)) continue;
      const before = prev.get(job.id);
      if (before === job.status) continue;

      const firstSightTerminal =
        before === undefined &&
        (job.status === "completed" ||
          job.status === "failed" ||
          job.status === "timeout" ||
          job.status === "cancelled");
      if (firstSightTerminal) continue;

      if (job.status === "processing") {
        trackGenerationFirstProgress(job);
      } else if (job.status === "completed") {
        trackGenerationFirstProgress(job); // in case it jumped straight to done
        trackGenerationCompleted(job);
      } else if (job.status === "failed" || job.status === "timeout") {
        trackGenerationFailed(job);
      }
    }
    const next = new Map<number, string>();
    for (const job of jobs) next.set(job.id, job.status);
    prevJobStatusRef.current = next;
  }, [jobs]);
}
