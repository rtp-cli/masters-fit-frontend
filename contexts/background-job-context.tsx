import { getJobStatus, invalidateActiveWorkoutCache } from "@lib/workouts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { LIMITS, TIMEOUTS } from "@/constants";
import { useAuth } from "@/contexts/auth-context";
import { useGenerationLifecycleEvents } from "@/hooks/use-generation-lifecycle-events";
import {
  trackGenerationModalDismissed,
  trackGenerationStarted,
} from "@/lib/generation-analytics";
import { tabEvents } from "@/lib/tab-events";

// Job types that represent a workout generation (for analytics + coordination).
const GENERATION_JOB_TYPES: BackgroundJob["type"][] = [
  "generation",
  "regeneration",
  "daily-regeneration",
];

// Scope of a completed generation — drives post-generation landing (Task 1)
// and the dock chip's ready copy (Task 2). "day" = single-day (daily-regen),
// "week" = full-week (generation / regeneration).
export type GenerationScope = "day" | "week";

const scopeForJobType = (type: BackgroundJob["type"]): GenerationScope =>
  type === "daily-regeneration" ? "day" : "week";

export interface JobDayStatus {
  dayNumber: number;
  label: string;
  status: "pending" | "generating" | "done" | "failed";
}

export interface BackgroundJob {
  id: number;
  type: "generation" | "regeneration" | "daily-regeneration";
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "timeout";
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  workoutId?: number;
  estimatedTimeRemaining?: number;
  message?: string;
  // Structured per-day generation timeline, recovered via polling so the
  // progressive UI works even when the websocket never delivered the events.
  phase?: "planning" | "generating_days" | "saving";
  days?: JobDayStatus[];
}

interface BackgroundJobContextType {
  jobs: BackgroundJob[];
  activeJobs: BackgroundJob[];
  completedJobs: BackgroundJob[];
  failedJobs: BackgroundJob[];
  hasActiveJobs: boolean;
  isGenerating: boolean; // True if any generation job is active
  isLoading: boolean;
  addJob: (
    jobId: number,
    type: BackgroundJob["type"],
  ) => Promise<BackgroundJob>;
  removeJob: (jobId: number) => Promise<void>;
  cancelJob: (jobId: number) => Promise<void>;
  updateJob: (jobId: number, updates: Partial<BackgroundJob>) => Promise<void>;
  reloadJobs: () => Promise<void>;
  pollJobStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  isJobCompletionProcessed: (jobId: number) => boolean; // Check if job completion was already processed
  // Reap a job from the websocket "complete" signal (the poll is the slow
  // path; the backend status can lag). Deduped with the poll-driven path.
  notifyJobComplete: (jobId: number, type: BackgroundJob["type"]) => void;

  // ── Generation modal coordination (lifted from WorkoutGenerationModal) ────
  // Single source of truth for whether the full-screen timeline modal is open,
  // so the dock chip and the modal's auto-show share one opener.
  isGenerationModalOpen: boolean;
  openGenerationModal: () => void;
  closeGenerationModal: () => void;

  // ── Post-generation landing + "Just generated" badge (Task 1) ─────────────
  // Route to the right tab by scope and flag the landed surface as fresh.
  landAfterGeneration: (scope: GenerationScope) => void;
  justGenerated: GenerationScope | null;
  clearJustGenerated: () => void;

  // ── Dock chip "ready" latch (Task 2) ──────────────────────────────────────
  // When generation completes in the background, the chip morphs to "ready"
  // and must persist until tapped — even after the job itself is reaped.
  readyChip: { id: number; scope: GenerationScope } | null;
  dismissReadyChip: () => void;
}

const BackgroundJobContext = createContext<
  BackgroundJobContextType | undefined
>(undefined);

const STORAGE_KEY = "background_jobs";

// Type guard to check if an object is a valid BackgroundJob
function isBackgroundJob(obj: any): obj is BackgroundJob {
  return (
    obj &&
    typeof obj.id === "number" &&
    typeof obj.type === "string" &&
    ["generation", "regeneration", "daily-regeneration"].includes(obj.type) &&
    typeof obj.status === "string" &&
    [
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
      "timeout",
    ].includes(obj.status) &&
    typeof obj.progress === "number" &&
    typeof obj.createdAt === "string"
  );
}

