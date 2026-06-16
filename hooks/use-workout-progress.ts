import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCurrentUser } from '@/lib/auth';
import { API_BASE_URL } from "@/constants";

export interface GenerationDayStatus {
  dayNumber: number;
  label: string;
  status: "pending" | "generating" | "done" | "failed";
}

export type GenerationPhase = "planning" | "generating_days" | "saving";

export interface ProgressEvent {
  progress: number; // 0-100
  complete?: boolean;
  error?: string;
  // Structured status from fan-out generation (optional on legacy events)
  phase?: GenerationPhase;
  days?: GenerationDayStatus[];
}

interface UseWorkoutProgressReturn {
  progress: number;
  isComplete: boolean;
  error: string | null;
  isConnected: boolean;
  phase: GenerationPhase | null;
  days: GenerationDayStatus[];
}

/**
 * Drives the progressive generation timeline. Updates arrive from two sources
 * that feed the SAME processing pipeline:
 *   1. the live websocket (instant, but unreliable on device / behind Render's
 *      proxy — a dropped or reconnected socket loses fire-and-forget events);
 *   2. `polledEvent` — the per-day status recovered from polling the job-status
 *      endpoint, which is reliable everywhere.
 *
 * The ref-based dedup below only ever advances state forward (a `done` day is
 * never reverted), so the two sources can safely drive it concurrently: the
 * socket gives instant updates when it works, polling guarantees the timeline
 * still completes when it doesn't.
 */
