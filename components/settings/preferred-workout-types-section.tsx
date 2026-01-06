import { View, Text } from "react-native";
import { formatEnumValue } from "@utils/index";

interface PreferredWorkoutTypesSectionProps {
  preferredStyles: string[];
}

export default function PreferredWorkoutTypesSection({
  preferredStyles,
}: PreferredWorkoutTypesSectionProps) {
  if (!preferredStyles || preferredStyles.length === 0) {
    return null;
  }

  return (
    <View className="mx-6 mb-6   rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-3">
        Preferred Workout Types
      </Text>
      <View className="px-4 pb-4">
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
      </View>
    </View>
  );
}
