import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useAuth } from "@/contexts/auth-context";
import ExerciseLink from "@/components/exercise-link";
import ExerciseLinkModal from "@/components/exercise-link-modal";
import {
  Exercise,
  DateSearchWorkout,
  ExerciseDetails,
  ExerciseUserStats,
} from "@lib/search";
import {
  DateSearchWorkoutBlock,
  DateSearchExercise,
} from "@/types/api/search.types";
import { useAppDataContext } from "@/contexts/app-data-context";
import { updateExerciseLink } from "@lib/exercises";
import { SkeletonLoader } from "@/components/skeletons/skeleton-loader";

import { colors } from "@/lib/theme";
import { CustomDialog } from "@/components/ui";
import type { DialogButton } from "@/components/ui";

type SearchType = "date" | "exercise" | "general";

type PlanDayForCompletion = DateSearchWorkout["planDay"];

export default function SearchView() {
  const { user } = useAuth();
  const {
    refresh: { searchByDate, searchExercise, searchExercises },
    loading,
  } = useAppDataContext();

  // Scroll to top ref
  const scrollViewRef = useRef<ScrollView>(null);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>("general");
  // Use centralized loading state
  const isLoading = loading.searchLoading;

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

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Scroll to top when tab is focused
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Listen for tab re-click events
  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const { tabEvents } = require("../../lib/tab-events");
    tabEvents.on("scrollToTop:search", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:search", handleScrollToTop);
    };
  }, []);

  // Handle date selection from DateTimePicker
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
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

    // Loading state is handled by useAppData

    try {
      const result = await searchByDate(dateString);
      if (result.success) {
        setDateResult(result.workout);
        setSearchType("date");
      }
    } catch (error) {
      console.error("Date search error:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to search by date. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      // Loading state is handled by useAppData
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim() && user) {
            performExerciseSearchInternal(query);
          }
        }, 300); // 300ms delay
      };
    })(),
    [user]
  );

  // Internal search function
  const performExerciseSearchInternal = async (query: string) => {
    // Clear current data before loading
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);

    // Loading state is handled by useAppData
    setDateQuery(""); // Clear date query

    try {
      const result = await searchExercises(query);
      if (result.success) {
        setGeneralResults(result.exercises);
        setSearchType("general");
      }
    } catch (error) {
      console.error("Exercise search error:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to search exercises. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      // Loading state is handled by useAppData
    }
  };

  // Handle exercise search
  const performExerciseSearch = async () => {
    if (!exerciseQuery.trim() || !user) return;
    await performExerciseSearchInternal(exerciseQuery);
  };

  // Auto-search when query changes
  useEffect(() => {
    if (exerciseQuery.trim().length > 2) {
      debouncedSearch(exerciseQuery);
    }
  }, [exerciseQuery, debouncedSearch]);

  // Handle exercise selection for detailed view
  const handleExerciseSelect = async (exercise: Exercise) => {
    if (!user) return;

    // Clear current data before loading
    setDateResult(null);
    setExerciseResult(null);
    setGeneralResults([]);

    // Loading state is handled by useAppData
    try {
      const result = await searchExercise(exercise.id);
      if (result.success) {
        setExerciseResult({
          exercise: result.exercise,
          userStats: result.userStats,
        });
        setSearchType("exercise");
      }
    } catch (error) {
      console.error("Exercise search error:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to load exercise details. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      // Loading state is handled by useAppData
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

        setDialogConfig({
          title: "Success",
          description: "Exercise link updated successfully",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "checkmark-circle",
        });
        setDialogVisible(true);
      } else {
        setDialogConfig({
          title: "Error",
          description: result.error || "Failed to update exercise link",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      console.error("Error updating exercise link:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to update exercise link",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
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

  // Get difficulty color classes based on level
  const getDifficultyClasses = (difficulty: string) => {
    const lowerDifficulty = (difficulty || "").toLowerCase();
    switch (lowerDifficulty) {
      case "low":
        return {
          bg: "bg-green-500",
          text: "text-white",
        };
      case "moderate":
        return {
          bg: "bg-yellow-500",
          text: "text-white",
        };
      case "high":
        return {
          bg: "bg-red-500",
          text: "text-white",
        };
      default:
        return {
          bg: "bg-gray-500",
          text: "text-white",
        };
    }
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
  const calculateWorkoutCompletionRate = (planDay: PlanDayForCompletion) => {
    if (!planDay) return 0;

    // Handle block-based structure
    if (planDay.blocks && planDay.blocks.length > 0) {
      const allExercises = planDay.blocks.flatMap(
        (block) => block.exercises || []
      );
      const completedCount = allExercises.filter(
        (exercise) => exercise.completed
      ).length;
      return allExercises.length > 0
        ? Math.round((completedCount / allExercises.length) * 100)
        : 0;
    }

    // Handle legacy structure with direct exercises
    if (planDay.exercises && planDay.exercises.length > 0) {
      const completedCount = planDay.exercises.filter(
        (exercise) => exercise.completed
      ).length;
      return planDay.exercises.length > 0
        ? Math.round((completedCount / planDay.exercises.length) * 100)
        : 0;
    }

    return 0;
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

  // Helper component for results skeleton
  const ResultsSkeleton = () => (
    <View className="px-4">
      <SkeletonLoader height={24} width={160} style={{ marginBottom: 16 }} />
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="bg-white rounded-xl p-4 mb-3 shadow-rn-sm">
          <View className="flex-row items-center">
            <SkeletonLoader
              height={48}
              width={48}
              variant="circular"
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <SkeletonLoader
                height={20}
                width={128}
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader height={16} width={96} />
            </View>
            <SkeletonLoader height={24} width={24} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView ref={scrollViewRef} className="flex-1">
        {/* Search Inputs */}
        <View className="p-4 pt-6">
          <View className="flex-row gap-3">
            {/* Exercise Search */}
            <View className="flex-1">
              <View className="flex-row items-center bg-white rounded-xl px-4 py-1 shadow-rn-sm h-12">
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.neutral.medium[3]}
                  className="mr-3"
                />
                <TextInput
                  className="flex-1 text-text-primary text-sm"
                  placeholder="Search exercises"
                  value={exerciseQuery}
                  onChangeText={setExerciseQuery}
                  onSubmitEditing={performExerciseSearch}
                  placeholderTextColor={colors.neutral.medium[3]}
                />
                {exerciseQuery.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setExerciseQuery("")}
                    className="p-1"
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.neutral.medium[3]}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Date Picker Icon */}
            <TouchableOpacity
              className="bg-white rounded-xl shadow-rn-sm h-12 w-12 items-center justify-center"
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={
                  selectedDate ? colors.brand.primary : colors.neutral.medium[3]
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker - iOS and Android handled separately */}
        {showDatePicker ? (
          <>
            {Platform.OS === "ios" ? (
              <Modal
                animationType="slide"
                transparent={true}
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View className="flex-1 justify-end bg-black/50">
                  <View className="bg-white rounded-t-xl p-5 min-h-80">
                    <View className="flex-row justify-between items-center mb-5">
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text className="text-neutral-medium-3 text-base">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <Text className="text-lg font-semibold text-text-primary">
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
                        <Text className="text-primary text-base font-medium">
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="h-50 justify-center items-center">
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
                        className="h-50 w-full"
                        textColor={colors.text.primary}
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
        ) : null}

        {/* Loading State - Only for results area */}
        {isLoading && <ResultsSkeleton />}

        {/* Date Search Results Header */}
        {!isLoading && selectedDate && dateResult ? (
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
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Exercise Detail View */}
        {!isLoading && exerciseResult ? (
          <View className="px-4 pb-4">
            <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
              {/* Exercise Link at the top inside card */}
              <View className="mb-4 -mx-5 -mt-5">
                <ExerciseLink
                  link={exerciseResult.exercise.link}
                  exerciseName={exerciseResult.exercise.name}
                  exerciseId={exerciseResult.exercise.id}
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
                  className="flex-row items-center bg-brand-light-2 px-3 py-2 rounded-lg ml-2"
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
                    color={colors.neutral.dark[1]}
                    className="mr-1"
                  />
                  <Text className="text-xs font-medium text-neutral-dark-1">
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
                        className="rounded-full px-3 py-1 mr-2 mb-2 bg-primary"
                      >
                        <Text className="text-xs font-semibold text-neutral-light-1">
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

              {/* Difficulty */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-text-primary mb-2">
                  Difficulty
                </Text>
                <View
                  className={`px-3 py-1 rounded-full self-start ${
                    getDifficultyClasses(exerciseResult.exercise.difficulty).bg
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      getDifficultyClasses(exerciseResult.exercise.difficulty)
                        .text
                    }`}
                  >
                    {formatDifficultyProperly(
                      exerciseResult.exercise.difficulty
                    )}
                  </Text>
                </View>
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
              {exerciseResult.userStats ? (
                <View className="mt-6 pt-6 border-t border-neutral-light-2">
                  <Text className="text-lg font-semibold text-text-primary mb-4">
                    Your Performance
                  </Text>

                  <View className="flex-row justify-around mb-4 flex-wrap">
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary mb-3 shadow-rn-sm">
                      <Text className="text-s font-bold text-neutral-light-1 mb-1">
                        {`${exerciseResult.userStats.totalAssignments || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                        Assigned
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary mb-3 shadow-rn-sm">
                      <Text className="text-s font-bold text-neutral-light-1 mb-1">
                        {`${exerciseResult.userStats.totalCompletions || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                        Done
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary mb-3 shadow-rn-sm">
                      <Text className="text-s font-bold text-neutral-light-1 mb-1">
                        {`${exerciseResult.userStats.completionRate || 0}%`}
                      </Text>
                      <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                        Success
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-around mb-4 flex-wrap">
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary mb-3 shadow-rn-sm">
                      <Text className="text-s font-bold text-neutral-light-1 mb-1">
                        {`${exerciseResult.userStats.averageSets || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                        Avg Sets
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary mb-3 shadow-rn-sm">
                      <Text className="text-s font-bold text-neutral-light-1 mb-1">
                        {`${exerciseResult.userStats.averageReps || 0}`}
                      </Text>
                      <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                        Avg Reps
                      </Text>
                    </View>
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary mb-3 shadow-rn-sm">
                      <Text className="text-s font-bold text-neutral-light-1 mb-1">
                        {exerciseResult.userStats.averageWeight
                          ? `${exerciseResult.userStats.averageWeight}`
                          : "N/A"}
                      </Text>
                      <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
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
                      <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary shadow-rn-sm">
                        <Text className="text-s font-bold text-neutral-light-1 mb-1">
                          {`${
                            exerciseResult.userStats.personalRecord.maxSets || 0
                          }`}
                        </Text>
                        <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                          Max Sets
                        </Text>
                      </View>
                      <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary shadow-rn-sm">
                        <Text className="text-s font-bold text-neutral-light-1 mb-1">
                          {`${
                            exerciseResult.userStats.personalRecord.maxReps || 0
                          }`}
                        </Text>
                        <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                          Max Reps
                        </Text>
                      </View>
                      <View className="items-center justify-center w-20 h-20 rounded-full bg-brand-primary shadow-rn-sm">
                        <Text className="text-s font-bold text-neutral-light-1 mb-1">
                          {`${
                            exerciseResult.userStats.personalRecord.maxWeight ||
                            0
                          }`}
                        </Text>
                        <Text className="text-[10px] font-medium text-neutral-light-1 text-center max-w-12 leading-[10px]">
                          Max Weight
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Last Performed */}
                  {exerciseResult.userStats.lastPerformed ? (
                    <View className="mt-5 items-center">
                      <Text className="text-sm text-text-muted text-center">
                        Last performed:{" "}
                        {formatLastPerformedDate(
                          exerciseResult.userStats.lastPerformed
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Date Search Results */}
        {!isLoading && dateResult ? (
          <View className="px-4">
            <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-text-primary flex-1">
                  {safeString(dateResult.name)}
                </Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    dateResult.planDay
                      ? calculateWorkoutCompletionRate(dateResult.planDay) ===
                        100
                        ? "bg-brand-primary"
                        : "bg-yellow-600"
                      : "bg-gray-500"
                  }`}
                >
                  <Text className="text-xs font-semibold text-white">
                    {dateResult.planDay
                      ? calculateWorkoutCompletionRate(dateResult.planDay) ===
                        100
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
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${
                        dateResult.planDay
                          ? calculateWorkoutCompletionRate(dateResult.planDay)
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="text-sm text-text-muted">
                  {dateResult.planDay
                    ? calculateWorkoutCompletionRate(dateResult.planDay)
                    : 0}
                  % Complete
                </Text>
              </View>

              {dateResult.planDay ? (
                <View>
                  <Text className="text-lg font-semibold text-text-primary mb-4">
                    Exercises (
                    {(() => {
                      const planDay = dateResult.planDay;
                      if (planDay.blocks && planDay.blocks.length > 0) {
                        // New structure with blocks
                        return planDay.blocks.reduce(
                          (total: number, block: { exercises?: any[] }) =>
                            total + (block.exercises?.length || 0),
                          0
                        );
                      } else if (planDay.exercises) {
                        // Legacy structure with direct exercises
                        return planDay.exercises.length;
                      }
                      return 0;
                    })()}
                    )
                  </Text>

                  {/* Handle block structure */}
                  {dateResult.planDay.blocks
                    ? dateResult.planDay.blocks.map(
                        (block: DateSearchWorkoutBlock, blockIndex: number) => (
                          <View key={block.id || blockIndex} className="mb-4">
                            {/* Block Header */}
                            <View className="bg-neutral-light-1 rounded-lg p-3 mb-3">
                              <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                  <Text className="text-sm font-semibold text-text-primary">
                                    {block.blockName ||
                                      `Block ${blockIndex + 1}`}
                                  </Text>
                                  <Text className="text-xs text-text-muted">
                                    {block.exercises?.length || 0} exercises
                                    {block.rounds && block.rounds > 1
                                      ? ` • ${block.rounds} rounds`
                                      : ""}
                                    {block.timeCapMinutes
                                      ? ` • ${block.timeCapMinutes} min cap`
                                      : ""}
                                  </Text>
                                </View>
                              </View>
                              {block.instructions ? (
                                <Text className="text-xs text-text-muted mt-2">
                                  {block.instructions}
                                </Text>
                              ) : null}
                            </View>

                            {/* Exercises in this block */}
                            {block.exercises?.map(
                              (
                                exercise: DateSearchExercise,
                                exerciseIndex: number
                              ) => (
                                <TouchableOpacity
                                  key={exercise.id || exerciseIndex}
                                  className="bg-white rounded-xl p-4 mb-3 border border-neutral-light-2"
                                  onPress={() => {
                                    try {
                                      if (exercise?.exercise?.id) {
                                        handleExerciseSelect({
                                          id: Number(exercise.exercise.id),
                                          name: safeString(
                                            exercise.exercise.name ||
                                              "Unknown Exercise"
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
                                            ? exercise.exercise.equipment.join(
                                                ", "
                                              )
                                            : "",
                                          difficulty: safeString(
                                            exercise.exercise.difficulty ||
                                              "Unknown"
                                          ),
                                          instructions: safeString(
                                            exercise.exercise.instructions || ""
                                          ),
                                          createdAt: new Date(),
                                          updatedAt: new Date(),
                                        });
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error selecting exercise:",
                                        error
                                      );
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
                                            ? "bg-brand-primary"
                                            : exercise?.completed === false
                                              ? "bg-red-700"
                                              : "bg-yellow-700"
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
                                        color={colors.text.muted}
                                        className="ml-2"
                                      />
                                    </View>
                                  </View>

                                  {/* Exercise Parameters */}
                                  <View className="flex-row flex-wrap mb-2">
                                    {exercise.sets && exercise.reps ? (
                                      <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                        <Text className="text-xs font-medium text-text-primary">
                                          {exercise.sets} × {exercise.reps}
                                        </Text>
                                      </View>
                                    ) : null}
                                    {exercise.duration ? (
                                      <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                        <Text className="text-xs font-medium text-text-primary">
                                          {exercise.duration}s
                                        </Text>
                                      </View>
                                    ) : null}
                                    {exercise.weight ? (
                                      <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                        <Text className="text-xs font-medium text-text-primary">
                                          {exercise.weight} lbs
                                        </Text>
                                      </View>
                                    ) : null}
                                    {exercise.restTime &&
                                    exercise.restTime > 0 ? (
                                      <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                        <Text className="text-xs font-medium text-text-primary">
                                          {exercise.restTime}s rest
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>

                                  {/* Individual muscle group tags */}
                                  <View className="flex-row flex-wrap mb-2">
                                    {getIndividualMuscleGroups(
                                      exercise?.exercise?.muscleGroups
                                    )
                                      .slice(0, 3)
                                      .map(
                                        (
                                          muscle: string,
                                          muscleIndex: number
                                        ) => (
                                          <View
                                            key={muscleIndex}
                                            className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1"
                                          >
                                            <Text className="text-xs font-medium text-text-primary">
                                              {muscle}
                                            </Text>
                                          </View>
                                        )
                                      )}
                                    {getIndividualMuscleGroups(
                                      exercise?.exercise?.muscleGroups
                                    ).length > 3 ? (
                                      <View className="bg-neutral-300 rounded-full px-2 py-1 mr-1 mb-1">
                                        <Text className="text-xs font-medium text-text-muted">
                                          +
                                          {getIndividualMuscleGroups(
                                            exercise?.exercise?.muscleGroups
                                          ).length - 3}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </TouchableOpacity>
                              )
                            )}
                          </View>
                        )
                      )
                    : // Handle legacy structure with direct exercises
                      dateResult.planDay.exercises?.map(
                        (exercise: DateSearchExercise, index: number) => (
                          <TouchableOpacity
                            key={index}
                            className="bg-white rounded-xl p-4 mb-3 border border-neutral-light-2"
                            onPress={() => {
                              try {
                                if (exercise?.exercise?.id) {
                                  handleExerciseSelect({
                                    id: Number(exercise.exercise.id),
                                    name: safeString(
                                      exercise.exercise.name ||
                                        "Unknown Exercise"
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
                                      ? exercise.exercise.equipment.join(", ")
                                      : "",
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
                                console.error(
                                  "Error selecting exercise:",
                                  error
                                );
                              }
                            }}
                          >
                            {/* Exercise content (same as in block structure) */}
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
                                      ? "bg-brand-primary"
                                      : exercise?.completed === false
                                        ? "bg-red-700"
                                        : "bg-yellow-700"
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
                                  color={colors.text.muted}
                                  className="ml-2"
                                />
                              </View>
                            </View>

                            {/* Exercise Parameters */}
                            <View className="flex-row flex-wrap mb-2">
                              {exercise.sets && exercise.reps ? (
                                <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                  <Text className="text-xs font-medium text-text-primary">
                                    {exercise.sets} × {exercise.reps}
                                  </Text>
                                </View>
                              ) : null}
                              {exercise.duration ? (
                                <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                  <Text className="text-xs font-medium text-text-primary">
                                    {exercise.duration}s
                                  </Text>
                                </View>
                              ) : null}
                              {exercise.weight ? (
                                <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                  <Text className="text-xs font-medium text-text-primary">
                                    {exercise.weight} lbs
                                  </Text>
                                </View>
                              ) : null}
                              {exercise.restTime && exercise.restTime > 0 ? (
                                <View className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1">
                                  <Text className="text-xs font-medium text-text-primary">
                                    {exercise.restTime}s rest
                                  </Text>
                                </View>
                              ) : null}
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
                                    className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1"
                                  >
                                    <Text className="text-xs font-medium text-text-primary">
                                      {muscle}
                                    </Text>
                                  </View>
                                ))}
                              {getIndividualMuscleGroups(
                                exercise?.exercise?.muscleGroups
                              ).length > 3 ? (
                                <View className="bg-neutral-300 rounded-full px-2 py-1 mr-1 mb-1">
                                  <Text className="text-xs font-medium text-text-muted">
                                    +
                                    {getIndividualMuscleGroups(
                                      exercise?.exercise?.muscleGroups
                                    ).length - 3}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        )
                      )}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* General Exercise Search Results */}
        {!isLoading && generalResults.length > 0 ? (
          <View className="px-4">
            <Text className="text-lg font-semibold text-text-primary mb-4 p-4">
              Exercise Results ({safeString(generalResults.length)})
            </Text>
            {generalResults.map((exercise: Exercise, index: number) => (
              <TouchableOpacity
                key={`general-exercise-${exercise?.id || index}`}
                className="bg-white rounded-xl p-4 mb-3 shadow-rn-sm flex-row items-center"
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
                        ? exercise.equipment.join(", ")
                        : "",
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
                          className="bg-brand-light-2 rounded-full px-2 py-1 mr-1 mb-1"
                        >
                          <Text className="text-xs font-medium text-text-primary">
                            {muscle}
                          </Text>
                        </View>
                      ))}
                    {getIndividualMuscleGroups(exercise?.muscleGroups).length >
                    3 ? (
                      <View className="bg-neutral-300 rounded-full px-2 py-1 mr-1 mb-1">
                        <Text className="text-xs font-medium text-text-muted">
                          +
                          {getIndividualMuscleGroups(exercise?.muscleGroups)
                            .length - 3}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text className="text-sm text-text-muted mb-2">
                    {formatDifficultyProperly(exercise?.difficulty)}
                  </Text>

                  {/* Equipment Pills */}
                  {exercise?.equipment &&
                  Array.isArray(exercise.equipment) &&
                  exercise.equipment.length > 0 ? (
                    <View className="mb-2">
                      <View className="flex-row flex-wrap">
                        {exercise.equipment
                          .flatMap((item: string) =>
                            item.split(",").map((s) => s.trim())
                          )
                          .map((item: string, equipmentIndex: number) => (
                            <View
                              key={equipmentIndex}
                              className="bg-neutral-light-1 rounded-full px-2 py-1 mr-1.5 mb-1"
                            >
                              <Text className="text-xs font-medium text-text-primary">
                                {formatEquipmentProperly(item)}
                              </Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  ) : null}
                  {exercise?.description ? (
                    <Text className="text-sm text-text-muted mb-2">
                      {safeString(exercise.description)}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Empty State */}
        {!isLoading &&
        !dateResult &&
        !exerciseResult &&
        generalResults.length === 0 &&
        (exerciseQuery.trim() || dateQuery.trim()) ? (
          <View className="items-center justify-center bg-white p-10 m-4 rounded-2xl shadow-rn-sm">
            <Ionicons
              name="search-outline"
              size={40}
              color={colors.neutral.medium[1]}
            />
            <Text className="text-lg font-semibold text-text-muted mt-4">
              No results found
            </Text>
            <Text className="text-sm text-text-muted text-center mt-2">
              Try searching for a date (YYYY-MM-DD) or exercise name
            </Text>
          </View>
        ) : null}

        {/* How to Search Instructions */}
        {!isLoading &&
        !exerciseQuery.trim() &&
        !dateQuery.trim() &&
        !dateResult &&
        !exerciseResult &&
        generalResults.length === 0 ? (
          <View className="px-4">
            <Text className="text-lg font-bold text-text-primary p-4">
              How to Search
            </Text>

            <View className="bg-white rounded-xl p-4 mb-3 flex-row items-center">
              <View className="bg-brand-primary p-2 rounded-lg mr-3">
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="flex-1 text-sm text-text-muted">
                Search by date to see the workout for that day
              </Text>
            </View>

            <View className="bg-white rounded-xl p-4 mb-3 flex-row items-center">
              <View className="bg-brand-primary p-2 rounded-lg mr-3">
                <Ionicons
                  name="barbell-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="flex-1 text-sm text-text-muted">
                Search by exercise name to see exercises and performance stats
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Exercise Link Modal */}
      <ExerciseLinkModal
        visible={linkModalVisible}
        exercise={selectedExerciseForLink}
        onClose={handleCloseLinkModal}
        onSave={handleSaveExerciseLink}
      />

      {/* Custom Dialog */}
      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </View>
  );
}
