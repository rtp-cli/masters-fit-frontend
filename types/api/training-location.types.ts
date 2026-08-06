import { type AVAILABLE_EQUIPMENT,type WORKOUT_ENVIRONMENTS } from "@/types/enums/fitness.enums";

/**
 * A saved training place. One primary (anchors the weekly plan) + up to three
 * secondaries. The standing "Bodyweight only" pick and unsaved one-offs are NOT
 * TrainingLocations — they exist only as a session snapshot.
 */
export interface TrainingLocation {
  id: number;
  userId: number;
  name: string;
  environment: WORKOUT_ENVIRONMENTS;
  equipment: AVAILABLE_EQUIPMENT[] | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Frozen where-you-trained snapshot recorded on a session (plan day). Source of
 * truth for the session's location — never a live lookup, so later renames or
 * deletes of the place don't rewrite history.
 */
export interface TrainingLocationSnapshot {
  locationId: number | null; // provenance; null for one-off / bodyweight
  name: string;
  environment: WORKOUT_ENVIRONMENTS;
  equipment: AVAILABLE_EQUIPMENT[];
}

export interface CreateLocationInput {
  name: string;
  environment: WORKOUT_ENVIRONMENTS;
  equipment?: AVAILABLE_EQUIPMENT[];
}

export interface UpdateLocationInput {
  name?: string;
  environment?: WORKOUT_ENVIRONMENTS;
  equipment?: AVAILABLE_EQUIPMENT[];
}
