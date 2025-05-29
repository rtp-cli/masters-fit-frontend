import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar as RNCalendar, DateData } from "react-native-calendars";
import {
  fetchActiveWorkout,
  regenerateWorkoutPlan,
  regenerateDailyWorkout,
} from "@lib/workouts";
import { WorkoutWithDetails, PlanDayWithExercises } from "../types";
import { getCurrentUser } from "@lib/auth";
import WorkoutRegenerationModal from "../../components/WorkoutRegenerationModal";
import DailyWorkoutRegenerationModal from "../../components/DailyWorkoutRegenerationModal";
import { Ionicons } from "@expo/vector-icons";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutWithDetails | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showDailyRegenerationModal, setShowDailyRegenerationModal] =
    useState(false);
  const [regeneratingDaily, setRegeneratingDaily] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] =
    useState<PlanDayWithExercises | null>(null);

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  const fetchWorkoutPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await getCurrentUser();
      if (!user) {
        setError("User not found");
        return;
      }
      const response = await fetchActiveWorkout();
      if (response) {
        setWorkoutPlan(response.workout);
      }
    } catch (err) {
      setError("Failed to load workout plan");
      console.error("Error fetching workout plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (data: { customFeedback?: string }) => {
    try {
      setRegenerating(true);
      const user = await getCurrentUser();
      if (!user) {
        setError("User not found");
        return;
      }

      const response = await regenerateWorkoutPlan(user.id, {
        customFeedback: data.customFeedback,
      });
      if (response) {
        setWorkoutPlan(response.workout);
        setShowRegenerationModal(false);
      }
    } catch (err) {
      setError("Failed to regenerate workout plan");
      console.error("Error regenerating workout plan:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDailyRegenerate = async (reason: string) => {
    try {
      setRegeneratingDaily(true);
      const user = await getCurrentUser();
      if (!user || !selectedPlanDay) {
        setError("User or plan day not found");
        return;
      }

      const response = await regenerateDailyWorkout(
        user.id,
        selectedPlanDay.id,
        reason
      );
      if (response) {
        // Update the workout plan with the new day data
        setWorkoutPlan((prev) => {
          if (!prev) return prev;
          const updatedPlanDays = prev.planDays.map((day) =>
            day.id === selectedPlanDay.id ? response.planDay : day
          );
          return {
            ...prev,
            planDays: updatedPlanDays,
          };
        });
        setShowDailyRegenerationModal(false);
        setSelectedPlanDay(null);
      }
    } catch (err) {
      setError("Failed to regenerate daily workout");
      console.error("Error regenerating daily workout:", err);
    } finally {
      setRegeneratingDaily(false);
    }
  };

  const handleOpenDailyRegeneration = (planDay: PlanDayWithExercises) => {
    setSelectedPlanDay(planDay);
    setShowDailyRegenerationModal(true);
  };

  // Get the plan day and its index for the selected date
  const getPlanDayForDate = (
    date: string
  ): { day: PlanDayWithExercises; index: number } | null => {
    if (!workoutPlan) return null;
    const normalizedDate = new Date(date).toLocaleDateString("en-CA");
    const index = workoutPlan.planDays.findIndex((day) => {
      const planDate = new Date(day.date).toLocaleDateString("en-CA");
      return planDate === normalizedDate;
    });
    if (index === -1) return null;
    return { day: workoutPlan.planDays[index], index };
  };

  // Prepare marked dates for the calendar
  const getMarkedDates = () => {
    if (!workoutPlan) return {};

    const markedDates: any = {};
    const normalizedSelectedDate = new Date(selectedDate).toLocaleDateString(
      "en-CA"
    );

    workoutPlan.planDays.forEach((day) => {
      const dateStr = new Date(day.date).toLocaleDateString("en-CA");

      markedDates[dateStr] = {
        marked: true,
        dotColor: "#4f46e5",
        selected: dateStr === normalizedSelectedDate,
        selectedColor: "rgba(79, 70, 229, 0.1)",
      };
    });

    if (!markedDates[normalizedSelectedDate]) {
      markedDates[normalizedSelectedDate] = {
        selected: true,
        selectedColor: "rgba(79, 70, 229, 0.1)",
      };
    }

    return markedDates;
  };

  // Handle date selection
  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>One moment...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWorkoutPlan}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedPlanDayResult = getPlanDayForDate(selectedDate);
  const currentSelectedPlanDay = selectedPlanDayResult
    ? selectedPlanDayResult.day
    : null;
  const selectedPlanDayIndex = selectedPlanDayResult
    ? selectedPlanDayResult.index
    : null;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView style={styles.workoutList}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {workoutPlan?.name}
          </Text>
          {workoutPlan && (
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => setShowRegenerationModal(true)}
              disabled={regenerating}
            >
              <Ionicons name="refresh" size={20} color="#4f46e5" />
              <Text style={styles.regenerateButtonText}>Regenerate</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.calendarContainer}>
          <RNCalendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={getMarkedDates()}
            minDate={new Date().toISOString().split("T")[0]}
            maxDate={
              new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            }
            disableAllTouchEventsForDisabledDays={true}
            theme={{
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#6b7280",
              selectedDayBackgroundColor: "#4f46e5",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#4f46e5",
              dayTextColor: "#1f2937",
              textDisabledColor: "#d1d5db",
              dotColor: "#4f46e5",
              arrowColor: "#4f46e5",
              monthTextColor: "#1f2937",
              indicatorColor: "#4f46e5",
            }}
          />
        </View>

        {!currentSelectedPlanDay ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Rest Day</Text>
            <Text style={styles.restDayDescription}>
              Take this time to recover and prepare for your next workout!
            </Text>
          </View>
        ) : (
          <View style={styles.workoutDetails}>
            <View style={styles.workoutHeader}>
              {selectedPlanDayIndex !== null && (
                <Text style={styles.workoutTitle}>
                  Day {selectedPlanDayIndex + 1}
                </Text>
              )}
              <TouchableOpacity
                style={styles.dayRegenerateButton}
                onPress={() =>
                  handleOpenDailyRegeneration(currentSelectedPlanDay)
                }
                disabled={regeneratingDaily}
              >
                <Ionicons name="refresh" size={18} color="#4f46e5" />
                <Text style={styles.dayRegenerateButtonText}>
                  Regenerate Day
                </Text>
              </TouchableOpacity>
            </View>

            {currentSelectedPlanDay.description && (
              <Text style={styles.workoutDescription}>
                {currentSelectedPlanDay.description}
              </Text>
            )}

            {currentSelectedPlanDay.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>
                  {exercise.exercise.name}
                </Text>
                <View style={styles.exerciseDetails}>
                  <Text style={{ color: "#4b5563" }}>
                    {exercise.exercise.description}
                  </Text>

                  <View style={styles.exerciseMetricsRow}>
                    {exercise.sets !== undefined && exercise.sets !== null && (
                      <View style={styles.exerciseMetric}>
                        <Text style={styles.exerciseMetricText}>
                          Sets: {exercise.sets}
                        </Text>
                      </View>
                    )}
                    {exercise.reps !== undefined && exercise.reps !== null && (
                      <View style={styles.exerciseMetric}>
                        <Text style={styles.exerciseMetricText}>
                          Reps: {exercise.reps}
                        </Text>
                      </View>
                    )}
                    {exercise.weight !== undefined &&
                      exercise.weight !== null && (
                        <View style={styles.exerciseMetric}>
                          <Text style={styles.exerciseMetricText}>
                            Weight: {exercise.weight}kg
                          </Text>
                        </View>
                      )}
                    {exercise.duration !== undefined &&
                      exercise.duration !== null &&
                      exercise.duration !== 0 && (
                        <View style={styles.exerciseMetric}>
                          <Text style={styles.exerciseMetricText}>
                            Duration: {exercise.duration}s
                          </Text>
                        </View>
                      )}
                    {exercise.restTime !== undefined &&
                      exercise.restTime !== null && (
                        <View style={styles.exerciseMetric}>
                          <Text style={styles.exerciseMetricText}>
                            Rest: {exercise.restTime}s
                          </Text>
                        </View>
                      )}
                  </View>

                  {exercise.exercise.instructions && (
                    <Text style={styles.exerciseInstructions}>
                      {exercise.exercise.instructions}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <WorkoutRegenerationModal
        visible={showRegenerationModal}
        onClose={() => setShowRegenerationModal(false)}
        onRegenerate={handleRegenerate}
        loading={regenerating}
      />

      <DailyWorkoutRegenerationModal
        visible={showDailyRegenerationModal}
        onClose={() => {
          setShowDailyRegenerationModal(false);
          setSelectedPlanDay(null);
        }}
        onRegenerate={handleDailyRegenerate}
        loading={regeneratingDaily}
        dayNumber={
          selectedPlanDayIndex !== null ? selectedPlanDayIndex + 1 : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4f46e5",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  calendarContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  workoutList: {
    flex: 1,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#f8fafc",
    padding: 32,
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  restDayDescription: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  workoutDetails: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  workoutTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  exerciseCard: {
    backgroundColor: "#f8fafc",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  exerciseDetails: {
    flexDirection: "column",
    gap: 8,
  },
  exerciseMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  exerciseMetric: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  exerciseMetricText: {
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "500",
  },
  exerciseInstructions: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 22,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 6,
  },
  regenerateButtonText: {
    color: "#4f46e5",
    fontWeight: "600",
    fontSize: 14,
  },
  dayRegenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 6,
  },
  dayRegenerateButtonText: {
    color: "#4f46e5",
    fontWeight: "600",
    fontSize: 14,
  },
});
