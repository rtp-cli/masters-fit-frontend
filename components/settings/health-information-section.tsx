import { View, Text } from "react-native";
import { formatEnumValue } from "@utils/index";

interface HealthInformationSectionProps {
  limitations?: string[];
  medicalNotes?: string;
}

export default function HealthInformationSection({
  limitations,
  medicalNotes,
}: HealthInformationSectionProps) {
  if ((!limitations || limitations.length === 0) && !medicalNotes) {
    return null;
  }

  return (
    <View className="mx-6 mb-6   rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-3">
        Health Information
      </Text>

      {limitations && limitations.length > 0 && (
        <View className="px-4 pb-3">
          <Text className="text-sm font-medium text-text-primary mb-2">
            Limitations
          </Text>
          <View className="flex-row flex-wrap">
            {limitations.map((limitation, index) => (
              <View
                key={index}
                className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
              >
                <Text className="text-xs font-medium text-neutral-light-1">
                  {formatEnumValue(limitation)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {medicalNotes && (
        <View className="px-4 pb-4 border-t border-neutral-light-2 pt-3">
          <Text className="text-sm font-medium text-text-primary mb-2">
            Medical Notes
          </Text>
          <Text className="text-sm text-text-muted">{medicalNotes}</Text>
        </View>
      )}
    </View>
  );
}
