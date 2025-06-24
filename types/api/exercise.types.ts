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

export interface ExerciseFromLib {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  instructions?: string;
  imageUrl?: string;
  link?: string;
  difficulty: string;
  category?: string;
}

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  order?: number;
  completed: boolean;
  exercise: ExerciseFromLib;
}
