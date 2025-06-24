export interface WeeklySummary {
  workoutCompletionRate: number;
  exerciseCompletionRate: number;
  streak: number;
  totalWorkoutsThisWeek: number;
  completedWorkoutsThisWeek: number;
}

export interface WorkoutConsistency {
  week: string;
  totalWorkouts: number;
  completedWorkouts: number;
  completionRate: number;
}

export interface WeightMetrics {
  name: string;
  totalWeight: number;
  muscleGroups: string[];
}

export interface WeightAccuracyMetrics {
  accuracyRate: number;
  totalSets: number;
  exactMatches: number;
  higherWeight: number;
  lowerWeight: number;
  avgWeightDifference: number;
  chartData?: Array<{
    label: string;
    value: number;
    color: string;
    count?: number;
  }>;
  hasPlannedWeights?: boolean;
  hasExerciseData?: boolean;
}

export interface GoalProgress {
  goal: string;
  progressScore: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  completedWorkouts: number;
}

export interface TotalVolumeMetrics {
  date: string;
  totalVolume: number;
  exerciseCount: number;
  label: string;
}

export interface WorkoutTypeDistribution {
  tag: string;
  label: string;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  completedWorkouts: number;
  percentage: number;
  color: string;
}

export interface WorkoutTypeMetrics {
  distribution: WorkoutTypeDistribution[];
  totalExercises: number;
  totalSets: number;
  dominantType: string;
  hasData: boolean;
}

export interface DailyWorkoutProgress {
  date: string;
  completionRate: number;
  hasPlannedWorkout: boolean;
}

export interface DashboardMetrics {
  weeklySummary: WeeklySummary;
  workoutConsistency: WorkoutConsistency[];
  weightMetrics: WeightMetrics[];
  weightAccuracy: WeightAccuracyMetrics;
  goalProgress: GoalProgress[];
  totalVolumeMetrics: TotalVolumeMetrics[];
  workoutTypeMetrics: WorkoutTypeMetrics;
  dailyWorkoutProgress: DailyWorkoutProgress[];
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  timeRange?: "1w" | "1m" | "3m" | "6m" | "1y";
  groupBy?: "exercise" | "day" | "muscle_group";
}
