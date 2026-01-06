import { View, Text } from "react-native";
import { formatEnumValue } from "@utils/index";

interface EquipmentSectionProps {
  equipment: string[];
  otherEquipment?: string;
}

export default function EquipmentSection({
  equipment,
  otherEquipment,
}: EquipmentSectionProps) {
  if (!equipment || equipment.length === 0) {
    return null;
  }

  return (
    <View className="mx-6 mb-6   rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-3">
        Available Equipment
      </Text>
      <View className="px-4 pb-4">
        <View className="flex-row flex-wrap mb-2">
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
        {otherEquipment && (
          <View className="px-4 pb-4 border-t border-neutral-light-2 pt-3">
            <Text className="text-sm font-medium text-text-primary mb-2">
              Other Equipment
            </Text>
            <Text className="text-sm text-text-muted">{otherEquipment}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
