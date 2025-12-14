import React, {
  createContext,
  useState,
  ReactNode,
  useContext,
  useRef,
} from "react";
import { trackWorkoutAbandoned } from "@/lib/analytics";
import { useAuth } from "@/contexts/auth-context";

// Workout abandonment tracking data
interface WorkoutAbandonmentData {
  workout_id: number;
  plan_day_id: number;
  block_id: number;
  block_name: string;
}

// Context interface
interface WorkoutContextType {
  isWorkoutInProgress: boolean;
  setWorkoutInProgress: (inProgress: boolean) => void;
  abandonWorkout: (
    reason?: "manual_exit" | "navigation" | "app_backgrounded" | "other",
    workoutData?: WorkoutAbandonmentData
  ) => void;
  setCurrentWorkoutData: (data: WorkoutAbandonmentData | null) => void;
}

// Create the context
const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Export the WorkoutContext for use in hooks
export { WorkoutContext };

// Custom hook to use the workout context
export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
}

// Provider component that wraps the app
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [isWorkoutInProgress, setIsWorkoutInProgress] = useState(false);
  const [currentWorkoutData, setCurrentWorkoutData] =
    useState<WorkoutAbandonmentData | null>(null);
  const { user } = useAuth();
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug function to log workout data changes
  const setCurrentWorkoutDataWithLogging = (
    data: WorkoutAbandonmentData | null
  ) => {
    setCurrentWorkoutData(data);
  };

  const setWorkoutInProgress = (inProgress: boolean) => {
    // Cancel any pending clear timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    setIsWorkoutInProgress(inProgress);

    // If stopping workout, schedule data clearing after a delay to prevent race conditions
    if (!inProgress) {
      clearTimeoutRef.current = setTimeout(() => {
        setCurrentWorkoutData(null);
        clearTimeoutRef.current = null;
      }, 100);
    }
  };

  const abandonWorkout = (
    reason:
      | "manual_exit"
      | "navigation"
      | "app_backgrounded"
      | "other" = "manual_exit",
    workoutData?: WorkoutAbandonmentData
  ) => {
    // Use provided workout data or fall back to stored data
    const dataToUse = workoutData || currentWorkoutData;

    // Track workout abandonment if we have workout data
    if (dataToUse) {
      trackWorkoutAbandoned({
        workout_id: dataToUse.workout_id,
        plan_day_id: dataToUse.plan_day_id,
        block_id: dataToUse.block_id,
        block_name: dataToUse.block_name,
      }).catch(console.warn);
    }

    setIsWorkoutInProgress(false);
    setCurrentWorkoutData(null);
  };

  // Create the context value object
  const value: WorkoutContextType = {
    isWorkoutInProgress,
    setWorkoutInProgress,
    abandonWorkout,
    setCurrentWorkoutData: setCurrentWorkoutDataWithLogging,
  };

  // Provide the context to children components
  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}
