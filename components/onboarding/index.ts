// Main OnboardingForm component
export { OnboardingScreen } from "./onboarding-screen";
export { default as OnboardingForm } from "../OnboardingForm";
export { useOnboardingController } from "./use-onboarding-controller";

// Step components
export { default as PersonalInfoStep } from "./steps/PersonalInfoStep";
export { default as FitnessGoalsStep } from "./steps/FitnessGoalsStep";
export { default as PhysicalLimitationsStep } from "./steps/PhysicalLimitationsStep";
export { default as FitnessLevelStep } from "./steps/FitnessLevelStep";
export { default as WorkoutEnvironmentStep } from "./steps/WorkoutEnvironmentStep";
export { default as WorkoutStyleStep } from "./steps/WorkoutStyleStep";
export { default as HealthConnectStep } from "./steps/HealthConnectStep";

// UI components
export { default as OnboardingHeader } from "./ui/OnboardingHeader";
export { default as NavigationButtons } from "./ui/NavigationButtons";
export { default as IconComponent } from "./ui/IconComponent";

// Utilities
export * from "./utils/formatters";
export * from "./utils/validation";
export * from "./utils/equipmentLogic";
export * from "./utils/stepConfig";
export * from "./utils/colorSystem";
