import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Calendar as RNCalendar, DateData } from "react-native-calendars";
import { useThemeColors } from "@/lib/theme";

type CalendarViewSectionProps = {
  calendarKey: string | number;
  currentMonth: string;
  markedDates: any;
  onDayPress: (day: DateData) => void;
  onMonthChange: (month: DateData) => void;
  onPressToday: () => void;
  showTodayButton: boolean;
};

export default function CalendarViewSection({
  calendarKey,
  currentMonth,
  markedDates,
  onDayPress,
  onMonthChange,
  onPressToday,
  showTodayButton,
}: CalendarViewSectionProps) {
  const colors = useThemeColors();

  return (
    <>
      <View className="bg-surface mx-lg my-md rounded-xl overflow-hidden border border-neutral-medium-1">
        <RNCalendar
          key={calendarKey}
          current={currentMonth}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markedDates={markedDates}
          markingType="multi-dot"
          hideExtraDays={false}
          disableMonthChange={false}
          theme={{
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.text.muted,
            selectedDayBackgroundColor: colors.brand.secondary,
            selectedDayTextColor: colors.neutral.white,
            todayTextColor: colors.brand.primary,
            dayTextColor: colors.text.primary,
            textDisabledColor: colors.neutral.medium[2],
            arrowColor: colors.text.primary,
            monthTextColor: colors.text.primary,
            indicatorColor: colors.brand.primary,
            textDayFontFamily: "System",
            textMonthFontFamily: "System",
            textDayHeaderFontFamily: "System",
            textDayFontWeight: "500",
            textMonthFontWeight: "600",
            textDayHeaderFontWeight: "500",
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
            "stylesheet.day.basic": {
              todayText: {
                color: colors.brand.primary,
                fontWeight: "bold",
              },
            },
            "stylesheet.day.single": {
              todayText: {
                color: colors.brand.primary,
                fontWeight: "bold",
              },
            },
          }}
        />
      </View>

      {showTodayButton && (
        <View className="mx-lg mb-4">
          <View className="flex justify-center items-center">
            <TouchableOpacity
              className="px-4 py-2 rounded-lg bg-surface border border-neutral-medium-1"
              onPress={onPressToday}
            >
              <Text className="text-brand-primary text-md font-semibold">
                Today
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}
