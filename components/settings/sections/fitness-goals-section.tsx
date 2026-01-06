import { View, Text } from "react-native";
import { formatEnumValue } from "@utils/index";

interface FitnessGoalsSectionProps {
  goals: string[];
}

export default function FitnessGoalsSection({
  goals,
}: FitnessGoalsSectionProps) {
  if (!goals || goals.length === 0) {
    return null;
  }

  return (
    <View className="px-6 mb-6 bg-white rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-3">
        Fitness Goals
      </Text>
      <View className="px-4 pb-4">
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
      </View>
    </View>
  );
}
