import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard, DashboardFilters } from "@hooks/useDashboard";
import { SimpleCircularProgress } from "@components/charts/CircularProgress";
import { BarChart } from "@components/charts/BarChart";
import { LineChart } from "@components/charts/LineChart";
import { PieChart } from "@components/charts/PieChart";
import {
  FilterSelector,
  timeRangeOptions,
  groupByOptions,
} from "@components/FilterSelector";
import { formatDate, formatNumber, getCurrentDate } from "@utils/index";
import { fetchActiveWorkout } from "@lib/workouts";
import {
  WorkoutWithDetails,
  PlanDayWithExercises,
  PlanDayWithExercise,
} from "../types";
import { Ionicons } from "@expo/vector-icons";

// Goal name mappings
const goalNames: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  endurance: "Endurance",
  flexibility: "Flexibility",
  general_fitness: "General Fitness",
  mobility: "Mobility",
  balance: "Balance",
  recovery: "Recovery",
};

export default function DashboardScreen() {
  const { user, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRange: "1m",
    groupBy: "exercise",
  });

  // Today's schedule state
  const [todaysWorkout, setTodaysWorkout] =
    useState<PlanDayWithExercises | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);

  const {
    dashboardData,
    weeklySummary,
    workoutConsistency,
    weightMetrics,
    weightAccuracy,
    goalProgress,
    totalVolumeMetrics,
    loading,
    error,
    refreshAllData,
  } = useDashboard(user?.id || 0);

  useEffect(() => {
    if (user?.id) {
      refreshAllData(filters);
      fetchTodaysWorkout();
    }
  }, [refreshAllData, filters, user?.id]);

  const fetchTodaysWorkout = async () => {
    try {
      setLoadingToday(true);
      const workoutPlan = await fetchActiveWorkout();
      if (workoutPlan) {
        const today = getCurrentDate();
        const todaysPlanDay = workoutPlan.workout.planDays.find(
          (day: PlanDayWithExercises) => {
            const planDate = new Date(day.date).toISOString().split("T")[0];
            return planDate === today;
          }
        );
        setTodaysWorkout(todaysPlanDay || null);
      }
    } catch (err) {
      console.error("Error fetching today's workout:", err);
    } finally {
      setLoadingToday(false);
    }
  };

  const handleRefresh = () => {
    if (user?.id) {
      refreshAllData(filters);
      fetchTodaysWorkout();
    }
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (error) {
    Alert.alert("Error", error);
  }

  // Show message if user is not authenticated
  if (!isAuthenticated || !user?.id) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Please log in to view your dashboard
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare chart data
  const consistencyChartData = workoutConsistency.map((week) => ({
    label: formatDate(new Date(week.week), { month: "short", day: "numeric" }),
    value: week.completionRate,
  }));

  const weightChartData = weightMetrics.slice(0, 10).map((metric) => ({
    label:
      metric.name.length > 10
        ? metric.name.substring(0, 10) + "..."
        : metric.name,
    value: metric.totalWeight,
  }));

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Dashboard</Text>
          <Text style={styles.subtitle}>Your fitness progress at a glance</Text>
        </View>

        {loading && !dashboardData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading your progress...</Text>
          </View>
        ) : (
          <>
            {/* Weekly Summary Card */}
            {weeklySummary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>This Week's Summary</Text>
                <View style={styles.weeklySummaryCard}>
                  <View style={styles.weeklyStatsRow}>
                    <View style={styles.circularProgressContainer}>
                      <SimpleCircularProgress
                        size={80}
                        strokeWidth={6}
                        percentage={weeklySummary.workoutCompletionRate}
                        color="#10b981"
                      >
                        <Text style={styles.percentageText}>
                          {formatNumber(weeklySummary.workoutCompletionRate)}%
                        </Text>
                      </SimpleCircularProgress>
                      <Text style={styles.progressLabel}>Workouts</Text>
                    </View>

                    <View style={styles.circularProgressContainer}>
                      <SimpleCircularProgress
                        size={80}
                        strokeWidth={6}
                        percentage={weeklySummary.exerciseCompletionRate}
                        color="#3b82f6"
                      >
                        <Text style={styles.percentageText}>
                          {formatNumber(weeklySummary.exerciseCompletionRate)}%
                        </Text>
                      </SimpleCircularProgress>
                      <Text style={styles.progressLabel}>Exercises</Text>
                    </View>

                    <View style={styles.streakContainer}>
                      <Text style={styles.streakNumber}>
                        {weeklySummary.streak}
                      </Text>
                      <Text style={styles.streakLabel}>Day Streak</Text>
                    </View>
                  </View>

                  <View style={styles.weeklyDetailsRow}>
                    <View style={styles.weeklyDetail}>
                      <Text style={styles.weeklyDetailNumber}>
                        {weeklySummary.completedWorkoutsThisWeek}
                      </Text>
                      <Text style={styles.weeklyDetailLabel}>Completed</Text>
                    </View>
                    <View style={styles.weeklyDetail}>
                      <Text style={styles.weeklyDetailNumber}>
                        {weeklySummary.totalWorkoutsThisWeek}
                      </Text>
                      <Text style={styles.weeklyDetailLabel}>Planned</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Today's Schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <View style={styles.todayScheduleCard}>
                <View style={styles.todayHeader}>
                  <View style={styles.todayDateContainer}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#4f46e5"
                    />
                    <Text style={styles.todayDate}>
                      {formatDate(new Date(), {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  {loadingToday && (
                    <ActivityIndicator size="small" color="#4f46e5" />
                  )}
                </View>

                {todaysWorkout ? (
                  <View style={styles.workoutContainer}>
                    <View style={styles.workoutHeader}>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName}>
                          {todaysWorkout.name || "Today's Workout"}
                        </Text>
                        <Text style={styles.workoutType}>
                          {todaysWorkout.exercises?.length || 0} exercises
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.startWorkoutButton}
                        onPress={() => {
                          // Navigate to workout screen - you can add navigation here
                          Alert.alert("Workout", "Navigate to workout screen");
                        }}
                      >
                        <Ionicons name="play" size={16} color="white" />
                        <Text style={styles.startWorkoutText}>Start</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.exerciseScroll}
                    >
                      {todaysWorkout.exercises
                        ?.slice(0, 5)
                        .map(
                          (
                            planExercise: PlanDayWithExercise,
                            index: number
                          ) => (
                            <View key={index} style={styles.exercisePreview}>
                              <Text
                                style={styles.exerciseName}
                                numberOfLines={2}
                              >
                                {planExercise.exercise?.name || "Exercise"}
                              </Text>
                              <Text style={styles.exerciseDetails}>
                                {planExercise.sets}×{planExercise.reps}
                                {planExercise.weight &&
                                  planExercise.weight > 0 &&
                                  ` @ ${planExercise.weight}lbs`}
                              </Text>
                            </View>
                          )
                        )}
                      {(todaysWorkout.exercises?.length || 0) > 5 && (
                        <View style={styles.exercisePreview}>
                          <Text style={styles.exerciseName}>
                            +{(todaysWorkout.exercises?.length || 0) - 5} more
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.noWorkoutContainer}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={48}
                      color="#10b981"
                    />
                    <Text style={styles.noWorkoutTitle}>
                      No workout scheduled
                    </Text>
                    <Text style={styles.noWorkoutSubtitle}>
                      Enjoy your rest day or plan a new workout!
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analytics Filters</Text>
              <View style={styles.filtersCard}>
                <FilterSelector
                  title="Time Range"
                  options={timeRangeOptions}
                  selectedValue={filters.timeRange || "1m"}
                  onSelect={(value) => handleFilterChange("timeRange", value)}
                />
                <FilterSelector
                  title="Group Weight Metrics By"
                  options={groupByOptions}
                  selectedValue={filters.groupBy || "exercise"}
                  onSelect={(value) => handleFilterChange("groupBy", value)}
                />
              </View>
            </View>

            {/* Workout Consistency Chart */}
            {workoutConsistency.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Workout Consistency</Text>
                <View style={styles.chartCard}>
                  <Text style={styles.chartSubtitle}>
                    Weekly completion rates over time
                  </Text>
                  <BarChart
                    data={consistencyChartData}
                    height={200}
                    maxValue={100}
                    color="#8b5cf6"
                  />
                </View>
              </View>
            )}

            {/* Weight Metrics Chart */}
            {weightMetrics.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Total Weight Lifted</Text>
                <View style={styles.chartCard}>
                  <Text style={styles.chartSubtitle}>
                    Top exercises by total weight (sets × reps × weight)
                  </Text>
                  <BarChart
                    data={weightChartData}
                    height={200}
                    color="#f59e0b"
                  />
                </View>
              </View>
            )}

            {/* Total Volume Chart (Strength Progress) */}
            {totalVolumeMetrics && totalVolumeMetrics.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Strength Progress</Text>
                <View style={styles.chartCard}>
                  <Text style={styles.chartSubtitle}>
                    Total volume over time (sets × reps × weight)
                  </Text>
                  <LineChart
                    data={totalVolumeMetrics.map((metric) => ({
                      label: metric.label,
                      value: metric.totalVolume,
                      date: metric.date,
                    }))}
                    height={200}
                    color="#10b981"
                  />
                  <Text style={styles.chartNote}>
                    Shows your strength progression over time
                  </Text>
                </View>
              </View>
            )}

            {/* Weight Accuracy */}
            {weightAccuracy && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weight Accuracy</Text>
                <View style={styles.card}>
                  {weightAccuracy.hasPlannedWeights ? (
                    <>
                      <View style={styles.accuracyHeader}>
                        <SimpleCircularProgress
                          size={80}
                          percentage={weightAccuracy.accuracyRate}
                          strokeWidth={8}
                          color="#10b981"
                          backgroundColor="#e5e7eb"
                        >
                          <Text style={styles.accuracyRate}>
                            {formatNumber(weightAccuracy.accuracyRate)}%
                          </Text>
                          <Text style={styles.accuracyLabel}>Accuracy</Text>
                        </SimpleCircularProgress>
                        <View style={styles.accuracyStats}>
                          <Text style={styles.accuracyStatNumber}>
                            {weightAccuracy.totalSets}
                          </Text>
                          <Text style={styles.accuracyStatLabel}>
                            Total Sets
                          </Text>
                        </View>
                      </View>

                      {/* Weight Accuracy Pie Chart */}
                      {weightAccuracy.chartData &&
                        weightAccuracy.chartData.length > 0 && (
                          <View style={styles.chartContainer}>
                            <Text style={styles.chartSubtitle}>
                              How often you follow the prescribed weights
                            </Text>
                            <PieChart
                              data={weightAccuracy.chartData}
                              size={200}
                              showPercentages={true}
                            />
                          </View>
                        )}

                      <Text style={styles.accuracyNote}>
                        Avg difference:{" "}
                        {formatNumber(weightAccuracy.avgWeightDifference, 1)}{" "}
                        lbs
                      </Text>
                    </>
                  ) : (
                    <View style={styles.noWeightAccuracyContainer}>
                      <View style={styles.noWeightAccuracyIcon}>
                        <Text style={styles.noWeightAccuracyEmoji}>⚖️</Text>
                      </View>
                      <Text style={styles.noWeightAccuracyTitle}>
                        Weight Accuracy Not Available
                      </Text>
                      <Text style={styles.noWeightAccuracyMessage}>
                        {weightAccuracy.hasExerciseData
                          ? "Your workout plan doesn't specify target weights, so we can't track weight accuracy. Keep logging your workouts!"
                          : "Start logging exercises with weights to see your accuracy metrics."}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Goal Progress */}
            {goalProgress.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goal Progress</Text>
                <View style={styles.goalsContainer}>
                  {goalProgress.map((goal, index) => (
                    <View key={index} style={styles.goalCard}>
                      <View style={styles.goalHeader}>
                        <Text style={styles.goalName}>
                          {goalNames[goal.goal] || goal.goal}
                        </Text>
                        <Text style={styles.goalScore}>
                          {goal.progressScore}%
                        </Text>
                      </View>

                      <View style={styles.goalProgressBar}>
                        <View
                          style={[
                            styles.goalProgressFill,
                            { width: `${goal.progressScore}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.goalStats}>
                        <View style={styles.goalStat}>
                          <Text style={styles.goalStatNumber}>
                            {goal.completedWorkouts}
                          </Text>
                          <Text style={styles.goalStatLabel}>Workouts</Text>
                        </View>
                        <View style={styles.goalStat}>
                          <Text style={styles.goalStatNumber}>
                            {formatNumber(goal.totalWeight / 1000, 1)}k
                          </Text>
                          <Text style={styles.goalStatLabel}>lbs Total</Text>
                        </View>
                        <View style={styles.goalStat}>
                          <Text style={styles.goalStatNumber}>
                            {goal.totalSets}
                          </Text>
                          <Text style={styles.goalStatLabel}>Sets</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6b7280",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  weeklySummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  weeklyStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  circularProgressContainer: {
    alignItems: "center",
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
  },
  streakContainer: {
    alignItems: "center",
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ef4444",
  },
  streakLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  weeklyDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  weeklyDetail: {
    alignItems: "center",
  },
  weeklyDetailNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  weeklyDetailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  filtersCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accuracyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  accuracyRate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  accuracyLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  accuracyStats: {
    marginLeft: 20,
    alignItems: "center",
  },
  accuracyStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  accuracyStatLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  chartContainer: {
    marginBottom: 16,
  },
  accuracyNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  goalsContainer: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  goalScore: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    backgroundColor: "#4f46e5",
    borderRadius: 4,
  },
  goalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  goalStat: {
    alignItems: "center",
  },
  goalStatNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
  },
  goalStatLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  todayScheduleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  todayDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginLeft: 8,
  },
  workoutContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  workoutInfo: {
    flexDirection: "column",
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  workoutType: {
    fontSize: 12,
    color: "#6b7280",
  },
  startWorkoutButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  startWorkoutText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginLeft: 8,
  },
  exerciseScroll: {
    marginTop: 16,
  },
  exercisePreview: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  exerciseDetails: {
    fontSize: 12,
    color: "#6b7280",
  },
  noWorkoutContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noWorkoutTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
  },
  noWorkoutSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  chartNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  noWeightAccuracyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noWeightAccuracyIcon: {
    marginBottom: 16,
  },
  noWeightAccuracyEmoji: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6b7280",
  },
  noWeightAccuracyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
  },
  noWeightAccuracyMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
