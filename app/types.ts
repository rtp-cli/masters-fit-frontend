// Calendar feature types
export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "workout" | "progress" | "achievement";
  completed?: boolean;
}

export interface CalendarDay {
  date: string;
  events: CalendarEvent[];
  isSelected?: boolean;
}

export interface CalendarViewProps {
  events: CalendarEvent[];
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  onEventPress?: (event: CalendarEvent) => void;
}

export interface PlanDayWithExercise extends PlanDayExercise {
  exercise: Exercise;
}

export interface PlanDayWithExercises
  extends Omit<PlanDay, "created_at" | "updated_at"> {
  exercises: PlanDayWithExercise[];
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutWithDetails extends Workout {
  planDays: PlanDayWithExercises[];
}

export interface PlanDayExercise {
  id: number;
  planDayId: number;
  exerciseId: number;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  completed: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Exercise {
  id: number;
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  equipment?: string;
  instructions?: string;
  link?: string;
  muscles_targeted?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface PlanDay {
  id: number;
  workoutId: number;
  date: Date;
  name: string;
  description?: string;
  dayNumber: number;
  created_at: Date;
  updated_at: Date;
}

export interface Workout {
  id: number;
  userId: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  promptId: number;
  isActive: boolean;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

// New types for workout session functionality
export interface ExerciseLog {
  id?: number;
  planDayExerciseId: number;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed: number;
  status: "complete" | "incomplete";
  timeTaken?: number; // in seconds
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface WorkoutLog {
  id?: number;
  workoutId: number;
  status: "complete" | "incomplete" | "in_progress";
  totalTimeTaken?: number; // in seconds
  completedExercises?: number[]; // array of planDayExercise IDs
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface WorkoutSession {
  workoutId: number;
  planDayId: number;
  currentExerciseIndex: number;
  startTime: Date;
  exerciseLogs: ExerciseLog[];
  isActive: boolean;
}

export interface ExerciseSessionData {
  exerciseId: number;
  planDayExerciseId: number;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed?: number;
  timeTaken: number;
  notes?: string;
  isCompleted: boolean;
  startTime?: Date;
}
