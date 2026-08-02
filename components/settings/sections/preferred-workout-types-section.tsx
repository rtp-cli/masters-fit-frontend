import { formatEnumValue } from "@utils/index";
import { Text, View } from "react-native";

import EditableSectionCard from "./editable-section-card";

interface PreferredWorkoutTypesSectionProps {
  preferredStyles: string[];
  onNavigate?: () => void;
}

// §9.2.2: tappable — opens onboarding step 7.
export default function PreferredWorkoutTypesSection({
  preferredStyles,
  onNavigate,
}: PreferredWorkoutTypesSectionProps) {
  return (
    <EditableSectionCard
      title="Preferred workout types"
      step="WORKOUT_STYLE"
      onNavigate={onNavigate}
    >
      <View className="px-4 pt-2 pb-4">
        {preferredStyles && preferredStyles.length > 0 ? (
          <View className="flex-row flex-wrap">
            {preferredStyles.map((style, index) => (
              <View
                key={index}
                className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
              >
                <Text className="text-xs font-medium text-neutral-light-1">
                  {style === "HIIT" ? "HIIT" : formatEnumValue(style)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-text-muted">Not specified</Text>
        )}
      </View>
    </EditableSectionCard>
  );
}
