import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@contexts/AuthContext";
import ExerciseLink from "@components/ExerciseLink";
import ExerciseLinkModal from "@components/ExerciseLinkModal";
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
import { updateExerciseLink } from "@lib/exercises";
import {
  formatEquipment,
  formatMuscleGroups,
  formatDifficulty,
  formatDate as utilFormatDate,
} from "../../utils";
import { colors } from "../../lib/theme";

type SearchType = "date" | "exercise" | "general";

export default function SearchScreen() {
  const { user } = useAuth();
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  // Exercise Link Modal state
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [selectedExerciseForLink, setSelectedExerciseForLink] = useState<{
    id: number;
    name: string;
    link?: string;
  } | null>(null);

  // Handle date selection from DateTimePicker
  const handleDateChange = (event: any, date?: Date) => {
    // Hide picker after date selection on both platforms
    setShowDatePicker(false);

    if (date) {
      setSelectedDate(date);
      // Format date in local timezone to avoid timezone conversion issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      setDateQuery(formattedDate);
      setExerciseQuery(""); // Clear exercise query

      // Automatically perform date search
      if (user) {
        performDateSearchWithDate(formattedDate);
      }
    }
  };

  // Handle date picker cancellation
  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
  };

  // Perform date search with formatted date
  const performDateSearchWithDate = async (dateString: string) => {
    if (!user) return;

    // Clear current data before loading
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);

    setIsLoading(true);

    try {
      const result = await searchByDateAPI(user.id, dateString);
      if (result.success) {
        setDateResult(result.workout);
        setSearchType("date");
      }
    } catch (error) {
      console.error("Date search error:", error);
      Alert.alert("Error", "Failed to search by date. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exercise search
  const performExerciseSearch = async () => {
    if (!exerciseQuery.trim() || !user) return;

    // Clear current data before loading
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);

    setIsLoading(true);
    setDateQuery(""); // Clear date query

    try {
      const result = await searchExercisesAPI(exerciseQuery);
      if (result.success) {
        setGeneralResults(result.exercises);
        setSearchType("general");
      }
    } catch (error) {
      console.error("Exercise search error:", error);
      Alert.alert("Error", "Failed to search exercises. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle exercise selection for detailed view
  const handleExerciseSelect = async (exercise: Exercise) => {
    if (!user) return;

    // Clear current data before loading
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);

    setIsLoading(true);
    try {
      const result = await searchExerciseAPI(user.id, exercise.id);
      if (result.success) {
        setExerciseResult({
          exercise: result.exercise,
          userStats: result.userStats,
        });
        setSearchType("exercise");
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

  // Clear all search results
  const clearSearch = () => {
    setExerciseQuery("");
    setDateQuery("");
    setSelectedDate(null);
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);
    setSelectedExercise(null);
    setSearchType("general");
  };

  // Handle date search submission
  const handleDateSubmit = () => {
    if (dateQuery.trim()) {
      performDateSearchWithDate(dateQuery);
    }
  };

  // Handle exercise link modal
  const handleOpenLinkModal = (exercise: {
    id: number;
    name: string;
    link?: string;
  }) => {
    setSelectedExerciseForLink(exercise);
    setLinkModalVisible(true);
  };

  const handleCloseLinkModal = () => {
    setLinkModalVisible(false);
    setSelectedExerciseForLink(null);
  };

  const handleSaveExerciseLink = async (
    exerciseId: number,
    link: string | null
  ) => {
    try {
      const result = await updateExerciseLink(exerciseId, link);

      if (result.success) {
        // Refresh the exercise result if it's currently displayed
        if (exerciseResult && exerciseResult.exercise.id === exerciseId) {
          const updatedExercise = {
            ...exerciseResult.exercise,
            link: link || undefined,
          };
          setExerciseResult({
            ...exerciseResult,
            exercise: updatedExercise,
          });
        }

        // Update general results if they contain this exercise
        setGeneralResults((prevResults) =>
          prevResults.map((ex) =>
            ex.id === exerciseId ? { ...ex, link: link || undefined } : ex
          )
        );

        Alert.alert("Success", "Exercise link updated successfully");
      } else {
        Alert.alert("Error", result.error || "Failed to update exercise link");
      }
    } catch (error) {
      console.error("Error updating exercise link:", error);
      Alert.alert("Error", "Failed to update exercise link");
    }
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

  // Calculate completion rate for workout based on completed exercises
  const calculateWorkoutCompletionRate = (exercises: any[]) => {
    if (!exercises || exercises.length === 0) return 0;
    const completedCount = exercises.filter(
      (ex) => ex.completed === true
    ).length;
    return Math.round((completedCount / exercises.length) * 100);
  };

  // Get individual muscle groups for display
  const getIndividualMuscleGroups = (muscleGroups: string[] | undefined) => {
    if (!muscleGroups || !Array.isArray(muscleGroups)) return [];

    // Split comma-separated muscle groups and clean them
    const individual = muscleGroups
      .flatMap((group) =>
        group.split(",").map((m) =>
          m
            .trim()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
        )
      )
      .filter((m) => m.length > 0);

    // Remove duplicates
    return [...new Set(individual)];
  };

  // Format equipment with proper spacing and capitalization
  const formatEquipmentProperly = (equipment: any) => {
    if (!equipment) return "None";
    if (Array.isArray(equipment)) {
      return equipment
        .map((item) =>
          String(item)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
        )
        .join(", ");
    }
    return String(equipment)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format difficulty properly
  const formatDifficultyProperly = (difficulty: any) => {
    if (!difficulty) return "";
    return String(difficulty)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text className="mt-4 text-text-muted">Loading exercises...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Search Inputs */}
        <View className="p-4 pt-6">
          <View className="flex-row space-x-3">
            {/* Exercise Search */}
            <View className="flex-1">
              <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm h-12">
                <Ionicons
                  name="search"
                  size={18}
                  color="#9CA3AF"
                  className="mr-3"
                />
                <TextInput
                  className="flex-1 text-text-primary text-sm"
                  placeholder="Search exercises"
                  value={exerciseQuery}
                  onChangeText={setExerciseQuery}
                  onSubmitEditing={performExerciseSearch}
                  placeholderTextColor="#9CA3AF"
                />
                {exerciseQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setExerciseQuery("")}
                    className="p-1"
                  >
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Date Picker Icon */}
            <TouchableOpacity
              className="bg-white rounded-xl shadow-sm h-12 w-12 items-center justify-center"
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={selectedDate ? "#BBDE51" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker - iOS and Android handled separately */}
        {showDatePicker && (
          <>
            {Platform.OS === "ios" ? (
              <Modal
                animationType="slide"
                transparent={true}
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(0,0,0,0.5)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "white",
                      borderTopLeftRadius: 20,
                      borderTopRightRadius: 20,
                      padding: 20,
                      minHeight: 320,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={{ color: "#9CA3AF", fontSize: 16 }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Select Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowDatePicker(false);
                          // Use the currently selected date to perform search
                          const currentDate = selectedDate || new Date();
                          const year = currentDate.getFullYear();
                          const month = String(
                            currentDate.getMonth() + 1
                          ).padStart(2, "0");
                          const day = String(currentDate.getDate()).padStart(
                            2,
                            "0"
                          );
                          const formattedDate = `${year}-${month}-${day}`;

                          setDateQuery(formattedDate);
                          setExerciseQuery("");

                          if (user) {
                            performDateSearchWithDate(formattedDate);
                          }
                        }}
                      >
                        <Text
                          style={{
                            color: "#BBDE51",
                            fontSize: 16,
                            fontWeight: "500",
                          }}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        height: 200,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <DateTimePicker
                        value={selectedDate || new Date()}
                        onChange={(event, date) => {
                          // Always update selectedDate when user changes the picker
                          if (date) {
                            setSelectedDate(date);
                          }
                        }}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date()}
                        minimumDate={
                          new Date(
                            new Date().setFullYear(new Date().getFullYear() - 1)
                          )
                        }
                        style={{
                          height: 200,
                          width: "100%",
                        }}
                        textColor="#374151"
                        locale="en"
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            ) : (
              // Android - native modal
              <DateTimePicker
                value={selectedDate || new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);

                  if (event.type === "set" && date) {
                    setSelectedDate(date);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const formattedDate = `${year}-${month}-${day}`;

                    setDateQuery(formattedDate);
                    setExerciseQuery("");

                    if (user) {
                      performDateSearchWithDate(formattedDate);
                    }
                  }
                }}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={
                  new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                }
              />
            )}
          </>
        )}

        {/* Date Search Results Header */}
        {selectedDate && dateResult && (
          <View className="px-4 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-text-muted">
                Showing results for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(null);
                  setDateQuery("");
                  setDateResult(null);
                }}
                className="p-1"
              >
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exercise Detail View */}
        {exerciseResult && (
          <View className="px-4 pb-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              {/* Exercise Link at the top inside card */}
              <View className="mb-4 -mx-5 -mt-5">
                <ExerciseLink
                  link={exerciseResult.exercise.link}
                  exerciseName={exerciseResult.exercise.name}
                  variant="hero"
                />
              </View>

              {/* Exercise Title with Edit Link */}
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-text-primary mr-2">
                    {formatName(exerciseResult.exercise.name)}
                  </Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center bg-primary/10 px-3 py-2 rounded-lg ml-2"
                  onPress={() =>
                    handleOpenLinkModal({
                      id: exerciseResult.exercise.id,
                      name: exerciseResult.exercise.name,
                      link: exerciseResult.exercise.link,
                    })
                  }
                >
                  <Ionicons
                    name="link"
                    size={14}
                    color="#BBDE51"
                    className="mr-1"
                  />
                  <Text className="text-xs font-medium text-primary">
                    {exerciseResult.exercise.link ? "Update Link" : "Add Link"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text className="text-sm text-text-muted mb-6">
                {formatDescription(exerciseResult.exercise.description)}
              </Text>

              {/* Muscle Groups */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-text-primary mb-3">
                  Muscle Groups
                </Text>
                <View className="flex-row flex-wrap">
                  {getIndividualMuscleGroups(
                    exerciseResult.exercise.muscleGroups
                  ).length > 0 ? (
                    getIndividualMuscleGroups(
                      exerciseResult.exercise.muscleGroups
                    ).map((muscle: string, index: number) => (
                      <View
                        key={index}
                        className="bg-primary rounded-full px-3 py-1 mr-2 mb-2"
                      >
                        <Text className="text-xs font-semibold text-text-primary">
                          {muscle}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-sm text-text-muted italic">
                      No muscle groups specified
                    </Text>
                  )}
                </View>
              </View>

              {/* Equipment */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-text-primary mb-2">
                  Equipment
                </Text>
                <Text className="text-sm text-text-muted">
                  {formatEquipmentProperly(exerciseResult.exercise.equipment)}
                </Text>
              </View>

              {/* Instructions */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-text-primary mb-2">
                  Instructions
                </Text>
                <Text className="text-sm text-text-muted">
                  {formatInstructions(exerciseResult.exercise.instructions)}
                </Text>
              </View>

              {/* User Performance Stats */}
              {exerciseResult.userStats && (
                <View className="mt-6 pt-6 border-t border-neutral-light-2">
                  <Text className="text-lg font-semibold text-text-primary mb-4">
                    Your Performance
                  </Text>

                  <View className="flex-row justify-around mb-4 flex-wrap">
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-3 shadow-sm">
                      <Text className="text-s font-bold text-text-primary mb-1">
                        {`${exerciseResult.userStats.totalAssignments || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                        Assigned
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-3 shadow-sm">
                      <Text className="text-s font-bold text-text-primary mb-1">
                        {`${exerciseResult.userStats.totalCompletions || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                        Done
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-3 shadow-sm">
                      <Text className="text-s font-bold text-text-primary mb-1">
                        {`${exerciseResult.userStats.completionRate || 0}%`}
                      </Text>
                      <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                        Success
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-around mb-4 flex-wrap">
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-3 shadow-sm">
                      <Text className="text-s font-bold text-text-primary mb-1">
                        {`${exerciseResult.userStats.averageSets || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                        Avg Sets
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-3 shadow-sm">
                      <Text className="text-s font-bold text-text-primary mb-1">
                        {`${exerciseResult.userStats.averageReps || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                        Avg Reps
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-pink-100 mb-3 shadow-sm">
                      <Text className="text-s font-bold text-text-primary mb-1">
                        {exerciseResult.userStats.averageWeight
                          ? `${exerciseResult.userStats.averageWeight}`
                          : "N/A"}
                      </Text>
                      <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                        Avg Weight
                      </Text>
                    </View>
                  </View>

                  {/* Personal Records - styled like performance section */}
                  <View className="mt-5">
                    <Text className="text-lg font-semibold text-text-primary mb-4">
                      Personal Records
                    </Text>
                    <View className="flex-row justify-around">
                      <View className="items-center justify-center w-20 h-20 rounded-full bg-teal-100 shadow-sm">
                        <Text className="text-s font-bold text-text-primary mb-1">
                          {`${
                            exerciseResult.userStats.personalRecord.maxSets || 0
                          }`}
                        </Text>
                        <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                          Max Sets
                        </Text>
                      </View>
                      <View className="items-center justify-center w-20 h-20 rounded-full bg-indigo-100 shadow-sm">
                        <Text className="text-s font-bold text-text-primary mb-1">
                          {`${
                            exerciseResult.userStats.personalRecord.maxReps || 0
                          }`}
                        </Text>
                        <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                          Max Reps
                        </Text>
                      </View>
                      <View className="items-center justify-center w-20 h-20 rounded-full bg-orange-100 shadow-sm">
                        <Text className="text-s font-bold text-text-primary mb-1">
                          {`${
                            exerciseResult.userStats.personalRecord.maxWeight ||
                            0
                          }`}
                        </Text>
                        <Text className="text-[10px] font-medium text-text-muted text-center max-w-12 leading-[10px]">
                          Max Weight
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Last Performed */}
                  {exerciseResult.userStats.lastPerformed && (
                    <View className="mt-5 items-center">
                      <Text className="text-sm text-text-muted text-center">
                        Last performed:{" "}
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
          <View className="px-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-text-primary flex-1">
                  {safeString(dateResult.name)}
                </Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    dateResult.planDay?.exercises
                      ? calculateWorkoutCompletionRate(
                          dateResult.planDay.exercises
                        ) === 100
                        ? "bg-green-500"
                        : "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
                >
                  <Text className="text-xs font-semibold text-white">
                    {dateResult.planDay?.exercises
                      ? calculateWorkoutCompletionRate(
                          dateResult.planDay.exercises
                        ) === 100
                        ? "Completed"
                        : "In Progress"
                      : "No Exercises"}
                  </Text>
                </View>
              </View>

              <Text className="text-sm text-text-muted mb-4">
                {safeString(dateResult.description)}
              </Text>

              <View className="mb-5">
                <Text className="text-sm font-medium text-text-primary mb-2">
                  Overall Progress
                </Text>
                <View className="h-2 bg-neutral-light-2 rounded-full mb-2 overflow-hidden">
                  <View
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${
                        dateResult.planDay?.exercises
                          ? calculateWorkoutCompletionRate(
                              dateResult.planDay.exercises
                            )
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="text-sm text-text-muted">
                  {dateResult.planDay?.exercises
                    ? calculateWorkoutCompletionRate(
                        dateResult.planDay.exercises
                      )
                    : 0}
                  % Complete
                </Text>
              </View>

              {dateResult.planDay?.exercises &&
                Array.isArray(dateResult.planDay.exercises) && (
                  <View>
                    <Text className="text-lg font-semibold text-text-primary mb-4">
                      Exercises (
                      {safeString(dateResult.planDay.exercises.length)})
                    </Text>
                    {dateResult.planDay.exercises.map(
                      (exercise: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          className=" rounded-xl p-4 mb-3"
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
                          <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-base font-semibold text-text-primary flex-1">
                              {safeString(
                                exercise?.exercise?.name || "Unknown"
                              )}
                            </Text>
                            <View className="flex-row items-center">
                              <View
                                className={`px-2 py-1 rounded-lg ${
                                  exercise?.completed === true
                                    ? "bg-green-500"
                                    : exercise?.completed === false
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                                }`}
                              >
                                <Text className="text-xs font-semibold text-white">
                                  {exercise?.completed === true
                                    ? "Done"
                                    : exercise?.completed === false
                                    ? "Not Done"
                                    : "Pending"}
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color="#9CA3AF"
                                className="ml-2"
                              />
                            </View>
                          </View>

                          {/* Individual muscle group tags */}
                          <View className="flex-row flex-wrap mb-2">
                            {getIndividualMuscleGroups(
                              exercise?.exercise?.muscleGroups
                            )
                              .slice(0, 3)
                              .map((muscle: string, muscleIndex: number) => (
                                <View
                                  key={muscleIndex}
                                  className="bg-primary rounded-full px-2 py-1 mr-1 mb-1"
                                >
                                  <Text className="text-xs font-medium text-text-primary">
                                    {muscle}
                                  </Text>
                                </View>
                              ))}
                            {getIndividualMuscleGroups(
                              exercise?.exercise?.muscleGroups
                            ).length > 3 && (
                              <View className="bg-neutral-300 rounded-full px-2 py-1 mr-1 mb-1">
                                <Text className="text-xs font-medium text-text-muted">
                                  +
                                  {getIndividualMuscleGroups(
                                    exercise?.exercise?.muscleGroups
                                  ).length - 3}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text className="text-sm text-text-muted mb-2">
                            {formatDifficultyProperly(
                              exercise?.exercise?.difficulty
                            )}
                          </Text>

                          {/* Equipment Pills */}
                          {exercise?.exercise?.equipment &&
                            Array.isArray(exercise.exercise.equipment) &&
                            exercise.exercise.equipment.length > 0 && (
                              <View className="mt-2">
                                <View className="flex-row flex-wrap">
                                  {exercise.exercise.equipment.map(
                                    (item: string, equipmentIndex: number) => (
                                      <View
                                        key={equipmentIndex}
                                        style={{
                                          backgroundColor: "#f3f4f6",
                                          borderRadius: 12,
                                          paddingHorizontal: 8,
                                          paddingVertical: 4,
                                          marginRight: 6,
                                          marginBottom: 4,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 10,
                                            fontWeight: "500",
                                            color: "#374151",
                                          }}
                                        >
                                          {formatEquipmentProperly(item)}
                                        </Text>
                                      </View>
                                    )
                                  )}
                                </View>
                              </View>
                            )}
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
          <View className="px-4">
            <Text className="text-lg font-semibold text-text-primary mb-4 p-4">
              Exercise Results ({safeString(generalResults.length)})
            </Text>
            {generalResults.map((exercise: any, index: number) => (
              <TouchableOpacity
                key={`general-exercise-${exercise?.id || index}`}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center"
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
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text-primary">
                    {safeString(exercise?.name || "Unknown Exercise")}
                  </Text>

                  {/* Individual muscle group tags */}
                  <View className="flex-row flex-wrap my-2">
                    {getIndividualMuscleGroups(exercise?.muscleGroups)
                      .slice(0, 3)
                      .map((muscle: string, muscleIndex: number) => (
                        <View
                          key={muscleIndex}
                          className="bg-primary rounded-full px-2 py-1 mr-1 mb-1"
                        >
                          <Text className="text-xs font-medium text-text-primary">
                            {muscle}
                          </Text>
                        </View>
                      ))}
                    {getIndividualMuscleGroups(exercise?.muscleGroups).length >
                      3 && (
                      <View className="bg-neutral-300 rounded-full px-2 py-1 mr-1 mb-1">
                        <Text className="text-xs font-medium text-text-muted">
                          +
                          {getIndividualMuscleGroups(exercise?.muscleGroups)
                            .length - 3}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-sm text-text-muted mb-2">
                    {formatDifficultyProperly(exercise?.difficulty)}
                  </Text>

                  {/* Equipment Pills */}
                  {exercise?.equipment &&
                    Array.isArray(exercise.equipment) &&
                    exercise.equipment.length > 0 && (
                      <View className="mb-2">
                        <View className="flex-row flex-wrap">
                          {exercise.equipment.map(
                            (item: string, equipmentIndex: number) => (
                              <View
                                key={equipmentIndex}
                                style={{
                                  backgroundColor: "#f3f4f6",
                                  borderRadius: 12,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  marginRight: 6,
                                  marginBottom: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: "500",
                                    color: "#374151",
                                  }}
                                >
                                  {formatEquipmentProperly(item)}
                                </Text>
                              </View>
                            )
                          )}
                        </View>
                      </View>
                    )}
                  {exercise?.description && (
                    <Text className="text-sm text-text-muted mb-2">
                      {safeString(exercise.description)}
                    </Text>
                  )}
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
          (exerciseQuery.trim() || dateQuery.trim()) && (
            <View className="items-center justify-center bg-white p-10 m-4 rounded-2xl shadow-sm">
              <Ionicons name="search-outline" size={40} color="#D1D5DB" />
              <Text className="text-lg font-semibold text-text-muted mt-4">
                No results found
              </Text>
              <Text className="text-sm text-text-muted text-center mt-2">
                Try searching for a date (YYYY-MM-DD) or exercise name
              </Text>
            </View>
          )}

        {/* How to Search Instructions */}
        {!exerciseQuery.trim() &&
          !dateQuery.trim() &&
          !dateResult &&
          !exerciseResult &&
          generalResults.length === 0 && (
            <View className="px-4">
              <Text className="text-lg font-semibold text-text-primary mb-5 ml-2">
                How to Search
              </Text>

              <View className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
                <View className="bg-yellow-100 p-2 rounded-lg mr-3">
                  <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                </View>
                <Text className="flex-1 text-sm text-text-muted">
                  Search by date to see the workout for that day
                </Text>
              </View>

              <View className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
                <View className="bg-yellow-100 p-2 rounded-lg mr-3">
                  <Ionicons name="barbell-outline" size={20} color="#F59E0B" />
                </View>
                <Text className="flex-1 text-sm text-text-muted">
                  Search by exercise name to see exercises and performance stats
                </Text>
              </View>
            </View>
          )}
      </ScrollView>

      {/* Exercise Link Modal */}
      <ExerciseLinkModal
        visible={linkModalVisible}
        exercise={selectedExerciseForLink}
        onClose={handleCloseLinkModal}
        onSave={handleSaveExerciseLink}
      />
    </View>
  );
}
