export interface SearchExerciseDetails {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  instructions: string;
  link?: string;
}

export interface DateSearchExercise {
  id: number;
  exercise: SearchExerciseDetails;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  restTime: number | null;
  completed: boolean;
  completionRate: number;
}

export interface DateSearchWorkoutBlock {
  id: number;
  blockType?: string;
  blockName?: string;
  timeCapMinutes?: number;
  rounds?: number;
  instructions?: string;
  exercises: DateSearchExercise[];
}

export interface DateSearchPlanDay {
  id: number;
  date: Date;
  exercises: DateSearchExercise[];
  blocks?: DateSearchWorkoutBlock[];
}

export interface DateSearchWorkout {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  planDay: DateSearchPlanDay;
  overallCompletionRate: number;
  exercises: SearchExercise[];
}

export interface DateSearchResponse {
  success: boolean;
  data: DateSearchWorkout[];
  date: string;
  workout: DateSearchWorkout | null;
}

export interface ExerciseDetails {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  instructions: string;
  link?: string;
  created_at: Date;
  updated_at: Date;
  userStats: ExerciseUserStats;
  recentLogs: SearchExerciseLog[];
}

export interface PersonalRecord {
  maxWeight: number | null;
  maxReps: number;
  maxSets: number;
}

export interface ExerciseUserStats {
  totalAssignments: number;
  totalCompletions: number;
  completionRate: number;
  averageSets: number;
  averageReps: number;
  averageWeight: number | null;
  lastPerformed: Date | null;
  personalRecord: PersonalRecord;
}

export interface ExerciseSearchResponse {
  success: boolean;
  data: ExerciseDetails;
  exercise: ExerciseDetails;
  userStats: ExerciseUserStats | null;
}

export interface ExerciseFromSearch {
  id: number;
  name: string;
  description: string | null;
  muscleGroups: string[];
  equipment: string[] | null;
  difficulty: string | null;
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExercisesSearchResponse {
  success: boolean;
  data: SearchExercise[];
  exercises: SearchExercise[];
}

export interface SearchExercise {
  id: number;
  name: string;
  description?: string;
  category?: string;
  equipment?: string;
  instructions?: string;
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  muscleGroups?: string[];
  difficulty?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchExerciseLog {
  id: number;
  date: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
}
