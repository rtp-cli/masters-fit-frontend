import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import Text from "@components/Text";
// import ExerciseLink from "@components/ExerciseLink";
import {
  searchByDateAPI,
  searchExerciseAPI,
  searchExercisesAPI,
  DateSearchResponse,
  ExerciseSearchResponse,
  Exercise,
  DateSearchWorkout,
  ExerciseDetails,
  ExerciseUserStats,
} from "@lib/search";

type SearchType = "date" | "exercise" | "general";

export default function SearchScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("general");
  const [isLoading, setIsLoading] = useState(false);

  // Search results
  const [dateResult, setDateResult] = useState<DateSearchWorkout | null>(null);
  const [exerciseResult, setExerciseResult] = useState<{
    exercise: ExerciseDetails;
    userStats: ExerciseUserStats | null;
  } | null>(null);
  const [generalResults, setGeneralResults] = useState<Exercise[]>([]);

  // UI state
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );

  // Determine search type based on query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchType("general");
      return;
    }

    // Check if it's a date (YYYY-MM-DD format)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(searchQuery)) {
      setSearchType("date");
    } else {
      setSearchType("general");
    }
  }, [searchQuery]);

  // Perform search based on type
  const performSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setIsLoading(true);

    try {
      if (searchType === "date") {
        const result = await searchByDateAPI(user.id, searchQuery);
        console.log("🔍 Date search result:", JSON.stringify(result, null, 2));
        if (result.success) {
          setDateResult(result.workout);
          setExerciseResult(null);
          setGeneralResults([]);
        }
      } else {
        const result = await searchExercisesAPI(searchQuery);
        console.log(
          "🔍 General search result:",
          JSON.stringify(result, null, 2)
        );
        if (result.success) {
          setGeneralResults(result.exercises);
          setDateResult(null);
          setExerciseResult(null);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to perform search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exercise selection for detailed view
  const handleExerciseSelect = async (exercise: Exercise) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await searchExerciseAPI(user.id, exercise.id);
      if (result.success) {
        setExerciseResult({
          exercise: result.exercise,
          userStats: result.userStats,
        });
        setSearchType("exercise");
        setDateResult(null);
        setGeneralResults([]);
      }
    } catch (error) {
      console.error("Exercise search error:", error);
      Alert.alert(
        "Error",
        "Failed to load exercise details. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchQuery("");
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);
    setSelectedExercise(null);
    setSearchType("general");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Unknown Date";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Invalid date, return original
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString || "Unknown Date"; // fallback to original string if date parsing fails
    }
  };

  // Format date for last performed
  const formatLastPerformedDate = (date: Date | string | null | undefined) => {
    try {
      if (!date) return "Never";
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Unknown";
      return dateObj.toLocaleDateString();
    } catch (error) {
      return "Unknown";
    }
  };

  // Format equipment array
  const formatEquipment = (equipment: string[] | null | undefined) => {
    if (!equipment || equipment.length === 0) return "None";
    return equipment.join(", ");
  };

  // Format muscle groups array safely
  const formatMuscleGroups = (muscleGroups: string[] | null | undefined) => {
    if (!muscleGroups || muscleGroups.length === 0) return "Unknown";
    return muscleGroups.join(", ");
  };

  // Format difficulty safely
  const formatDifficulty = (difficulty: string | null | undefined) => {
    return difficulty || "Unknown";
  };

  // Format description safely
  const formatDescription = (description: string | null | undefined) => {
    return description || "No description available";
  };

  // Format instructions safely
  const formatInstructions = (instructions: string | null | undefined) => {
    return instructions || "No instructions available";
  };

  // Format numeric value safely
  const formatNumber = (value: number | null | undefined) => {
    return value?.toString() || "0";
  };

  // Format name safely
  const formatName = (name: string | null | undefined) => {
    return name || "Unknown Exercise";
  };

  // Get difficulty color based on level
  const getDifficultyColor = (difficulty: string) => {
    const lowerDifficulty = (difficulty || "").toLowerCase();
    switch (lowerDifficulty) {
      case "beginner":
        return "#22c55e"; // green
      case "intermediate":
        return "#f59e0b"; // yellow
      case "advanced":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  // Safe string conversion for display
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  // Safe array join with fallback
  const safeArrayJoin = (arr: any[], separator: string = ", "): string => {
    if (!Array.isArray(arr)) return "";
    return arr
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item))
      .join(separator);
  };

  // Safe number conversion for styles
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Date or Exercise"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={performSearch}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text variant="body" color="#6b7280" style={styles.loadingText}>
              Searching...
            </Text>
          </View>
        )}

        {/* Exercise Detail View */}
        {exerciseResult && (
          <View style={styles.exerciseDetailContainer}>
            <View style={styles.exerciseDetailCard}>
              {/* Exercise Title */}
              <Text variant="h3" style={styles.exerciseDetailName}>
                {formatName(exerciseResult.exercise.name)}
              </Text>

              {/* Description */}
              <Text
                variant="body"
                color="#6b7280"
                style={styles.exerciseDetailDescription}
              >
                {formatDescription(exerciseResult.exercise.description)}
              </Text>

              {/* Muscle Groups */}
              <View style={styles.muscleGroupsSection}>
                <Text variant="title" style={styles.sectionTitle}>
                  Muscle Groups
                </Text>
                <View style={styles.muscleGroupsContainer}>
                  {exerciseResult.exercise.muscleGroups &&
                  Array.isArray(exerciseResult.exercise.muscleGroups) &&
                  exerciseResult.exercise.muscleGroups.length > 0 ? (
                    exerciseResult.exercise.muscleGroups.map(
                      (muscle: string, index: number) => (
                        <View key={index} style={styles.muscleGroupTag}>
                          <Text
                            variant="bodySmall"
                            style={styles.muscleGroupText}
                          >
                            {muscle || "Unknown"}
                          </Text>
                        </View>
                      )
                    )
                  ) : (
                    <Text
                      variant="body"
                      color="#9ca3af"
                      style={styles.noDataText}
                    >
                      No muscle groups specified
                    </Text>
                  )}
                </View>
              </View>

              {/* Equipment */}
              <View style={styles.detailSection}>
                <Text variant="title" style={styles.sectionTitle}>
                  Equipment
                </Text>
                <Text variant="body" color="#4b5563">
                  {formatEquipment(exerciseResult.exercise.equipment)}
                </Text>
              </View>

              {/* Instructions */}
              <View style={styles.detailSection}>
                <Text variant="title" style={styles.sectionTitle}>
                  Instructions
                </Text>
                <Text variant="body" color="#4b5563">
                  {formatInstructions(exerciseResult.exercise.instructions)}
                </Text>

                {/* Exercise Link (YouTube video or image) */}
                {/* {exerciseResult.exercise.link && (
                  <ExerciseLink
                    link={exerciseResult.exercise.link}
                    exerciseName={exerciseResult.exercise.name}
                  />
                )} */}
              </View>

              {/* User Performance Stats */}
              {exerciseResult.userStats && (
                <View style={styles.performanceSection}>
                  <Text variant="h4" style={styles.performanceSectionTitle}>
                    Your Performance
                  </Text>

                  <View style={styles.performanceGrid}>
                    <View style={styles.performanceItem}>
                      <Text variant="h2" style={styles.performanceValue}>
                        {`${exerciseResult.userStats.totalAssignments || 0}`}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="#6b7280"
                        style={styles.performanceLabel}
                      >
                        Times assigned
                      </Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text variant="h2" style={styles.performanceValue}>
                        {`${exerciseResult.userStats.totalCompletions || 0}`}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="#6b7280"
                        style={styles.performanceLabel}
                      >
                        Completed
                      </Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text variant="h2" style={styles.performanceValue}>
                        {`${exerciseResult.userStats.completionRate || 0}%`}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="#6b7280"
                        style={styles.performanceLabel}
                      >
                        Success Rate
                      </Text>
                    </View>
                  </View>

                  <View style={styles.performanceGrid}>
                    <View style={styles.performanceItem}>
                      <Text variant="h2" style={styles.performanceValue}>
                        {`${exerciseResult.userStats.averageSets || 0}`}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="#6b7280"
                        style={styles.performanceLabel}
                      >
                        Avg Sets
                      </Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text variant="h2" style={styles.performanceValue}>
                        {`${exerciseResult.userStats.averageReps || 0}`}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="#6b7280"
                        style={styles.performanceLabel}
                      >
                        Avg Reps
                      </Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text variant="h2" style={styles.performanceValue}>
                        {exerciseResult.userStats.averageWeight
                          ? `${exerciseResult.userStats.averageWeight} lbs`
                          : "N/A"}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="#6b7280"
                        style={styles.performanceLabel}
                      >
                        Avg Weight (lbs)
                      </Text>
                    </View>
                  </View>

                  {/* Personal Records */}
                  <View style={styles.personalRecordsSection}>
                    <Text variant="title" style={styles.personalRecordsTitle}>
                      Personal Records
                    </Text>
                    <View style={styles.recordsGrid}>
                      <View style={styles.recordItem}>
                        <Text variant="h3" style={styles.recordValue}>
                          {`${
                            exerciseResult.userStats.personalRecord.maxSets || 0
                          }`}
                        </Text>
                        <Text variant="caption" style={styles.recordLabel}>
                          Max Sets
                        </Text>
                      </View>
                      <View style={styles.recordItem}>
                        <Text variant="h3" style={styles.recordValue}>
                          {`${
                            exerciseResult.userStats.personalRecord.maxReps || 0
                          }`}
                        </Text>
                        <Text variant="caption" style={styles.recordLabel}>
                          Max Reps
                        </Text>
                      </View>
                      <View style={styles.recordItem}>
                        <Text variant="h3" style={styles.recordValue}>
                          {`${
                            exerciseResult.userStats.personalRecord.maxSets || 0
                          }`}
                        </Text>
                        <Text variant="caption" style={styles.recordLabel}>
                          Max Sets
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Last Performed */}
                  {exerciseResult.userStats.lastPerformed && (
                    <View style={styles.lastPerformedSection}>
                      <Text
                        variant="body"
                        color="#6b7280"
                        style={styles.lastPerformedLabel}
                      >
                        Last performed{" "}
                        {formatLastPerformedDate(
                          exerciseResult.userStats.lastPerformed
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Date Search Results */}
        {dateResult && (
          <View style={styles.resultsContainer}>
            <Text variant="title" style={styles.sectionTitle}>
              {"Workout for " + formatDate(searchQuery)}
            </Text>
            <View style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text variant="title" style={styles.workoutName}>
                  {safeString(dateResult.name)}
                </Text>
                <View
                  style={[
                    styles.completionBadge,
                    {
                      backgroundColor: dateResult.completed
                        ? "#22C55E"
                        : "#F59E0B",
                    },
                  ]}
                >
                  <Text variant="caption" style={styles.completionBadgeText}>
                    {dateResult.completed ? "Completed" : "In Progress"}
                  </Text>
                </View>
              </View>

              <Text
                variant="body"
                color="#6b7280"
                style={styles.workoutDescription}
              >
                {safeString(dateResult.description)}
              </Text>

              <View style={styles.completionRateContainer}>
                <Text
                  variant="body"
                  weight="medium"
                  color="#374151"
                  style={styles.completionRateLabel}
                >
                  Overall Progress
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${safeNumber(
                          dateResult.overallCompletionRate
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text variant="bodySmall" color="#6b7280">
                  {safeString(dateResult.overallCompletionRate) + "% Complete"}
                </Text>
              </View>

              {dateResult.planDay?.exercises &&
                Array.isArray(dateResult.planDay.exercises) && (
                  <View>
                    <Text variant="title" style={styles.exercisesTitle}>
                      {"Exercises (" +
                        safeString(dateResult.planDay.exercises.length) +
                        ")"}
                    </Text>
                    {dateResult.planDay.exercises.map(
                      (exercise: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.exerciseItem}
                          onPress={() => {
                            try {
                              if (exercise?.exercise?.id) {
                                handleExerciseSelect({
                                  id: Number(exercise.exercise.id),
                                  name: safeString(
                                    exercise.exercise.name || "Unknown Exercise"
                                  ),
                                  description: safeString(
                                    exercise.exercise.description || ""
                                  ),
                                  muscleGroups: Array.isArray(
                                    exercise.exercise.muscleGroups
                                  )
                                    ? exercise.exercise.muscleGroups
                                    : [],
                                  equipment: Array.isArray(
                                    exercise.exercise.equipment
                                  )
                                    ? exercise.exercise.equipment
                                    : [],
                                  difficulty: safeString(
                                    exercise.exercise.difficulty || "Unknown"
                                  ),
                                  instructions: safeString(
                                    exercise.exercise.instructions || ""
                                  ),
                                  createdAt: new Date(),
                                  updatedAt: new Date(),
                                });
                              }
                            } catch (error) {
                              console.error("Error selecting exercise:", error);
                            }
                          }}
                        >
                          <View style={styles.exerciseItemHeader}>
                            <Text variant="title" style={styles.exerciseName}>
                              {safeString(
                                exercise?.exercise?.name || "Unknown"
                              )}
                            </Text>
                            <View style={styles.exerciseItemRightSection}>
                              <View
                                style={[
                                  styles.exerciseCompletionBadge,
                                  {
                                    backgroundColor:
                                      safeNumber(exercise?.completionRate) ===
                                      100
                                        ? "#22C55E"
                                        : safeNumber(exercise?.completionRate) >
                                          0
                                        ? "#F59E0B"
                                        : "#EF4444",
                                  },
                                ]}
                              >
                                <Text
                                  variant="caption"
                                  style={styles.exerciseCompletionBadgeText}
                                >
                                  {safeString(exercise?.completionRate || 0) +
                                    "%"}
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color="#9CA3AF"
                                style={styles.exerciseChevron}
                              />
                            </View>
                          </View>
                          <Text
                            variant="bodySmall"
                            color="#6b7280"
                            style={styles.exerciseDetails}
                          >
                            {safeArrayJoin(exercise?.exercise?.muscleGroups) +
                              " • " +
                              safeString(
                                exercise?.exercise?.difficulty || "Unknown"
                              )}
                          </Text>
                          {exercise?.exercise?.equipment &&
                            Array.isArray(exercise.exercise.equipment) &&
                            exercise.exercise.equipment.length > 0 && (
                              <Text variant="caption" color="#6b7280">
                                {"Equipment: " +
                                  safeArrayJoin(exercise.exercise.equipment)}
                              </Text>
                            )}
                          <View style={styles.exerciseProgressContainer}>
                            <Text
                              variant="bodySmall"
                              weight="medium"
                              color="#374151"
                              style={styles.exerciseProgressLabel}
                            >
                              Progress
                            </Text>
                            <View style={styles.exerciseProgressBar}>
                              <View
                                style={[
                                  styles.exerciseProgressFill,
                                  {
                                    width: `${safeNumber(
                                      exercise?.completionRate
                                    )}%`,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
            </View>
          </View>
        )}

        {/* General Exercise Search Results */}
        {generalResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text variant="title" style={styles.sectionTitle}>
              {`Exercise Results (${safeString(generalResults.length)})`}
            </Text>
            {generalResults.map((exercise: any, index: number) => (
              <TouchableOpacity
                key={`general-exercise-${exercise?.id || index}`}
                style={styles.exerciseCard}
                onPress={() => {
                  try {
                    handleExerciseSelect({
                      id: Number(exercise?.id) || 0,
                      name: safeString(exercise?.name || "Unknown Exercise"),
                      description: safeString(exercise?.description || ""),
                      muscleGroups: Array.isArray(exercise?.muscleGroups)
                        ? exercise.muscleGroups
                        : [],
                      equipment: Array.isArray(exercise?.equipment)
                        ? exercise.equipment
                        : [],
                      difficulty: safeString(exercise?.difficulty || "Unknown"),
                      instructions: safeString(exercise?.instructions || ""),
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    });
                  } catch (error) {
                    console.error("Error selecting general exercise:", error);
                  }
                }}
              >
                <View style={styles.exerciseInfo}>
                  <Text variant="title">
                    {safeString(exercise?.name || "Unknown Exercise")}
                  </Text>
                  <Text
                    variant="bodySmall"
                    color="#6b7280"
                    style={styles.exerciseDetails}
                  >
                    {`${
                      safeArrayJoin(exercise?.muscleGroups) || "Unknown"
                    } • ${safeString(exercise?.difficulty || "Unknown")}`}
                  </Text>
                  {exercise?.description && (
                    <Text
                      variant="bodySmall"
                      color="#6b7280"
                      style={styles.exerciseDescription}
                    >
                      {safeString(exercise.description)}
                    </Text>
                  )}
                  <View style={styles.exerciseTags}>
                    <Text variant="caption" color="#4b5563">
                      {`Equipment: ${
                        safeArrayJoin(exercise?.equipment) || "None"
                      }`}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!isLoading &&
          !dateResult &&
          !exerciseResult &&
          generalResults.length === 0 &&
          searchQuery.trim() && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color="#D1D5DB" />
              <Text
                variant="title"
                color="#6b7280"
                style={styles.emptyStateText}
              >
                No results found
              </Text>
              <Text
                variant="bodySmall"
                color="#9ca3af"
                style={styles.emptyStateSubtext}
              >
                Try searching for a date (YYYY-MM-DD) or exercise name
              </Text>
            </View>
          )}

        {/* How to Search Instructions */}
        {!searchQuery.trim() && (
          <View style={styles.instructionsContainer}>
            <Text variant="h4" style={styles.instructionsTitle}>
              How to Search
            </Text>

            <View style={styles.instructionItem}>
              <View style={styles.instructionIcon}>
                <Ionicons name="calendar-outline" size={20} color="#22C55E" />
              </View>
              <Text
                variant="bodySmall"
                color="#4b5563"
                style={styles.instructionText}
              >
                Search by date (e.g., 2024-01-15) to see the workout for that
                day
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionIcon}>
                <Ionicons name="barbell-outline" size={20} color="#22C55E" />
              </View>
              <Text
                variant="bodySmall"
                color="#4b5563"
                style={styles.instructionText}
              >
                Search by exercise name to see exercises
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  exerciseDetailContainer: {
    padding: 16,
  },
  exerciseDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseDetailName: {
    marginBottom: 8,
  },
  exerciseDetailDescription: {
    marginBottom: 24,
  },
  muscleGroupsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  muscleGroupsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  muscleGroupTag: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  muscleGroupText: {
    color: "#065F46",
    fontWeight: "500",
  },
  detailSection: {
    marginBottom: 24,
  },
  noDataText: {
    fontStyle: "italic",
  },
  performanceSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  performanceSectionTitle: {
    marginBottom: 20,
  },
  performanceGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  performanceItem: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  performanceValue: {
    color: "#1F2937",
  },
  performanceLabel: {
    marginTop: 4,
    textAlign: "center",
  },
  personalRecordsSection: {
    marginTop: 20,
  },
  personalRecordsTitle: {
    marginBottom: 16,
  },
  recordsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recordItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  recordValue: {
    color: "#D97706",
  },
  recordLabel: {
    color: "#92400E",
    marginTop: 4,
    textAlign: "center",
  },
  lastPerformedSection: {
    marginTop: 20,
    alignItems: "center",
  },
  lastPerformedLabel: {
    textAlign: "center",
  },
  resultsContainer: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  workoutName: {
    flex: 1,
  },
  completionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completionBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  workoutDescription: {
    marginBottom: 16,
  },
  completionRateContainer: {
    marginBottom: 20,
  },
  completionRateLabel: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 4,
  },
  exercisesTitle: {
    marginBottom: 16,
  },
  exerciseItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseName: {
    flex: 1,
  },
  exerciseDetails: {
    marginBottom: 8,
  },
  exerciseItemRightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseCompletionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseCompletionBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  exerciseProgressContainer: {
    marginTop: 8,
  },
  exerciseProgressLabel: {
    marginBottom: 4,
  },
  exerciseProgressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  },
  exerciseProgressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 3,
  },
  exerciseChevron: {
    marginLeft: 8,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseDescription: {
    marginTop: 4,
    marginBottom: 8,
  },
  exerciseTags: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: 40,
    margin: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateText: {
    marginTop: 16,
  },
  emptyStateSubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  instructionsContainer: {
    padding: 16,
  },
  instructionsTitle: {
    marginBottom: 20,
    fontWeight: "400",
    marginLeft: 10,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionIcon: {
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
  },
});
