import { formatEnumValue } from "@utils/index";
import { Text, View } from "react-native";

import EditableSectionCard from "./editable-section-card";

interface HealthInformationSectionProps {
  limitations?: string[];
  medicalNotes?: string;
  onNavigate?: () => void;
}

// §9.2.2: tappable — opens onboarding step 5 (what to work around).
export default function HealthInformationSection({
  limitations,
  medicalNotes,
  onNavigate,
}: HealthInformationSectionProps) {
  const hasLimitations = limitations && limitations.length > 0;

  return (
    <EditableSectionCard
      title="Health information"
      step="PHYSICAL_LIMITATIONS"
      onNavigate={onNavigate}
    >
      <View className="px-4 pt-2 pb-3">
        <Text className="text-sm font-medium text-text-primary mb-2">
          Limitations
        </Text>
        {hasLimitations ? (
          <View className="flex-row flex-wrap">
            {limitations!.map((limitation, index) => (
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
        ) : (
          <Text className="text-sm text-text-muted">None</Text>
        )}
      </View>

      {medicalNotes ? (
        <View className="px-4 pb-4 border-t border-neutral-light-2 pt-3">
          <Text className="text-sm font-medium text-text-primary mb-2">
            Medical notes
          </Text>
          <Text className="text-sm text-text-muted">{medicalNotes}</Text>
        </View>
      ) : null}
    </EditableSectionCard>
  );
}