export function useWorkoutProgress(
  polledEvent?: ProgressEvent | null,
  activeJobId?: number | null
): UseWorkoutProgressReturn {
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const [days, setDays] = useState<GenerationDayStatus[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);
  // Sequential completion display: generation is parallel on the backend, but
  // we animate completions in day-number order so the UI reads as sequential.
  const displayDaysRef = useRef<GenerationDayStatus[]>([]);
  const pendingDoneRef = useRef<Set<number>>(new Set());
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetDayState = useCallback(() => {
    if (releaseTimerRef.current !== null) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    pendingDoneRef.current.clear();
    displayDaysRef.current = [];
    setDays([]);
  }, []);

  // Release the next pending completion in day-number order, then schedule
  // itself again after a short interval if more are waiting. This also smooths
  // out chunky polled snapshots (a poll delivering several done days at once
  // still animates them one-by-one).
  const scheduleRelease = useCallback(() => {
    if (releaseTimerRef.current !== null) return; // already scheduled

    const tryRelease = () => {
      if (!mountedRef.current) return;
      releaseTimerRef.current = null;
      const current = displayDaysRef.current;
      if (!current.length || !pendingDoneRef.current.size) return;

      const sorted = [...current].sort((a, b) => a.dayNumber - b.dayNumber);
      for (let i = 0; i < sorted.length; i++) {
        const d = sorted[i];
        if (!pendingDoneRef.current.has(d.dayNumber) || d.status === 'done') continue;
        // Only release if the preceding day (by position) is already shown as done
        const prevDone = i === 0 || sorted[i - 1].status === 'done';
        if (!prevDone) continue;

        pendingDoneRef.current.delete(d.dayNumber);
        const updated = current.map(x =>
          x.dayNumber === d.dayNumber ? { ...x, status: 'done' as const } : x
        );
        displayDaysRef.current = updated;
        setDays(updated);

        if (pendingDoneRef.current.size > 0) {
          releaseTimerRef.current = setTimeout(tryRelease, 350);
        }
        return;
      }
      // A pending done exists but its predecessor isn't done yet; the next
      // event will call scheduleRelease again when that changes.
    };

    releaseTimerRef.current = setTimeout(tryRelease, 350);
  }, []);

  // Shared handler for a progress update from EITHER the socket or polling.
  const processProgressEvent = useCallback((data: ProgressEvent) => {
    if (!mountedRef.current || !data) return;

    setProgress(data.progress);
    setIsComplete(data.complete || false);
    setError(data.error || null);
    if (data.phase) setPhase(data.phase);
    if (data.complete) setPhase(null);

    // Reset day state only when a NEW generation starts (planning phase).
    // On completion we keep days visible so the user sees the completed
    // timeline before they dismiss the modal.
    if (data.phase === 'planning') {
      resetDayState();
      return;
    }

    // completion event carries no days — nothing more to process
    if (data.complete) return;

    if (!data.days) return;

    const sortedBackend = [...data.days].sort((a, b) => a.dayNumber - b.dayNumber);

    // Collect newly done days from the backend into the pending queue
    sortedBackend.forEach(d => {
      if (d.status === 'done') pendingDoneRef.current.add(d.dayNumber);
    });

    if (displayDaysRef.current.length === 0) {
      // First time seeing days — initialize with backend statuses,
      // but hold any 'done' statuses for sequential release.
      const initialized = sortedBackend.map(d => ({
        ...d,
        status: (d.status === 'done' ? 'generating' : d.status) as GenerationDayStatus['status'],
      }));
      displayDaysRef.current = initialized;
      setDays(initialized);
    } else {
      // Propagate forward-only status changes from backend:
      //   pending → generating  (day_started fired)
      //   pending/generating → failed
      // Never revert a displayed 'done' or 'failed' state.
      let changed = false;
      const updated = displayDaysRef.current.map(existing => {
        const backend = sortedBackend.find(b => b.dayNumber === existing.dayNumber);
        if (!backend || existing.status === 'done' || existing.status === 'failed') return existing;
        if (backend.status === 'generating' && existing.status === 'pending') {
          changed = true;
          return { ...existing, status: 'generating' as const };
        }
        if (backend.status === 'failed') {
          changed = true;
          return { ...existing, status: 'failed' as const };
        }
        return existing;
      });
      if (changed) {
        displayDaysRef.current = updated;
        setDays(updated);
      }
    }

    scheduleRelease();
  }, [resetDayState, scheduleRelease]);

  // Socket source — instant updates when the connection holds.
  useEffect(() => {
    mountedRef.current = true;

    const initializeSocket = async () => {
      try {
        const user = await getCurrentUser();
        if (!user || !mountedRef.current) return;

        userIdRef.current = user.id;

        const socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          if (userIdRef.current) {
            socket.emit('join-user-room', userIdRef.current);
          }
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('WebSocket connection error:', err);
          setIsConnected(false);
        });

        socket.on('workout-progress', (data: ProgressEvent) => {
          processProgressEvent(data);
        });
      } catch (err) {
        console.error('Error initializing WebSocket:', err);
      }
    };

    initializeSocket();

    return () => {
      mountedRef.current = false;
      if (releaseTimerRef.current !== null) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [processProgressEvent]);

  // Reset all progress state when the active job changes. A new generation —
  // or switching from a weekly to a daily regen — must not inherit the
  // previous job's timeline. Forward-only processing won't clear it on its own
  // because a job that emits no `days` (e.g. daily regen) never overwrites the
  // old ones. Declared before the polled effect so the reset runs first.
  const activeJobIdRef = useRef<number | null | undefined>(activeJobId);
  useEffect(() => {
    if (activeJobIdRef.current === activeJobId) return;
    activeJobIdRef.current = activeJobId;
    resetDayState();
    setProgress(0);
    setIsComplete(false);
    setError(null);
    setPhase(null);
  }, [activeJobId, resetDayState]);

  // Polled source — reliable fallback that drives the same pipeline. Runs
  // whenever a fresh polled snapshot arrives.
  useEffect(() => {
    if (polledEvent) processProgressEvent(polledEvent);
  }, [polledEvent, processProgressEvent]);

  return {
    progress,
    isComplete,
    error,
    isConnected,
    phase,
    days,
  };
}

/**
 * Hook for listening to progress updates for a specific job
 */
