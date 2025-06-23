import React from "react";
import { colors } from "../lib/theme";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Text from "./Text";
import {
  getDayOfWeek,
  getDayOfMonth,
  getShortMonth,
  getCurrentDate,
} from "@/utils";

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

  // Map workouts to dates for quick lookup
  const workoutsByDate = workouts.reduce((acc, workout) => {
    if (!acc[workout.date]) {
      acc[workout.date] = [];
    }
    acc[workout.date].push(workout);
    return acc;
  }, {} as Record<string, Workout[]>);

  // Format date for comparison
  const formatDateForComparison = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Get today's date for highlighting the current day
  const today = getCurrentDate();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="subtitle" center>
          {formattedSelectedDate}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysContainer}
      >
        {weekDays.map((day) => {
          const dateString = formatDateForComparison(day);
          const isSelected = dateString === selectedDate;
          const isToday = dateString === today;
          const hasWorkout = !!workoutsByDate[dateString]?.length;
          const hasCompletedWorkout =
            workoutsByDate[dateString]?.some((w) => w.completed) || false;

          return (
            <TouchableOpacity
              key={dateString}
              style={[styles.dayItem, isSelected && styles.selectedDayItem]}
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
                style={[
                  styles.dateCircle,
                  isSelected && styles.selectedDateCircle,
                  isToday && styles.todayCircle,
                ]}
              >
                <Text
                  variant="body"
                  weight={isToday || isSelected ? "bold" : "normal"}
                  color={
                    isSelected
                      ? colors.background
                      : isToday
                      ? colors.brand.primary
                      : "colors.brand.primary"
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
                <View
                  style={[
                    styles.dotIndicator,
                    hasCompletedWorkout && styles.completedDotIndicator,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 12,
    shadowColor: colors.neutral.dark[1],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.light[1],
  },
  daysContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  dayItem: {
    width: 70,
    alignItems: "center",
    paddingVertical: 8,
  },
  selectedDayItem: {
    // Additional styling for the selected day item
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  selectedDateCircle: {
    backgroundColor: colors.brand.primary,
  },
  todayCircle: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
    marginTop: 4,
  },
  completedDotIndicator: {
    backgroundColor: colors.brand.primary,
  },
});

export default WeeklyCalendar;
