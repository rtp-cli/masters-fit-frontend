import { formatEnumValue, getIntensityText } from "@utils/index";
import { Text, View } from "react-native";

import EditableSectionCard from "./editable-section-card";

interface Profile {
  fitnessLevel?: string;
  intensityLevel?: string | number | null;
}

interface WhereYouStartSectionProps {
  profile: Profile;
  onNavigate?: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="px-4 py-3 border-t border-neutral-light-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-text-primary">{label}</Text>
        <Text className="text-sm text-text-muted">{value}</Text>
      </View>
    </View>
  );
}

// Intensity display (string, legacy numeric string, or 1–5 numeric).
function intensityDisplay(level: string | number | undefined | null): string {
  if (!level || level === "") return "Not specified";
  if (typeof level === "string") {
    if (level === "1") return "Low";
    if (level === "2") return "Moderate";
    if (level === "3") return "High";
    return formatEnumValue(level);
  }
  if (typeof level === "number") {
    if (level <= 3)
      return level === 1 ? "Low" : level === 2 ? "Moderate" : "High";
    return getIntensityText(level);
  }
  return "Not specified";
}

// §9.2.1: "Where you are now" — fitness level + intensity. Opens step 3.
// The heading is derived from the step's editTitle, not passed as a literal:
// onboarding still asks "Where you're starting", but this card shows stored
// state, and a heading that says *starting* contradicts "Training regularly".
export default function WhereYouStartSection({
  profile,
  onNavigate,
}: WhereYouStartSectionProps) {
  return (
    <EditableSectionCard step="FITNESS_LEVEL" onNavigate={onNavigate}>
      <Row
        // [LR-084] Not "Fitness level" — the value describes what the user
        // does ("Building fitness"), and "Fitness level: Building fitness"
        // reads as a category error. Was "Right now", which restated the
        // tense the heading now carries.
        label="Activity"
        value={
          profile.fitnessLevel
            ? formatEnumValue(profile.fitnessLevel)
            : "Not specified"
        }
      />
      <Row label="Intensity" value={intensityDisplay(profile.intensityLevel)} />
    </EditableSectionCard>
  );
}
