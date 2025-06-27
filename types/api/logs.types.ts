export interface ExerciseLog {
  id: number;
  planDayExerciseId: number;
  setsCompleted: number | null;
  repsCompleted: number | null;
  roundsCompleted: number | null;
  weightUsed: number | null;
  durationCompleted: number | null;
  restTimeTaken: number | null;
  timeTaken: number | null;
  isComplete: boolean;
  isSkipped: boolean;
  notes: string | null;
  difficulty: string | null;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
}
