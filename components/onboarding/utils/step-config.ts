import { OnboardingStep } from "@/types/enums";

export interface StepConfig {
  title: string;
  description: string;
  disclaimer?: string;
}

// Get step configuration - matching exact titles from images
export const getStepConfig = (currentStep: OnboardingStep): StepConfig => {
  switch (currentStep) {
    case OnboardingStep.PERSONAL_INFO:
      return {
        title: "Personal Information",
        description:
          "Tell us a bit about yourself so we can create a personalized fitness plan just for you. At MastersFit, your privacy matters - we'll keep your information secure and never share or sell it to third-parties.",
      };
    case OnboardingStep.FITNESS_GOALS:
      return {
        title: "Fitness Goals",
        description:
          "What do you want to achieve? Select all goals that apply to you.",
      };
    case OnboardingStep.PHYSICAL_LIMITATIONS:
      return {
        title: "Own Your Journey",
        description:
          "Let us know about any physical limitations or health concerns so we can build a workout plan that empowers you, safely and effectively.",
        disclaimer:
          "Before starting any new fitness program, check with your doctor, especially if you have existing health conditions.",
      };
    case OnboardingStep.FITNESS_LEVEL:
      return {
        title: "Let's Get Moving!",
        description:
          "Tell us about your fitness level and when you're available to workout. Whether you're just starting out or leveling up, we'll build powerful workouts that fit your goals and schedule.",
      };
    case OnboardingStep.WORKOUT_ENVIRONMENT:
      return {
        title: "Workout Environment & Equipment",
        description:
          "Where will you workout and what equipment do you have access to?",
      };
    case OnboardingStep.HEALTH_CONNECT:
      return {
        title: "Connect Health",
        description:
          "Connect Apple Health or Health Connect to sync steps, calories, heart rate, and workouts.",
      };
    case OnboardingStep.WORKOUT_STYLE:
      return {
        title: "Workout Preferences",
        description:
          "What types of workouts do you enjoy? This helps us create workouts you'll love.",
      };
    default:
      return { title: "", description: "" };
  }
};
