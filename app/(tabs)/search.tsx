import { useState, useEffect } from "react";
import {
  View,
  Text,
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

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "#10b981";
      case "intermediate":
        return "#f59e0b";
      case "advanced":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // Safe rendering helpers
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();
    return String(value);
  };

  const safeArrayJoin = (arr: any[], separator: string = ", "): string => {
    if (!Array.isArray(arr)) return "";
    return arr
      .filter((item) => item !== null && item !== undefined)
      .map(safeString)
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
        {/* Search Header */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color="#6b7280"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by date (YYYY-MM-DD) or exercise name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={performSearch}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.trim() && (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={performSearch}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Type Indicator */}
        {searchQuery.trim() && (
          <View style={styles.searchTypeContainer}>
            <Text style={styles.searchTypeText}>
              {searchType === "date"
                ? "📅 Searching by date"
                : "💪 Searching exercises"}
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Date Search Results - STEP 2: Add dynamic colors and progress bar */}
        {dateResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>
              {"Workout for " + formatDate(searchQuery)}
            </Text>
            <View style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutName}>
                  {safeString(dateResult.name)}
                </Text>
                <View
                  style={[
                    styles.completionBadge,
                    {
                      backgroundColor: dateResult.completed
                        ? "#10b981"
                        : "#f59e0b",
                    },
                  ]}
                >
                  <Text style={styles.completionBadgeText}>
                    {dateResult.completed ? "Completed" : "In Progress"}
                  </Text>
                </View>
              </View>

              <Text style={styles.workoutDescription}>
                {safeString(dateResult.description)}
              </Text>

              <View style={styles.completionRateContainer}>
                <Text style={styles.completionRateLabel}>Overall Progress</Text>
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
                <Text style={styles.completionRateText}>
                  {safeString(dateResult.overallCompletionRate) + "% Complete"}
                </Text>
              </View>

              {dateResult.planDay?.exercises &&
                Array.isArray(dateResult.planDay.exercises) && (
                  <View>
                    <Text style={styles.exercisesTitle}>
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
                            <Text style={styles.exerciseName}>
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
                                        ? "#10b981"
                                        : safeNumber(exercise?.completionRate) >
                                          0
                                        ? "#f59e0b"
                                        : "#ef4444",
                                  },
                                ]}
                              >
                                <Text
                                  style={styles.exerciseCompletionBadgeText}
                                >
                                  {safeString(exercise?.completionRate || 0) +
                                    "%"}
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color="#6b7280"
                                style={styles.exerciseChevron}
                              />
                            </View>
                          </View>
                          <Text style={styles.exerciseDetails}>
                            {safeArrayJoin(exercise?.exercise?.muscleGroups) +
                              " • " +
                              safeString(
                                exercise?.exercise?.difficulty || "Unknown"
                              )}
                          </Text>
                          {exercise?.exercise?.equipment &&
                            Array.isArray(exercise.exercise.equipment) &&
                            exercise.exercise.equipment.length > 0 && (
                              <Text style={styles.exerciseEquipment}>
                                {"Equipment: " +
                                  safeArrayJoin(exercise.exercise.equipment)}
                              </Text>
                            )}
                          <View style={styles.exerciseProgressContainer}>
                            <Text style={styles.exerciseProgressLabel}>
                              Progress
                            </Text>
                            <View style={styles.exerciseProgressBar}>
                              <View
                                style={[
                                  styles.exerciseProgressFill,
                                  {
                                    width: `${safeNumber(
                                      exercise?.completionRate || 0
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

        {/* Exercise Detail Results */}
        {exerciseResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Exercise Details</Text>
            <View style={styles.exerciseDetailCard}>
              <View style={styles.exerciseDetailHeader}>
                <Text style={styles.exerciseDetailName}>
                  {formatName(exerciseResult.exercise.name)}
                </Text>
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor: getDifficultyColor(
                        exerciseResult.exercise.difficulty
                      ),
                    },
                  ]}
                >
                  <Text style={styles.difficultyBadgeText}>
                    {formatDifficulty(exerciseResult.exercise.difficulty)}
                  </Text>
                </View>
              </View>

              <Text style={styles.exerciseDetailDescription}>
                {formatDescription(exerciseResult.exercise.description)}
              </Text>

              <View style={styles.exerciseDetailSection}>
                <Text style={styles.exerciseDetailSectionTitle}>
                  Muscle Groups
                </Text>
                <View style={styles.tagContainer}>
                  {exerciseResult.exercise.muscleGroups &&
                  Array.isArray(exerciseResult.exercise.muscleGroups) &&
                  exerciseResult.exercise.muscleGroups.length > 0 ? (
                    exerciseResult.exercise.muscleGroups.map(
                      (muscle: string, index: number) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>
                            {muscle || "Unknown"}
                          </Text>
                        </View>
                      )
                    )
                  ) : (
                    <Text style={styles.exerciseDetailText}>
                      No muscle groups specified
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.exerciseDetailSection}>
                <Text style={styles.exerciseDetailSectionTitle}>Equipment</Text>
                <Text style={styles.exerciseDetailText}>
                  {formatEquipment(exerciseResult.exercise.equipment)}
                </Text>
              </View>

              <View style={styles.exerciseDetailSection}>
                <Text style={styles.exerciseDetailSectionTitle}>
                  Instructions
                </Text>
                <Text style={styles.exerciseDetailText}>
                  {formatInstructions(exerciseResult.exercise.instructions)}
                </Text>
              </View>

              {/* User Stats */}
              {exerciseResult.userStats && (
                <View style={styles.userStatsSection}>
                  <Text style={styles.userStatsTitle}>Your Performance</Text>

                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {`${exerciseResult.userStats.totalAssignments || 0}`}
                      </Text>
                      <Text style={styles.statLabel}>Times Assigned</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {`${exerciseResult.userStats.totalCompletions || 0}`}
                      </Text>
                      <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {`${exerciseResult.userStats.completionRate || 0}%`}
                      </Text>
                      <Text style={styles.statLabel}>Success Rate</Text>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {`${exerciseResult.userStats.averageSets || 0}`}
                      </Text>
                      <Text style={styles.statLabel}>Avg Sets</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {`${exerciseResult.userStats.averageReps || 0}`}
                      </Text>
                      <Text style={styles.statLabel}>Avg Reps</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {exerciseResult.userStats.averageWeight
                          ? `${exerciseResult.userStats.averageWeight} lbs`
                          : "N/A"}
                      </Text>
                      <Text style={styles.statLabel}>Avg Weight</Text>
                    </View>
                  </View>

                  <View style={styles.personalRecordsSection}>
                    <Text style={styles.personalRecordsTitle}>
                      Personal Records
                    </Text>
                    <View style={styles.recordsGrid}>
                      <View style={styles.recordItem}>
                        <Text style={styles.recordValue}>
                          {`${
                            exerciseResult.userStats.personalRecord.maxSets || 0
                          }`}
                        </Text>
                        <Text style={styles.recordLabel}>Max Sets</Text>
                      </View>
                      <View style={styles.recordItem}>
                        <Text style={styles.recordValue}>
                          {`${
                            exerciseResult.userStats.personalRecord.maxReps || 0
                          }`}
                        </Text>
                        <Text style={styles.recordLabel}>Max Reps</Text>
                      </View>
                      <View style={styles.recordItem}>
                        <Text style={styles.recordValue}>
                          {exerciseResult.userStats.personalRecord.maxWeight
                            ? `${exerciseResult.userStats.personalRecord.maxWeight} lbs`
                            : "N/A"}
                        </Text>
                        <Text style={styles.recordLabel}>Max Weight</Text>
                      </View>
                    </View>
                  </View>

                  {exerciseResult.userStats.lastPerformed && (
                    <View style={styles.lastPerformedSection}>
                      <Text style={styles.lastPerformedLabel}>
                        Last Performed
                      </Text>
                      <Text style={styles.lastPerformedDate}>
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

        {/* General Exercise Search Results - SAFE VERSION */}
        {generalResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>
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
                  <Text style={styles.exerciseName}>
                    {safeString(exercise?.name || "Unknown Exercise")}
                  </Text>
                  <Text style={styles.exerciseDetails}>
                    {`${
                      safeArrayJoin(exercise?.muscleGroups) || "Unknown"
                    } • ${safeString(exercise?.difficulty || "Unknown")}`}
                  </Text>
                  {exercise?.description && (
                    <Text style={styles.exerciseDescription}>
                      {safeString(exercise.description)}
                    </Text>
                  )}
                  <View style={styles.exerciseTags}>
                    <Text style={styles.equipmentText}>
                      {`Equipment: ${
                        safeArrayJoin(exercise?.equipment) || "None"
                      }`}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
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
              <Ionicons name="search" size={40} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No results found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try searching for a date (YYYY-MM-DD) or exercise name
              </Text>
            </View>
          )}

        {/* Search Instructions */}
        {!searchQuery.trim() && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to Search</Text>
            <View style={styles.instructionItem}>
              <Ionicons name="calendar" size={20} color="#4f46e5" />
              <Text style={styles.instructionText}>
                Search by date (e.g., 2024-01-15) to see your workout for that
                day
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="fitness" size={20} color="#4f46e5" />
              <Text style={styles.instructionText}>
                Search by exercise name or muscle group to find exercises
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
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    paddingVertical: 4,
  },
  searchButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  searchTypeContainer: {
    padding: 15,
    backgroundColor: "#f0f9ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchTypeText: {
    fontSize: 14,
    color: "#0369a1",
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6b7280",
  },
  resultsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  workoutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completionBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  workoutDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  completionRateContainer: {
    marginBottom: 16,
  },
  completionRateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4f46e5",
    borderRadius: 4,
  },
  completionRateText: {
    fontSize: 12,
    color: "#6b7280",
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  exerciseItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exerciseItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  exerciseDetails: {
    fontSize: 14,
    color: "#6b7280",
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
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseEquipment: {
    fontSize: 12,
    color: "#4b5563",
  },
  exerciseProgressContainer: {
    marginTop: 8,
  },
  exerciseProgressLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  exerciseProgressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 4,
  },
  exerciseProgressFill: {
    height: "100%",
    backgroundColor: "#4f46e5",
    borderRadius: 4,
  },
  exerciseChevron: {
    marginLeft: 8,
  },
  exerciseDetailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseDetailName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  exerciseDetailDescription: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 16,
  },
  exerciseDetailSection: {
    marginBottom: 16,
  },
  exerciseDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  exerciseDetailText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: "#3730a3",
    fontWeight: "500",
  },
  userStatsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  userStatsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4f46e5",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  personalRecordsSection: {
    marginTop: 8,
  },
  personalRecordsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  recordsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recordItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  recordValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d97706",
  },
  recordLabel: {
    fontSize: 12,
    color: "#92400e",
    marginTop: 4,
  },
  lastPerformedSection: {
    marginTop: 16,
    alignItems: "center",
  },
  lastPerformedLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  lastPerformedDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: "#ffffff",
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
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 8,
  },
  exerciseTags: {
    marginTop: 8,
  },
  equipmentText: {
    fontSize: 12,
    color: "#4b5563",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 40,
    margin: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  instructionsContainer: {
    padding: 15,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionText: {
    fontSize: 14,
    color: "#4b5563",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
