import { formatEnumValue } from "@utils/index";
import { Text, View } from "react-native";

import EditableSectionCard from "./editable-section-card";

interface EquipmentSectionProps {
  equipment: string[];
  otherEquipment?: string;
  environment?: string | string[] | null;
  onNavigate?: () => void;
}

// Environment display — handles arrays and stringified array/quoted values.
function environmentDisplay(
  environment: string | string[] | undefined | null
): string {
  if (!environment || environment === "") return "Not specified";
  try {
    if (Array.isArray(environment)) {
      return environment.length === 0
        ? "Not specified"
        : formatEnumValue(environment[0]);
    }
    if (typeof environment === "string") {
      const cleaned = environment
        .replace(/^\{|\}$/g, "")
        .replace(/^\[|\]$/g, "")
        .replace(/^["']|["']$/g, "")
        .trim();
      return cleaned ? formatEnumValue(cleaned) : "Not specified";
    }
    return formatEnumValue(environment);
  } catch {
    return Array.isArray(environment) ? environment[0] : String(environment);
  }
}

// §9.2.1: "Where you train" — environment + equipment chips. Opens step 6.
export default function EquipmentSection({
  equipment,
  otherEquipment,
  environment,
  onNavigate,
}: EquipmentSectionProps) {
  return (
    <EditableSectionCard
      title="Where you train"
      step="WORKOUT_ENVIRONMENT"
      onNavigate={onNavigate}
    >
      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Environment</Text>
          <Text className="text-sm text-text-muted">
            {environmentDisplay(environment)}
          </Text>
        </View>
      </View>
      <View className="px-4 pt-3 pb-4 border-t border-neutral-light-2">
        <Text className="text-sm text-text-primary mb-2">Equipment</Text>
        {equipment && equipment.length > 0 ? (
          <View className="flex-row flex-wrap">
            {equipment.map((item, index) => (
              <View
                key={index}
                className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
              >
                <Text className="text-xs font-medium text-neutral-light-1">
                  {formatEnumValue(item)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-text-muted">Not specified</Text>
        )}
        {otherEquipment ? (
          <Text className="text-sm text-text-muted mt-2">{otherEquipment}</Text>
        ) : null}
      </View>
    </EditableSectionCard>
  );
}