export function useJobProgress(jobId: number | null): UseWorkoutProgressReturn {
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const [days, setDays] = useState<GenerationDayStatus[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<number | null>(null);
  const displayDaysRef = useRef<GenerationDayStatus[]>([]);
  const pendingDoneRef = useRef<Set<number>>(new Set());
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setProgress(0);
      setIsComplete(false);
      setError(null);
      setPhase(null);
      setDays([]);
      displayDaysRef.current = [];
      pendingDoneRef.current.clear();
      return;
    }

    let mounted = true;

    const resetDayState = () => {
      if (releaseTimerRef.current !== null) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      pendingDoneRef.current.clear();
      displayDaysRef.current = [];
      setDays([]);
    };

    const scheduleRelease = () => {
      if (releaseTimerRef.current !== null) return;

      const tryRelease = () => {
        if (!mounted) return;
        releaseTimerRef.current = null;
        const current = displayDaysRef.current;
        if (!current.length || !pendingDoneRef.current.size) return;

        const sorted = [...current].sort((a, b) => a.dayNumber - b.dayNumber);
        for (let i = 0; i < sorted.length; i++) {
          const d = sorted[i];
          if (!pendingDoneRef.current.has(d.dayNumber) || d.status === 'done') continue;
          const prevDone = i === 0 || sorted[i - 1].status === 'done';
          if (!prevDone) continue;

          pendingDoneRef.current.delete(d.dayNumber);
          const updated = current.map(x =>
            x.dayNumber === d.dayNumber ? { ...x, status: 'done' as const } : x
          );
          displayDaysRef.current = updated;
          setDays(updated);

          if (pendingDoneRef.current.size > 0) {
            releaseTimerRef.current = setTimeout(tryRelease, 350);
          }
          return;
        }
      };

      releaseTimerRef.current = setTimeout(tryRelease, 350);
    };

    const initializeSocket = async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        if (!user || !mounted) return;

        userIdRef.current = user.id;

        // Create socket connection
        const socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });

        socketRef.current = socket;

        // Connection handlers
        socket.on('connect', () => {
          console.log('WebSocket connected for job:', jobId);
          setIsConnected(true);

          // Join user-specific room
          if (userIdRef.current) {
            socket.emit('join-user-room', userIdRef.current);
          }
        });

        socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('WebSocket connection error:', err);
          setIsConnected(false);
        });

        // Listen for workout progress updates
        socket.on('workout-progress', (data: ProgressEvent) => {
          console.log('Job progress update:', data);
          if (!mounted) return;

          setProgress(data.progress);
          setIsComplete(data.complete || false);
          setError(data.error || null);
          if (data.phase) setPhase(data.phase);
          if (data.complete) setPhase(null);

          if (data.phase === 'planning') {
            resetDayState();
            return;
          }

          if (data.complete) return;

          if (!data.days) return;

          const sortedBackend = [...data.days].sort((a, b) => a.dayNumber - b.dayNumber);

          sortedBackend.forEach(d => {
            if (d.status === 'done') pendingDoneRef.current.add(d.dayNumber);
          });

          if (displayDaysRef.current.length === 0) {
            const initialized = sortedBackend.map(d => ({
              ...d,
              status: (d.status === 'done' ? 'generating' : d.status) as GenerationDayStatus['status'],
            }));
            displayDaysRef.current = initialized;
            setDays(initialized);
          } else {
            let changed = false;
            const updated = displayDaysRef.current.map(existing => {
              const backend = sortedBackend.find(b => b.dayNumber === existing.dayNumber);
              if (!backend || existing.status === 'done' || existing.status === 'failed') return existing;
              if (backend.status === 'generating' && existing.status === 'pending') {
                changed = true;
                return { ...existing, status: 'generating' as const };
              }
              if (backend.status === 'failed') {
                changed = true;
                return { ...existing, status: 'failed' as const };
              }
              return existing;
            });
            if (changed) {
              displayDaysRef.current = updated;
              setDays(updated);
            }
          }

          scheduleRelease();
        });

      } catch (err) {
        console.error('Error initializing WebSocket for job:', err);
      }
    };

    initializeSocket();

    // Cleanup
    return () => {
      mounted = false;
      if (releaseTimerRef.current !== null) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [jobId]);

  return {
    progress,
    isComplete,
    error,
    isConnected,
    phase,
    days,
  };
}