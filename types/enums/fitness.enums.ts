export enum Gender {
  MALE = "male",
  FEMALE = "female",
}

export enum FitnessGoals {
  GENERAL_FITNESS = "general_fitness",
  FAT_LOSS = "fat_loss",
  ENDURANCE = "endurance",
  MUSCLE_GAIN = "muscle_gain",
  STRENGTH = "strength",
  MOBILITY_FLEXIBILITY = "mobility_flexibility",
  BALANCE = "balance",
  RECOVERY = "recovery",
}

export enum FitnessLevels {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export enum IntensityLevels {
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
}

export enum WorkoutEnvironments {
  HOME_GYM = "home_gym",
  COMMERCIAL_GYM = "commercial_gym",
  BODYWEIGHT_ONLY = "bodyweight_only",
}

export enum PreferredDays {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

export enum PhysicalLimitations {
  KNEE_PAIN = "knee_pain",
  SHOULDER_PAIN = "shoulder_pain",
  LOWER_BACK_PAIN = "lower_back_pain",
  NECK_PAIN = "neck_pain",
  HIP_PAIN = "hip_pain",
  ANKLE_INSTABILITY = "ankle_instability",
  WRIST_PAIN = "wrist_pain",
  ELBOW_PAIN = "elbow_pain",
  ARTHRITIS = "arthritis",
  OSTEOPOROSIS = "osteoporosis",
  SCIATICA = "sciatica",
  LIMITED_RANGE_OF_MOTION = "limited_range_of_motion",
  POST_SURGERY_RECOVERY = "post_surgery_recovery",
  BALANCE_ISSUES = "balance_issues",
  CHRONIC_FATIGUE = "chronic_fatigue",
  BREATHING_ISSUES = "breathing_issues",
}

export enum AvailableEquipment {
  BARBELLS = "barbells",
  BENCH = "bench",
  INCLINE_DECLINE_BENCH = "incline_decline_bench",
  PULL_UP_BAR = "pull_up_bar",
  BIKE = "bike",
  MEDICINE_BALLS = "medicine_balls",
  PLYO_BOX = "plyo_box",
  RINGS = "rings",
  RESISTANCE_BANDS = "resistance_bands",
  STABILITY_BALL = "stability_ball",
  DUMBBELLS = "dumbbells",
  KETTLEBELLS = "kettlebells",
  SQUAT_RACK = "squat_rack",
  DIP_BAR = "dip_bar",
  ROWING_MACHINE = "rowing_machine",
  SLAM_BALLS = "slam_balls",
  CABLE_MACHINE = "cable_machine",
  JUMP_ROPE = "jump_rope",
  FOAM_ROLLER = "foam_roller",
}

export enum PreferredStyles {
  HIIT = "HIIT",
  STRENGTH = "strength",
  CARDIO = "cardio",
  REHAB = "rehab",
  CROSSFIT = "crossfit",
  FUNCTIONAL = "functional",
  PILATES = "pilates",
  YOGA = "yoga",
  BALANCE = "balance",
  MOBILITY = "mobility",
}

export enum OnboardingStep {
  PERSONAL_INFO = 0,
  FITNESS_GOALS = 1,
  PHYSICAL_LIMITATIONS = 2,
  FITNESS_LEVEL = 3,
  WORKOUT_ENVIRONMENT = 4,
  WORKOUT_STYLE = 5,
}
