import { Text, View } from "react-native";
import { useThemeColors } from "../../../lib/theme";

interface WeeklyScheduleSectionProps {
  availableDays: string[];
}

export default function WeeklyScheduleSection({
  availableDays,
}: WeeklyScheduleSectionProps) {
  const colors = useThemeColors();
  if (!availableDays || availableDays.length === 0) {
    return null;
  }

  // Format available days for display
  const formatAvailableDays = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      monday: "M",
      tuesday: "T",
      wednesday: "W",
      thursday: "T",
      friday: "F",
      saturday: "S",
      sunday: "S",
    };

    return [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day, index) => ({
      day: dayMap[day],
      active: days.includes(day),
      index,
    }));
  };

  const dayInfo = formatAvailableDays(availableDays);

  return (
    <View className="mx-6 mb-6   rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-3">
        Weekly Schedule
      </Text>
      <View className="flex-row justify-between px-4 pb-4">
        {dayInfo.map((dayInfo) => (
          <View
            key={dayInfo.index}
            className={`w-8 h-8 rounded-full items-center justify-center ${
              dayInfo.active ? "bg-primary" : "bg-neutral-light-2"
            }`}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color: dayInfo.active
                  ? colors.contentOnPrimary
                  : colors.text.muted,
              }}
            >
              {dayInfo.day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
