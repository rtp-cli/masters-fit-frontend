import { ONBOARDING_STEP } from "@/types/enums";

export interface StepConfig {
  title: string;
  description: string;
  disclaimer?: string;
}

// §8: short, second-person, sentence-case copy. Only PERSONAL_INFO reads
// opts.name (trimmed — empty/whitespace/undefined falls back to the no-name
// variant; the name is inserted verbatim, no title-casing or truncation).
// SCHEDULE's copy is added with the §5 split; HEALTH_CONNECT leaves in §6.
export const getStepConfig = (
  currentStep: ONBOARDING_STEP,
  opts?: { name?: string }
): StepConfig => {
  switch (currentStep) {
    case ONBOARDING_STEP.PERSONAL_INFO: {
      const name = opts?.name?.trim();
      return {
        title: "About you",
        description: name
          ? `A few basics so we can size your plan, ${name}. Private — never shared, never sold.`
          : "A few basics so we can size your plan. Private — never shared, never sold.",
      };
    }
    case ONBOARDING_STEP.FITNESS_GOALS:
      return {
        title: "What you're after",
        description:
          "Pick everything that applies. We'll weight your plan toward whatever you choose.",
      };
    case ONBOARDING_STEP.FITNESS_LEVEL:
      return {
        title: "Where you're starting",
        description: "Your training now, and how hard you want to push.",
      };
    case ONBOARDING_STEP.PHYSICAL_LIMITATIONS:
      return {
        title: "What to work around",
        description:
          "Anything here means we plan around it, not that we leave it out. Pick as many as apply, or none.",
        disclaimer:
          "Before starting any new fitness program, check with your doctor, especially if you have existing health conditions.",
      };
    case ONBOARDING_STEP.WORKOUT_ENVIRONMENT:
      return {
        title: "Where you train",
        description: "Your usual setup, and what you have access to.",
      };
    case ONBOARDING_STEP.WORKOUT_STYLE:
      return {
        title: "How you like to train",
        description:
          "The styles you enjoy, so your plan feels like something you'd choose.",
      };
    // Leaves the flow in §6; copy kept until then.
    case ONBOARDING_STEP.HEALTH_CONNECT:
      return {
        title: "Connect Health",
        description:
          "Connect Apple Health or Health Connect to sync steps, calories, heart rate, and workouts.",
      };
    default:
      return { title: "", description: "" };
  }
};
