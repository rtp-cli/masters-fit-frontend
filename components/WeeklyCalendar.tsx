import React from "react";
import { colors } from "../lib/theme";
import { View, TouchableOpacity, ScrollView } from "react-native";
import Text from "./Text";
import {
  getDayOfWeek,
  getDayOfMonth,
  getShortMonth,
  getCurrentDate,
  formatDateAsString,
} from "../utils";

interface Workout {
  id: number;
  name: string;
  description?: string;
  type?: string;
  duration: number;
  intensity: string;
  date: string;
  completed: boolean;
  caloriesBurned?: number;
}

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  workouts: Workout[];
}

// Generate dates for a week
const generateWeekDays = (date: Date = new Date()): Date[] => {
  const days: Date[] = [];

  // Get the current day of the week (0-6, where 0 is Sunday)
  const currentDayOfWeek = date.getDay();

  // Calculate the date of the Sunday that starts this week
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - currentDayOfWeek);

  // Generate 7 dates starting from Sunday
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    days.push(day);
  }

  return days;
};

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  selectedDate,
  onDateSelect,
  workouts,
}) => {
  // Generate week days - use safe date parsing
  const createSafeDate = (dateString: string): Date => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-").map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    return new Date(dateString);
  };

  const safeSelectedDate = createSafeDate(selectedDate);
  const weekDays = generateWeekDays(safeSelectedDate);

  // Get formatted dates for display
  const formattedSelectedDate = safeSelectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Map workouts to dates for quick lookup - use consistent date formatting
  const workoutsByDate = workouts.reduce(
    (acc, workout) => {
      const workoutDateString = formatDateAsString(workout.date);
      if (!acc[workoutDateString]) {
        acc[workoutDateString] = [];
      }
      acc[workoutDateString].push(workout);
      return acc;
    },
    {} as Record<string, Workout[]>
  );

  // Get today's date for highlighting the current day
  const today = getCurrentDate();

  return (
    <View className="bg-white rounded-xl mb-4 py-3 shadow-sm">
      <View className="px-4 pb-3 border-b border-neutral-light-1">
        <Text variant="subtitle" center>
          {formattedSelectedDate}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-2 py-3"
      >
        {weekDays.map((day) => {
          const dateString = formatDateAsString(day);
          const isSelected = dateString === selectedDate;
          const isToday = dateString === today;
          const hasWorkout = !!workoutsByDate[dateString]?.length;
          const hasCompletedWorkout =
            workoutsByDate[dateString]?.some((w) => w.completed) || false;

          return (
            <TouchableOpacity
              key={dateString}
              className="items-center py-2 w-17.5"
              onPress={() => onDateSelect(dateString)}
            >
              <Text
                variant="caption"
                color={isSelected ? colors.brand.primary : colors.text.muted}
                center
              >
                {getDayOfWeek(day).slice(0, 3)}
              </Text>

              <View
                className={`w-10 h-10 rounded-full items-center justify-center my-2 ${
                  isSelected
                    ? "bg-primary"
                    : isToday
                      ? "border border-primary"
                      : ""
                }`}
              >
                <Text
                  variant="body"
                  weight={isToday || isSelected ? "bold" : "normal"}
                  color={
                    isSelected
                      ? colors.background
                      : isToday
                        ? colors.brand.primary
                        : colors.brand.primary
                  }
                  center
                >
                  {getDayOfMonth(day)}
                </Text>
              </View>

              <Text
                variant="caption"
                color={isSelected ? colors.brand.primary : colors.text.muted}
                center
              >
                {getShortMonth(day)}
              </Text>

              {hasWorkout && (
                <View className="w-1.5 h-1.5 rounded-full mt-1 bg-primary" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default WeeklyCalendar;
