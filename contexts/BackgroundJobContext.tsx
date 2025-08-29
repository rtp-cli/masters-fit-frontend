import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getJobStatus, invalidateActiveWorkoutCache } from "@lib/workouts";
import { useAuth } from "@contexts/AuthContext";

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
    type: BackgroundJob["type"]
  ) => Promise<BackgroundJob>;
  removeJob: (jobId: number) => Promise<void>;
  cancelJob: (jobId: number) => Promise<void>;
  updateJob: (jobId: number, updates: Partial<BackgroundJob>) => Promise<void>;
  reloadJobs: () => Promise<void>;
  pollJobStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  isJobCompletionProcessed: (jobId: number) => boolean; // Check if job completion was already processed
}

const BackgroundJobContext = createContext<
  BackgroundJobContextType | undefined
>(undefined);

const STORAGE_KEY = "background_jobs";
const POLL_INTERVAL = 5000; // 5 seconds

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
  const { user, triggerWorkoutReady } = useAuth();

  // Computed values
  const activeJobs = jobs.filter(
    (job) => job.status === "pending" || job.status === "processing"
  );

  const hasActiveJobs = activeJobs.length > 0;

  // Key flag: true if any generation/regeneration job is active
  const isGenerating = activeJobs.some(
    (job) =>
      job.type === "generation" ||
      job.type === "regeneration" ||
      job.type === "daily-regeneration"
  );

  const completedJobs = jobs.filter((job) => job.status === "completed");
  const failedJobs = jobs.filter(
    (job) =>
      job.status === "failed" ||
      job.status === "cancelled" ||
      job.status === "timeout"
  );

  // Load jobs from storage on mount
  useEffect(() => {
    loadJobsFromStorage();
  }, []);

  // Start/stop polling based on active jobs
  useEffect(() => {
    if (activeJobs.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [activeJobs.length, startPolling, stopPolling]);

  const loadJobsFromStorage = async () => {
    try {
      const storedJobs = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedJobs) {
        const parsedJobs = JSON.parse(storedJobs) as BackgroundJob[];
        // Only keep jobs from last 24 hours and not finished (completed, cancelled, timeout)
        const recentJobs = parsedJobs.filter((job) => {
          const jobDate = new Date(job.createdAt);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const finishedStatuses = ["completed", "cancelled", "timeout"];
          return jobDate > oneDayAgo && !finishedStatuses.includes(job.status);
        });

        setJobs(recentJobs);
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
        error
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

      setJobs((prevJobs) => {
        const updatedJobs = [...prevJobs, newJob];
        saveJobsToStorage(updatedJobs);
        return updatedJobs;
      });

      // Set up automatic timeout for the job
      const timeoutDuration = getTimeoutForJobType(type);
      setTimeout(() => {
        // Check if job is still active and timeout it
        setJobs((currentJobs) => {
          const jobToTimeout = currentJobs.find((j) => j.id === jobId);
          if (
            jobToTimeout &&
            (jobToTimeout.status === "pending" ||
              jobToTimeout.status === "processing")
          ) {
            const updatedJobs = currentJobs.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: "timeout" as const,
                    error: "Job timed out",
                    completedAt: new Date().toISOString(),
                  }
                : j
            );
            saveJobsToStorage(updatedJobs);
            return updatedJobs;
          }
          return currentJobs;
        });
      }, timeoutDuration);

      return newJob;
    },
    []
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
            `[BackgroundJobContext] Job #${jobId} not found for update!`
          );
          return prevJobs;
        }

        const updatedJobs = prevJobs.map((job) =>
          job.id === jobId ? { ...job, ...updates } : job
        );

        saveJobsToStorage(updatedJobs);
        return updatedJobs;
      });
    },
    []
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
    [updateJob, removeJob]
  );

  const reloadJobs = useCallback(async () => {
    await loadJobsFromStorage();
  }, []);

  const pollJobStatus = useCallback(async () => {
    // Get fresh jobs from state to avoid stale closure
    const currentJobs = jobs.filter(
      (job) => job.status === "pending" || job.status === "processing"
      // Note: Don't poll jobs that are already completed, failed, cancelled, or timeout on frontend
      // as those are final states we've already processed
    );

    if (currentJobs.length === 0) return;

    setIsLoading(true);

    try {
      const statusPromises = currentJobs.map((job) =>
        getJobStatus(job.id).then((response) => ({ job, response }))
      );

      const results = await Promise.allSettled(statusPromises);

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.response?.success) {
          const { job, response } = result.value;
          const jobStatus = response.job;

          // Update job with latest status
          await updateJob(job.id, {
            status: jobStatus.status as BackgroundJob["status"],
            progress: jobStatus.progress,
            completedAt: jobStatus.completedAt,
            error: jobStatus.error,
            workoutId: jobStatus.workoutId,
            estimatedTimeRemaining: calculateRemainingTime(
              job.type,
              jobStatus.progress,
              job.createdAt
            ),
          });

          // If job completed, handle completion
          if (jobStatus.status === "completed" && !job.completedAt) {
            onJobCompleted(job.id, jobStatus.workoutId);
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

    // Poll immediately, then every 5 seconds
    pollJobStatus();
    pollIntervalRef.current = setInterval(pollJobStatus, POLL_INTERVAL);
  }, [pollJobStatus]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const onJobCompleted = useCallback(
    (jobId: number, workoutId?: number) => {
      // Check if we've already processed this completion to avoid double processing
      if (processedCompletionsRef.current.has(jobId)) {
        console.log(
          `[BackgroundJobContext] Job ${jobId} completion already processed, skipping`
        );
        return;
      }

      // Mark this completion as processed
      processedCompletionsRef.current.add(jobId);

      // Invalidate cache to ensure fresh data
      invalidateActiveWorkoutCache();

      // Trigger the proper workout ready flow (shows warming up screen)
      triggerWorkoutReady();

      // Remove the completed job after a short delay to show completion
      setTimeout(() => {
        removeJob(jobId);
        // Clean up the processed completion tracking after removal
        processedCompletionsRef.current.delete(jobId);
      }, 2000);
    },
    [triggerWorkoutReady, removeJob]
  );

  // Function to check if job completion has been processed
  const isJobCompletionProcessed = useCallback((jobId: number): boolean => {
    return processedCompletionsRef.current.has(jobId);
  }, []);

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
    createdAt: string
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
      "useBackgroundJobs must be used within a BackgroundJobProvider"
    );
  }
  return context;
}
