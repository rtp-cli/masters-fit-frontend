import { Text, View } from "react-native";

import { useThemeColors } from "../../../lib/theme";
import EditableSectionCard from "./editable-section-card";

interface WeeklyScheduleSectionProps {
  availableDays: string[];
  workoutDuration?: number;
  onNavigate?: () => void;
}

// §9.2.1: "Your week" — day circles + session length. Opens onboarding step 4.
export default function WeeklyScheduleSection({
  availableDays,
  workoutDuration,
  onNavigate,
}: WeeklyScheduleSectionProps) {
  const colors = useThemeColors();

  const dayMap: { [key: string]: string } = {
    monday: "M",
    tuesday: "T",
    wednesday: "W",
    thursday: "T",
    friday: "F",
    saturday: "S",
    sunday: "S",
  };
  const days = availableDays ?? [];
  const dayInfo = [
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

  return (
    <EditableSectionCard title="Your week" step="SCHEDULE" onNavigate={onNavigate}>
      <View className="flex-row justify-between px-4 pb-4 pt-1">
        {dayInfo.map((d) => (
          <View
            key={d.index}
            className={`size-8 rounded-full items-center justify-center ${
              d.active ? "bg-primary" : "bg-neutral-light-2"
            }`}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color: d.active ? colors.contentOnPrimary : colors.text.muted,
              }}
            >
              {d.day}
            </Text>
          </View>
        ))}
      </View>
      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Session length</Text>
          <Text className="text-sm text-text-muted">
            {workoutDuration ? `${workoutDuration} minutes` : "Not specified"}
          </Text>
        </View>
      </View>
    </EditableSectionCard>
  );
}
