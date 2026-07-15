// Main OnboardingForm component
export { default as OnboardingForm } from "../onboarding-form";
export { OnboardingScreen } from "./onboarding-screen";
export { useOnboardingController } from "./use-onboarding-controller";

// Step components
export { default as FitnessGoalsStep } from "./steps/fitness-goals-step";
export { default as FitnessLevelStep } from "./steps/fitness-level-step";
export { default as HealthConnectStep } from "./steps/health-connect-step";
export { default as PersonalInfoStep } from "./steps/personal-info-step";
export { default as PhysicalLimitationsStep } from "./steps/physical-limitations-step";
export { default as WorkoutEnvironmentStep } from "./steps/workout-environment-step";
export { default as WorkoutStyleStep } from "./steps/workout-style-step";

// UI components
export { default as IconComponent } from "./ui/icon-component";
export { default as NavigationButtons } from "./ui/navigation-buttons";
export { default as OnboardingHeader } from "./ui/onboarding-header";

// Utilities
export * from "./utils/color-system";
export * from "./utils/equipment-logic";
export * from "./utils/formatters";
export * from "./utils/step-config";
export * from "./utils/validation";
