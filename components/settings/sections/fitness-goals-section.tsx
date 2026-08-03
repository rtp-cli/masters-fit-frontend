import { formatEnumValue } from "@utils/index";
import { Text, View } from "react-native";

import EditableSectionCard from "./editable-section-card";

interface FitnessGoalsSectionProps {
  goals: string[];
  onNavigate?: () => void;
}

// §9.2.2: tappable — opens onboarding step 2.
export default function FitnessGoalsSection({
  goals,
  onNavigate,
}: FitnessGoalsSectionProps) {
  return (
    <EditableSectionCard
      title="Fitness goals"
      step="FITNESS_GOALS"
      onNavigate={onNavigate}
    >
      <View className="px-4 pt-2 pb-4">
        {goals && goals.length > 0 ? (
          <View className="flex-row flex-wrap">
            {goals.map((goal, index) => (
              <View
                key={index}
                className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
              >
                <Text className="text-xs font-medium text-neutral-light-1">
                  {formatEnumValue(goal)}
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