// Type guard for BackgroundJob['status']
function isValidJobStatus(status: any): status is BackgroundJob["status"] {
  return [
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
    "timeout",
  ].includes(status);
}

interface BackgroundJobProviderProps {
  children: ReactNode;
}

export function BackgroundJobProvider({
  children,
}: BackgroundJobProviderProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedCompletionsRef = useRef<Set<number>>(new Set()); // Track processed job completions
  const { triggerWorkoutReady } = useAuth();
  const router = useRouter();
  // Ref so landing callbacks always route via the live router without
  // re-creating themselves on every render.
  const routerRef = useRef(router);
  routerRef.current = router;
  // Live jobs mirror so stable callbacks (e.g. closeGenerationModal) can read
  // current jobs without re-creating themselves.
  const jobsRef = useRef<BackgroundJob[]>(jobs);
  jobsRef.current = jobs;

  // ── Generation modal coordination + landing/chip state ────────────────────
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  // Mirror in a ref so the completion handler (a stale-closure callback) can
  // read the live open/closed state to decide foreground vs background landing.
  const isModalOpenRef = useRef(false);
  const [justGenerated, setJustGenerated] = useState<GenerationScope | null>(
    null,
  );
  const [readyChip, setReadyChip] = useState<{
    id: number;
    scope: GenerationScope;
  } | null>(null);

  const openGenerationModal = useCallback(() => {
    isModalOpenRef.current = true;
    setIsGenerationModalOpen(true);
  }, []);
  const closeGenerationModal = useCallback(() => {
    isModalOpenRef.current = false;
    setIsGenerationModalOpen(false);
    // If a generation is still running when the user leaves the full-screen wait
    // UI, record that they stopped watching (it continues in the background dock).
    const activeGen = jobsRef.current.find(
      (j) =>
        (j.status === "pending" || j.status === "processing") &&
        GENERATION_JOB_TYPES.includes(j.type),
    );
    if (activeGen) trackGenerationModalDismissed(activeGen);
  }, []);
  const clearJustGenerated = useCallback(() => setJustGenerated(null), []);
  const dismissReadyChip = useCallback(() => setReadyChip(null), []);

  // Route to the scope-appropriate tab and flag the landed surface. Used by
  // the modal's "View Your Workout" button, the foreground completion beat,
  // and the dock chip's "View" action.
  const landAfterGeneration = useCallback((scope: GenerationScope) => {
    isModalOpenRef.current = false;
    setIsGenerationModalOpen(false);
    setReadyChip(null);
    setJustGenerated(scope);
    if (scope === "day") {
      routerRef.current.replace("/(tabs)/workout");
    } else {
      routerRef.current.replace("/(tabs)/calendar");
      // Re-select today in the month grid on arrival.
      tabEvents.emit("selectToday:calendar");
    }
  }, []);

  // Computed values
  const activeJobs = jobs.filter(
    (job) => job.status === "pending" || job.status === "processing",
  );

  const hasActiveJobs = activeJobs.length > 0;

  // Key flag: true if any generation/regeneration job is active
  const isGenerating = activeJobs.some(
    (job) =>
      job.type === "generation" ||
      job.type === "regeneration" ||
      job.type === "daily-regeneration",
  );

  // [AN-07] Client-perceived generation lifecycle events (first-progress, completed,
  // failed/timeout) are emitted by diffing job status transitions in this hook.
  useGenerationLifecycleEvents(jobs);

  const completedJobs = jobs.filter((job) => job.status === "completed");
  const failedJobs = jobs.filter(
    (job) =>
      job.status === "failed" ||
      job.status === "cancelled" ||
      job.status === "timeout",
  );

  // Load jobs from storage on mount
  useEffect(() => {
    loadJobsFromStorage();
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Start/stop polling based on active jobs
  useEffect(() => {
    if (activeJobs.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    // Always cleanup on unmount or when effect re-runs
    return () => stopPolling();
  }, [activeJobs.length]); // Removed startPolling/stopPolling from deps to prevent unnecessary re-runs

  const loadJobsFromStorage = async () => {
    try {
      const storedJobs = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedJobs) {
        const parsedJobs = JSON.parse(storedJobs);
        if (Array.isArray(parsedJobs) && parsedJobs.every(isBackgroundJob)) {
          // Only keep jobs from last 24 hours and not finished (completed, cancelled, timeout)
          const recentJobs = parsedJobs.filter((job) => {
            const jobDate = new Date(job.createdAt);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const finishedStatuses = ["completed", "cancelled", "timeout"];
            return (
              jobDate > oneDayAgo && !finishedStatuses.includes(job.status)
            );
          });

          setJobs(recentJobs);
        } else {
          console.warn(
            "[BackgroundJobContext] Invalid job data in storage, discarding.",
          );
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("[BackgroundJobContext] Error loading jobs:", error);
    }
  };

  const saveJobsToStorage = async (jobsToSave: BackgroundJob[]) => {
    try {
      const serialized = JSON.stringify(jobsToSave);
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error(
        "[BackgroundJobContext] Error saving jobs to storage:",
        error,
      );
    }
  };

  const addJob = useCallback(
    async (jobId: number, type: BackgroundJob["type"]) => {
      const newJob: BackgroundJob = {
        id: jobId,
        type,
        status: "pending",
        progress: 0,
        createdAt: new Date().toISOString(),
        estimatedTimeRemaining: getEstimatedTime(type),
      };

      // A new generation supersedes any prior one. Concurrent generations are
      // disallowed, so drop lingering generation jobs (e.g. a previous run the
      // poll never reaped because the backend status lagged) rather than let
      // the new run inherit its stale completed timeline / chip count. Also
      // clear any latched "ready" chip from the previous generation.
      const GEN_TYPES: BackgroundJob["type"][] = [
        "generation",
        "regeneration",
        "daily-regeneration",
      ];
      setJobs((prevJobs) => {
        const updatedJobs = [
          ...prevJobs.filter((j) => !GEN_TYPES.includes(j.type)),
          newJob,
        ];
        saveJobsToStorage(updatedJobs);
        return updatedJobs;
      });
      setReadyChip(null);

      // [analytics] Client-perceived generation start (thumb → generating). Terminal
      // and first-progress events are emitted from the status-transition effect below.
      trackGenerationStarted(jobId, type);

      // Set up automatic timeout for the job
      const timeoutDuration = getTimeoutForJobType(type);
      setTimeout(async () => {
        // Check if job is still activegh
        setJobs((currentJobs) => {
          const jobToTimeout = currentJobs.find((j) => j.id === jobId);
          if (
            jobToTimeout &&
            (jobToTimeout.status === "pending" ||
              jobToTimeout.status === "processing")
          ) {
            // Do one final poll to get the actual status/error from backend
            getJobStatus(jobId)
              .then((response) => {
                if (response?.success && response.job) {
                  const backendJob = response.job;
                  // If backend has a final status (completed/failed), use it
                  if (
                    backendJob.status === "completed" ||
                    backendJob.status === "failed"
                  ) {
                    setJobs((jobs) => {
                      const updatedJobs = jobs.map((j) =>
                        j.id === jobId
                          ? {
                              ...j,
                              status:
                                backendJob.status as BackgroundJob["status"],
                              error: backendJob.error || undefined,
                              progress: backendJob.progress,
                              workoutId: backendJob.workoutId,
                              completedAt:
                                backendJob.completedAt ||
                                new Date().toISOString(),
                            }
                          : j,
                      );
                      saveJobsToStorage(updatedJobs);
                      return updatedJobs;
                    });
                    return;
                  }
                }
                // Backend still processing or no response - mark as timeout
                setJobs((jobs) => {
                  const updatedJobs = jobs.map((j) =>
                    j.id === jobId
                      ? {
                          ...j,
                          status: "timeout" as const,
                          error:
                            "The generation took too long. Please try again.",
                          completedAt: new Date().toISOString(),
                        }
                      : j,
                  );
                  saveJobsToStorage(updatedJobs);
                  return updatedJobs;
                });
              })
              .catch(() => {
                // On error, mark as timeout
                setJobs((jobs) => {
                  const updatedJobs = jobs.map((j) =>
                    j.id === jobId
                      ? {
                          ...j,
                          status: "timeout" as const,
                          error:
                            "The generation took too long. Please try again.",
                          completedAt: new Date().toISOString(),
                        }
                      : j,
                  );
                  saveJobsToStorage(updatedJobs);
                  return updatedJobs;
                });
              });
          }
          return currentJobs;
        });
      }, timeoutDuration);

      return newJob;
    },
    [],
  );

  const removeJob = useCallback(async (jobId: number) => {
    setJobs((prevJobs) => {
      const updatedJobs = prevJobs.filter((job) => job.id !== jobId);
      saveJobsToStorage(updatedJobs);
      return updatedJobs;
    });
  }, []);

  const updateJob = useCallback(
    async (jobId: number, updates: Partial<BackgroundJob>) => {
      setJobs((prevJobs) => {
        const jobToUpdate = prevJobs.find((j) => j.id === jobId);
        if (!jobToUpdate) {
          console.error(
            `[BackgroundJobContext] Job #${jobId} not found for update!`,
          );
          return prevJobs;
        }

        const updatedJobs = prevJobs.map((job) =>
          job.id === jobId ? { ...job, ...updates } : job,
        );

        saveJobsToStorage(updatedJobs);
        return updatedJobs;
      });
    },
    [],
  );

  const cancelJob = useCallback(
    async (jobId: number) => {
      // Update job status to cancelled
      await updateJob(jobId, {
        status: "cancelled",
        error: "Cancelled by user",
        completedAt: new Date().toISOString(),
      });
      setTimeout(() => {
        removeJob(jobId);
      }, 2000);
    },
    [updateJob, removeJob],
  );

  const reloadJobs = useCallback(async () => {
    await loadJobsFromStorage();
  }, []);

  const pollJobStatus = useCallback(async () => {
    // Get fresh jobs from state to avoid stale closure
    const currentJobs = jobs.filter(
      (job) => job.status === "pending" || job.status === "processing",
      // Note: Don't poll jobs that are already completed, failed, cancelled, or timeout on frontend
      // as those are final states we've already processed
    );

    if (currentJobs.length === 0) return;

    setIsLoading(true);

    try {
      const statusPromises = currentJobs.map((job) =>
        getJobStatus(job.id).then((response) => ({ job, response })),
      );

      const results = await Promise.allSettled(statusPromises);

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.response?.success) {
          const { job, response } = result.value;
          const jobStatus = response.job;

          // Validate the status from the API
          const newStatus = isValidJobStatus(jobStatus.status)
            ? jobStatus.status
            : job.status;

          // Update job with latest status
          await updateJob(job.id, {
            status: newStatus,
            progress: jobStatus.progress,
            completedAt: jobStatus.completedAt,
            error: jobStatus.error,
            workoutId: jobStatus.workoutId,
            phase: jobStatus.phase,
            days: jobStatus.days,
            estimatedTimeRemaining: calculateRemainingTime(
              job.type,
              jobStatus.progress,
              job.createdAt,
            ),
          });

          // If job completed, handle completion
          if (jobStatus.status === "completed" && !job.completedAt) {
            onJobCompleted(job.id, jobStatus.workoutId, job.type);
          }
        }
      }
    } catch (error) {
      // Only log actual errors, not routine polling issues
      if (error?.message !== "Job not found") {
        console.error("[BackgroundJobContext] Polling error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobs, updateJob]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling

    // Poll immediately, then on a fast cadence so the progressive generation
    // timeline tracks the backend closely on device (where the websocket is
    // unreliable). Active jobs here are all short-lived generation work.
    pollJobStatus();
    pollIntervalRef.current = setInterval(
      pollJobStatus,
      TIMEOUTS.GENERATION_POLL_INTERVAL,
    );
  }, [pollJobStatus]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Helper function to manage bounded processed completions set
  const addProcessedCompletion = useCallback((jobId: number) => {
    // If we're at max capacity, remove the oldest entries
    if (
      processedCompletionsRef.current.size >= LIMITS.MAX_PROCESSED_COMPLETIONS
    ) {
      // Convert Set to Array, take only the recent half, convert back to Set
      const completionsArray = Array.from(processedCompletionsRef.current);
      const recentCompletions = completionsArray.slice(
        -Math.floor(LIMITS.MAX_PROCESSED_COMPLETIONS / 2),
      );
      processedCompletionsRef.current = new Set(recentCompletions);
    }

    processedCompletionsRef.current.add(jobId);
  }, []);

  const onJobCompleted = useCallback(
    (jobId: number, workoutId?: number, type?: BackgroundJob["type"]) => {
      // Check if we've already processed this completion to avoid double processing
      if (processedCompletionsRef.current.has(jobId)) {
        console.log(
          `[BackgroundJobContext] Job ${jobId} completion already processed, skipping`,
        );
        return;
      }

      // Mark this completion as processed with bounds checking
      addProcessedCompletion(jobId);

      // Invalidate cache to ensure fresh data
      invalidateActiveWorkoutCache();

      // Trigger the proper workout ready flow (shows warming up screen)
      triggerWorkoutReady();

      // Post-generation landing (Task 1) / dock chip (Task 2). If the user was
      // watching the timeline modal (foreground), auto-navigate after a brief
      // "ready" beat. If they tapped "Continue Using App" (background), do NOT
      // navigate — latch the ready chip so they return on their own terms.
      const scope = scopeForJobType(type ?? "generation");
      if (isModalOpenRef.current) {
        setTimeout(() => landAfterGeneration(scope), 1500);
      } else {
        setReadyChip({ id: jobId, scope });
      }

      // Remove the completed job after a short delay to show completion. The
      // ready chip is latched separately above, so it persists past this.
      setTimeout(() => {
        removeJob(jobId);
        // Clean up the processed completion tracking after removal
        processedCompletionsRef.current.delete(jobId);
      }, 2000);
    },
    [
      triggerWorkoutReady,
      removeJob,
      addProcessedCompletion,
      landAfterGeneration,
    ],
  );

  // Function to check if job completion has been processed
  const isJobCompletionProcessed = useCallback((jobId: number): boolean => {
    return processedCompletionsRef.current.has(jobId);
  }, []);

  // Websocket-driven completion. The live socket reports "complete" before (or
  // instead of) the poll catching the backend status, so reap here too. Shares
  // onJobCompleted's processed-completions dedup, so it runs exactly once
  // whichever source fires first.
  const notifyJobComplete = useCallback(
    (jobId: number, type: BackgroundJob["type"]) => {
      onJobCompleted(jobId, undefined, type);
    },
    [onJobCompleted],
  );

  // Helper functions
  const getEstimatedTime = (type: BackgroundJob["type"]): number => {
    switch (type) {
      case "generation":
        return 120; // 2 minutes
      case "regeneration":
        return 90; // 1.5 minutes
      case "daily-regeneration":
        return 60; // 1 minute
      default:
        return 120;
    }
  };

  const getTimeoutForJobType = (type: BackgroundJob["type"]): number => {
    switch (type) {
      case "generation":
        return 10 * 60 * 1000; // 10 minutes
      case "regeneration":
        return 5 * 60 * 1000; // 5 minutes
      case "daily-regeneration":
        return 3 * 60 * 1000; // 3 minutes
      default:
        return 10 * 60 * 1000; // 10 minutes
    }
  };

  const calculateRemainingTime = (
    type: BackgroundJob["type"],
    progress: number,
    createdAt: string,
  ): number => {
    if (progress >= 100) return 0;

    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
    const estimated = getEstimatedTime(type);

    if (progress > 0) {
      const timePerPercent = elapsed / progress;
      return Math.max(0, Math.round((100 - progress) * timePerPercent));
    }

    return Math.max(0, estimated - Math.round(elapsed));
  };

  const value: BackgroundJobContextType = {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    hasActiveJobs,
    isGenerating,
    isLoading,
    addJob,
    removeJob,
    cancelJob,
    updateJob,
    reloadJobs,
    pollJobStatus,
    startPolling,
    stopPolling,
    isJobCompletionProcessed,
    notifyJobComplete,
    isGenerationModalOpen,
    openGenerationModal,
    closeGenerationModal,
    landAfterGeneration,
    justGenerated,
    clearJustGenerated,
    readyChip,
    dismissReadyChip,
  };

  return (
    <BackgroundJobContext.Provider value={value}>
      {children}
    </BackgroundJobContext.Provider>
  );
}

export function useBackgroundJobs() {
  const context = useContext(BackgroundJobContext);
  if (context === undefined) {
    throw new Error(
      "useBackgroundJobs must be used within a BackgroundJobProvider",
    );
  }
  return context;
}
