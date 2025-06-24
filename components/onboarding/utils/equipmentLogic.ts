import { WorkoutEnvironments, AvailableEquipment } from "@/types/enums";

// Auto-assign equipment based on environment selection
export const getEquipmentForEnvironment = (
  environment: WorkoutEnvironments
): AvailableEquipment[] => {
  switch (environment) {
    case WorkoutEnvironments.COMMERCIAL_GYM:
      // Auto-assign all equipment for commercial gym
      return [
        AvailableEquipment.BARBELLS,
        AvailableEquipment.BENCH,
        AvailableEquipment.INCLINE_DECLINE_BENCH,
        AvailableEquipment.PULL_UP_BAR,
        AvailableEquipment.BIKE,
        AvailableEquipment.MEDICINE_BALLS,
        AvailableEquipment.PLYO_BOX,
        AvailableEquipment.RINGS,
        AvailableEquipment.RESISTANCE_BANDS,
        AvailableEquipment.STABILITY_BALL,
        AvailableEquipment.DUMBBELLS,
        AvailableEquipment.KETTLEBELLS,
        AvailableEquipment.SQUAT_RACK,
        AvailableEquipment.DIP_BAR,
        AvailableEquipment.ROWING_MACHINE,
        AvailableEquipment.SLAM_BALLS,
        AvailableEquipment.CABLE_MACHINE,
        AvailableEquipment.JUMP_ROPE,
        AvailableEquipment.FOAM_ROLLER,
      ];
    case WorkoutEnvironments.BODYWEIGHT_ONLY:
      // Auto-assign no equipment for bodyweight only
      return [];
    case WorkoutEnvironments.HOME_GYM:
      // Clear equipment so user can select manually
      return [];
    default:
      return [];
  }
};
