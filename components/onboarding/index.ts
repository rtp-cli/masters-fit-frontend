// Main OnboardingForm component
export { OnboardingScreen } from "./onboarding-screen";
export { default as OnboardingForm } from "../onboarding-form";
export { useOnboardingController } from "./use-onboarding-controller";

// Step components
export { default as PersonalInfoStep } from "./steps/personal-info-step";
export { default as FitnessGoalsStep } from "./steps/fitness-goals-step";
export { default as PhysicalLimitationsStep } from "./steps/PhysicalLimitationsStep";
export { default as FitnessLevelStep } from "./steps/fitness-level-step";
export { default as WorkoutEnvironmentStep } from "./steps/workout-environment-step";
export { default as WorkoutStyleStep } from "./steps/workout-style-step";
export { default as HealthConnectStep } from "./steps/health-connect-step";

// UI components
export { default as OnboardingHeader } from "./ui/onboarding-header";
export { default as NavigationButtons } from "./ui/navigation-buttons";
export { default as IconComponent } from "./ui/icon-component";

// Utilities
export * from "./utils/formatters";
export * from "./utils/validation";
export * from "./utils/equipment-logic";
export * from "./utils/step-config";
export * from "./utils/color-system";
