import React, {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";

// Simple context that only tracks if workout is in progress
interface WorkoutContextType {
  isWorkoutInProgress: boolean;
  setWorkoutInProgress: (inProgress: boolean) => void;
  abandonWorkout: () => void;
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

  const setWorkoutInProgress = (inProgress: boolean) => {
    console.log(
      "🏋️ WorkoutContext: Setting workout in progress to:",
      inProgress
    );
    setIsWorkoutInProgress(inProgress);
  };

  const abandonWorkout = () => {
    console.log("🚪 WorkoutContext: Abandoning workout - user chose to leave");
    setIsWorkoutInProgress(false);
  };

  // Create the context value object
  const value: WorkoutContextType = {
    isWorkoutInProgress,
    setWorkoutInProgress,
    abandonWorkout,
  };

  // Provide the context to children components
  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}
