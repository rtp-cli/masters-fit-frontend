// The four reasons a user can give for excluding an exercise. The reason is
// not analytics — it changes what the app puts in the slot's place and is how
// Settings → Excluded exercises groups the list.
export type ExclusionReason = "hurts" | "no_equipment" | "too_hard" | "dislike";

// One excluded exercise, as listed in Settings (1g).
export interface ExcludedExercise {
  exerciseId: number;
  name: string;
  muscleGroups: string[];
  reason: ExclusionReason;
  createdAt: string;
}

// A ranked replacement candidate (1e / 1f). Every field is a real catalog
// column so the templated sentence and covered/dashed chips never assert
// anything the schema doesn't know.
export interface ReplacementCandidate {
  id: number;
  name: string;
  muscleGroups: string[];
  equipment: string[] | null;
  difficulty: string | null;
  hasDemo: boolean | null;
  /** How many of the ORIGINAL's muscle groups this candidate also trains. */
  overlapCount: number;
}

// Another exercise already scheduled in the plan that overlaps on muscle group
// — the 1d "anything else that bothers your {muscle}?" list.
export interface RelatedScheduledExercise {
  exerciseId: number;
  name: string;
  muscleGroups: string[];
  /** Weekday of the earliest upcoming day it appears, e.g. "Tuesday". */
  dayName: string;
}
