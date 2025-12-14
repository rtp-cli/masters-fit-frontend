import { WORKOUT_ENVIRONMENTS, AVAILABLE_EQUIPMENT } from "@/types/enums";

// Auto-assign equipment based on environment selection
export const getEquipmentForEnvironment = (
  environment: WORKOUT_ENVIRONMENTS
): AVAILABLE_EQUIPMENT[] => {
  switch (environment) {
    case WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM:
      // Auto-assign all equipment for commercial gym
      return [
        AVAILABLE_EQUIPMENT.BARBELLS,
        AVAILABLE_EQUIPMENT.BENCH,
        AVAILABLE_EQUIPMENT.INCLINE_DECLINE_BENCH,
        AVAILABLE_EQUIPMENT.PULL_UP_BAR,
        AVAILABLE_EQUIPMENT.BIKE,
        AVAILABLE_EQUIPMENT.MEDICINE_BALLS,
        AVAILABLE_EQUIPMENT.PLYO_BOX,
        AVAILABLE_EQUIPMENT.RINGS,
        AVAILABLE_EQUIPMENT.RESISTANCE_BANDS,
        AVAILABLE_EQUIPMENT.STABILITY_BALL,
        AVAILABLE_EQUIPMENT.DUMBBELLS,
        AVAILABLE_EQUIPMENT.KETTLEBELLS,
        AVAILABLE_EQUIPMENT.SQUAT_RACK,
        AVAILABLE_EQUIPMENT.DIP_BAR,
        AVAILABLE_EQUIPMENT.ROWING_MACHINE,
        AVAILABLE_EQUIPMENT.SLAM_BALLS,
        AVAILABLE_EQUIPMENT.CABLE_MACHINE,
        AVAILABLE_EQUIPMENT.JUMP_ROPE,
        AVAILABLE_EQUIPMENT.FOAM_ROLLER,
      ];
    case WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY:
      // Auto-assign no equipment for bodyweight only
      return [];
    case WORKOUT_ENVIRONMENTS.HOME_GYM:
      // Clear equipment so user can select manually
      return [];
    default:
      return [];
  }
};
