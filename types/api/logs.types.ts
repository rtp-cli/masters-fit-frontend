export interface ExerciseLog {
  id: number;
  planDayExerciseId: number;
  durationCompleted: number | null;
  timeTaken: number | null;
  isComplete: boolean;
  isSkipped: boolean;
  notes: string | null;
  difficulty: string | null;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseSetLog {
  id: number;
  exerciseLogId: number;
  roundNumber: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  restAfter: number | null;
  createdAt: Date;
}
