import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { useAppDataContext } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { replaceExercise } from "@/lib/workouts";
import {
  PlanDayWithBlocks,
  WorkoutBlockWithExercise,
} from "@/types/api/workout.types";
import { Exercise } from "@/types/api/exercise.types";
import { SearchExercise } from "@/types/api/search.types";
import {
  searchExercisesWithFiltersAPI,
  getFilterOptionsAPI,
} from "@/lib/search";
import WorkoutBlock from "@/components/workout-block";
import {
  formatWorkoutDuration,
  calculatePlanDayDuration,
  formatEquipment,
  formatMuscleGroups,
} from "@/utils";

interface WorkoutEditModalProps {
  visible: boolean;
  onClose: () => void;
  planDay: PlanDayWithBlocks | null;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function WorkoutEditModal({
  visible,
  onClose,
  planDay,
  onSuccess,
  onError,
}: WorkoutEditModalProps) {
  const { user } = useAuth();
  const {
    refresh: { refreshWorkout },
  } = useAppDataContext();

  const [modifiedExercises, setModifiedExercises] = useState<Set<number>>(
    new Set()
  );
  const [saving, setSaving] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<
    Record<number, boolean | undefined>
  >({});

  // Exercise replacement states
  const [currentView, setCurrentView] = useState<"main" | "replace">("main");
  const [currentExercise, setCurrentExercise] =
    useState<WorkoutBlockWithExercise | null>(null);
  const [selectedExercise, setSelectedExercise] =
    useState<SearchExercise | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(
    []
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);

  // Temporary filter states for the modal
  const [tempEquipment, setTempEquipment] = useState<string[]>([]);
  const [tempMuscleGroups, setTempMuscleGroups] = useState<string[]>([]);
  const [tempDifficulty, setTempDifficulty] = useState<string | null>(null);

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<{
    equipment: string[];
    muscleGroups: string[];
    difficulty: string[];
  } | null>(null);

  // Muscle groups UI state
  const [showAllMuscleGroups, setShowAllMuscleGroups] = useState(false);
  const [muscleGroupSearchQuery, setMuscleGroupSearchQuery] = useState("");
  const [showMuscleGroupSearch, setShowMuscleGroupSearch] = useState(false);

  // Equipment UI state
  const [showAllEquipment, setShowAllEquipment] = useState(false);

  // Filter and limit muscle groups based on search and show more state
  const getVisibleMuscleGroups = () => {
    if (!filterOptions?.muscleGroups) return [];

    let filtered = filterOptions.muscleGroups;

    // Apply search filter if search is active
    if (showMuscleGroupSearch && muscleGroupSearchQuery.trim()) {
      const searchLower = muscleGroupSearchQuery.toLowerCase();
      filtered = filtered.filter((group) =>
        group.toLowerCase().includes(searchLower)
      );
    }

    // Limit to first 10 unless showing all
    if (!showAllMuscleGroups && !showMuscleGroupSearch) {
      filtered = filtered.slice(0, 10);
    }

    return filtered;
  };

  // Filter and limit equipment based on show more state
  const getVisibleEquipment = () => {
    if (!filterOptions?.equipment) return [];

    let filtered = filterOptions.equipment;

    // Limit to first 10 unless showing all
    if (!showAllEquipment) {
      filtered = filtered.slice(0, 10);
    }

    return filtered;
  };

  // Format muscle group names by replacing underscores with spaces and capitalizing
  const formatMuscleGroup = (muscleGroup: string) => {
    return muscleGroup
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Convert display name back to raw enum value
  const toRawEnumValue = (displayName: string) => {
    return displayName.toLowerCase().replace(/\s+/g, "_");
  };

  // Format equipment names for display
  const formatEquipmentDisplay = (equipment: string) => {
    return equipment
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Initialize expanded blocks when modal opens
  useEffect(() => {
    if (visible && planDay) {
      // All blocks expanded by default (undefined = expanded, false = collapsed)
      setExpandedBlocks({});
      setModifiedExercises(new Set());
      setCurrentView("main");
      setCurrentExercise(null);
      setSelectedExercise(null);
      setSearchQuery("");
      setSelectedEquipment([]);
      setSelectedMuscleGroups([]);
      setSelectedDifficulty(null);
    }
  }, [visible, planDay]);

  // Fetch filter options when modal opens
  useEffect(() => {
    if (visible && !filterOptions) {
      const fetchFilterOptions = async () => {
        const options = await getFilterOptionsAPI();
        if (options?.success) {
          setFilterOptions({
            equipment: options.equipment,
            muscleGroups: options.muscleGroups,
            difficulty: options.difficulty,
          });
        }
      };
      fetchFilterOptions();
    }
  }, [visible, filterOptions]);

  // Load initial suggestions when view changes or filters change
  useEffect(() => {
    if (currentView === "replace") {
      searchExercises();
    }
  }, [
    currentView,
    selectedMuscleGroups,
    selectedEquipment,
    selectedDifficulty,
  ]);

  const toggleBlockExpansion = (blockId: number) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: prev[blockId] === false ? undefined : false,
    }));
  };

  // Exercise replacement functions
  const handleExercisePress = (exercise: WorkoutBlockWithExercise) => {
    setCurrentExercise(exercise);
    setCurrentView("replace");
    // Auto-populate muscle groups for better suggestions
    if (exercise.exercise.muscles_targeted) {
      setSelectedMuscleGroups(exercise.exercise.muscles_targeted);
    }
    searchExercises();
  };

  const searchExercises = async () => {
    if (!user) return;

    setSearching(true);
    try {
      const result = await searchExercisesWithFiltersAPI(user.id, {
        query: searchQuery.trim() || undefined,
        muscleGroups:
          selectedMuscleGroups.length > 0 ? selectedMuscleGroups : undefined,
        equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
        difficulty: selectedDifficulty || undefined,
        excludeId: currentExercise?.exercise.id,
        userEquipmentOnly: selectedEquipment.length === 0, // Only use user equipment if no manual equipment filter
        limit: 20,
      });

      if (result.success) {
        setSearchResults(result.exercises);
      } else {
        setSearchResults([]);
        Alert.alert("Error", "Failed to search exercises. Please try again.");
      }
    } catch (error) {
      console.error("Search exercises error:", error);
      setSearchResults([]);
      Alert.alert("Error", "Failed to search exercises. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const openFilterModal = () => {
    // Initialize temp states with current values
    setTempEquipment([...selectedEquipment]);
    setTempMuscleGroups([...selectedMuscleGroups]);
    setTempDifficulty(selectedDifficulty);
    setShowFilters(true);
  };

  const applyFilters = () => {
    // Apply temp values to actual states
    setSelectedEquipment([...tempEquipment]);
    setSelectedMuscleGroups([...tempMuscleGroups]);
    setSelectedDifficulty(tempDifficulty);
    setShowFilters(false);
    // Trigger search with new filters
    searchExercises();
  };

  const cancelFilters = () => {
    // Reset temp states and close modal
    setTempEquipment([]);
    setTempMuscleGroups([]);
    setTempDifficulty(null);
    setShowFilters(false);
  };

  const handleConfirmReplace = async () => {
    if (!selectedExercise || !currentExercise) return;

    try {
      setReplacing(true);

      const result = await replaceExercise(
        currentExercise.id,
        selectedExercise.id
      );

      if (result?.success) {
        // Mark this exercise as modified
        setModifiedExercises((prev) => new Set([...prev, currentExercise.id]));

        // Close the modal completely to go back to calendar
        onClose();

        // Trigger refresh of workout data in background
        refreshWorkout();
      } else {
        Alert.alert("Error", "Failed to replace exercise. Please try again.");
      }
    } catch (error) {
      console.error("Error replacing exercise:", error);
      Alert.alert("Error", "Failed to replace exercise. Please try again.");
    } finally {
      setReplacing(false);
    }
  };

  const formatExerciseDetails = (exercise: WorkoutBlockWithExercise) => {
    const details = [];

    if (exercise.sets && exercise.reps) {
      details.push(`${exercise.sets} × ${exercise.reps}`);
    } else if (exercise.duration) {
      if (exercise.sets && exercise.sets > 1) {
        details.push(`${exercise.sets} × ${exercise.duration}s`);
      } else {
        details.push(`${exercise.duration}s`);
      }
    } else if (exercise.reps) {
      details.push(`${exercise.reps} reps`);
    } else if (exercise.sets) {
      details.push(`${exercise.sets} sets`);
    }

    if (exercise.weight) {
      details.push(`${exercise.weight} lbs`);
    }

    if (exercise.restTime && exercise.restTime > 0) {
      details.push(`${exercise.restTime}s rest`);
    }

    return details.length > 0 ? details.join(" • ") : "Follow instructions";
  };

  // Get individual muscle groups for display (matching search tab)
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

  const handleSave = async () => {
    if (modifiedExercises.size === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement API calls for each modified exercise
      // This will be done in Phase 4

      await refreshWorkout();
      Alert.alert("Success", "Workout updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            onClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (error) {
      onError?.("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentView === "replace") {
      setCurrentView("main");
      setCurrentExercise(null);
      setSelectedExercise(null);
      return;
    }

    if (modifiedExercises.size > 0) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your changes?",
        [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  if (!planDay) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-center items-center bg-background">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.text.muted}
          />
          <Text className="text-lg font-semibold text-text-primary mt-4 text-center">
            Workout not found
          </Text>
          <Text className="text-base text-text-muted text-center mt-2 mb-6">
            The workout you're trying to edit could not be found.
          </Text>
          <TouchableOpacity
            className="bg-primary py-3 px-6 rounded-md"
            onPress={onClose}
          >
            <Text className="text-white font-semibold">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const totalExercises = planDay.blocks.reduce(
    (total, block) => total + (block.exercises?.length || 0),
    0
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 bg-background">
          {/* Header */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
              <TouchableOpacity
                onPress={handleCancel}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.text.muted} />
              </TouchableOpacity>
              <Text className="text-base font-semibold text-text-primary">
                {currentView === "main" ? "Edit Exercises" : "Replace Exercise"}
              </Text>
              <View className="w-8" />
            </View>
          </TouchableWithoutFeedback>

          {/* Content */}
          {currentView === "main" ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={true}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
            >
              {/* Workout Info */}
              <View
                className="px-5 py-4 bg-white border-b"
                style={{ borderBottomColor: colors.neutral.medium[1] }}
              >
                {/* Workout Name */}
                <Text
                  className="text-xl font-bold mb-3"
                  style={{ color: colors.text.primary }}
                >
                  {planDay.description || planDay.name || "Workout"}
                </Text>

                {/* Workout Instructions */}
                {planDay.instructions && (
                  <Text
                    className="text-sm mb-4 italic leading-5"
                    style={{ color: colors.text.secondary }}
                  >
                    {planDay.instructions}
                  </Text>
                )}

                {/* Edit Instructions */}
                <Text
                  className="text-sm mb-4 italic leading-5"
                  style={{ color: colors.text.secondary }}
                >
                  Tap any exercise to replace it with an alternative
                </Text>

                {/* Workout Details with Icons */}
                <View className="flex-row flex-wrap items-center gap-4">
                  {/* Exercise Count */}
                  <View className="flex-row items-center">
                    <Ionicons
                      name="fitness"
                      size={16}
                      color={colors.text.muted}
                    />
                    <View className="ml-2">
                      <View
                        className="rounded-full px-2 py-1"
                        style={{ backgroundColor: colors.brand.primary }}
                      >
                        <Text className="text-xs font-semibold text-white">
                          {totalExercises} exercises
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Duration */}
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={16} color={colors.text.muted} />
                    <View className="ml-2">
                      <View
                        className="rounded-full px-2 py-1"
                        style={{ backgroundColor: colors.brand.primary }}
                      >
                        <Text className="text-xs font-semibold text-white">
                          {formatWorkoutDuration(
                            calculatePlanDayDuration(planDay)
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Modified Count */}
                  {modifiedExercises.size > 0 && (
                    <View className="flex-row items-center">
                      <Ionicons name="create" size={16} color="#eab308" />
                      <View className="ml-2">
                        <View className="rounded-full px-2 py-1 bg-yellow-500">
                          <Text className="text-xs font-semibold text-white">
                            {modifiedExercises.size} changed
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Workout Blocks */}
              <View className="px-5 pt-5">
                {planDay.blocks && planDay.blocks.length > 0 ? (
                  planDay.blocks
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((block, blockIndex) => (
                      <View key={block.id} className="mb-4">
                        <WorkoutBlock
                          block={block}
                          blockIndex={blockIndex}
                          isExpanded={expandedBlocks[block.id] !== false} // undefined = expanded, false = collapsed
                          onToggleExpanded={() =>
                            toggleBlockExpansion(block.id)
                          }
                          showDetails={true}
                          variant="calendar"
                          onExercisePress={handleExercisePress}
                        />
                      </View>
                    ))
                ) : (
                  <View
                    className="p-6 rounded-xl items-center"
                    style={{ backgroundColor: colors.brand.light[1] }}
                  >
                    <Text
                      className="text-base font-bold mb-2"
                      style={{ color: colors.text.primary }}
                    >
                      No Exercises
                    </Text>
                    <Text
                      className="text-sm text-center leading-5"
                      style={{ color: colors.text.muted }}
                    >
                      This workout doesn't have any exercises to edit.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            /* Exercise Replacement View */
            <View className="flex-1">
              {/* Current Exercise Section */}
              <View className="px-5 py-4 bg-white">
                {currentExercise && (
                  <>
                    {/* Exercise Name */}
                    <Text
                      className="text-xl font-bold mb-3"
                      style={{ color: colors.text.primary }}
                    >
                      {currentExercise.exercise.name}
                    </Text>

                    {/* Instructions */}
                    {currentExercise.exercise.instructions ? (
                      <Text
                        className="text-sm mb-4 italic leading-5"
                        style={{ color: colors.text.secondary }}
                      >
                        {currentExercise.exercise.instructions}
                      </Text>
                    ) : (
                      <Text
                        className="text-sm mb-4 italic leading-5"
                        style={{ color: colors.text.muted }}
                      >
                        No instructions available
                      </Text>
                    )}

                    {/* Exercise Details (sets/reps/weight) */}
                    <Text
                      className="text-sm mb-4 italic leading-5"
                      style={{ color: colors.text.secondary }}
                    >
                      {formatExerciseDetails(currentExercise)}
                    </Text>

                    {/* Exercise Details with Icons */}
                    <View className="flex-row flex-wrap items-center gap-4">
                      {/* Muscle Groups */}
                      {currentExercise.exercise.muscles_targeted && (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="body"
                            size={16}
                            color={colors.text.muted}
                          />
                          <View className="flex-row flex-wrap ml-2">
                            {getIndividualMuscleGroups(
                              currentExercise.exercise.muscles_targeted
                            ).map((muscle, index) => (
                              <View
                                key={index}
                                className="rounded-full px-2 py-1 mr-1 mb-1"
                                style={{
                                  backgroundColor: colors.brand.primary,
                                }}
                              >
                                <Text className="text-xs font-semibold text-white">
                                  {muscle}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Equipment */}
                      {currentExercise.exercise.equipment && (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="fitness"
                            size={16}
                            color={colors.text.muted}
                          />
                          <View className="ml-2">
                            <View
                              className="rounded-full px-2 py-1"
                              style={{ backgroundColor: colors.brand.primary }}
                            >
                              <Text className="text-xs font-semibold text-white">
                                {formatEquipment(
                                  currentExercise.exercise.equipment
                                )}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>

              {/* Separator Line */}
              <View
                className="h-px mx-5"
                style={{ backgroundColor: colors.neutral.medium[1] }}
              />

              {/* Search Section */}
              <View className="flex-1">
                {/* Search Header and Input */}
                <View className="px-5 py-4 bg-white">
                  {/* Search Input Row */}
                  <View className="flex-row items-center gap-3">
                    {/* Search Input */}
                    <View
                      className="flex-1 flex-row items-center rounded-xl px-4 py-3"
                      style={{ backgroundColor: colors.neutral.light[2] }}
                    >
                      <Ionicons
                        name="search"
                        size={20}
                        color={colors.text.muted}
                      />
                      <TextInput
                        className="flex-1 ml-3 text-base"
                        style={{ color: colors.text.primary }}
                        placeholder="Search exercises..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={searchExercises}
                        returnKeyType="search"
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={colors.text.muted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Filter Button */}
                    <TouchableOpacity
                      className="flex-row items-center justify-center px-4 py-3 rounded-xl border"
                      style={{
                        backgroundColor:
                          selectedEquipment.length > 0 ||
                          selectedMuscleGroups.length > 0 ||
                          selectedDifficulty
                            ? colors.brand.primary
                            : "white",
                        borderColor: colors.brand.primary,
                      }}
                      onPress={openFilterModal}
                    >
                      <Ionicons
                        name="options"
                        size={20}
                        color={
                          selectedEquipment.length > 0 ||
                          selectedMuscleGroups.length > 0 ||
                          selectedDifficulty
                            ? "white"
                            : colors.brand.primary
                        }
                      />
                      <Text
                        className="text-sm font-medium ml-2"
                        style={{
                          color:
                            selectedEquipment.length > 0 ||
                            selectedMuscleGroups.length > 0 ||
                            selectedDifficulty
                              ? "white"
                              : colors.brand.primary,
                        }}
                      >
                        Filter
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Separator Line */}
                <View
                  className="h-px mx-5"
                  style={{ backgroundColor: colors.neutral.medium[1] }}
                />

                {/* Search Results */}
                <View className="flex-1">
                  {searching ? (
                    <View className="flex-1 justify-center items-center">
                      <ActivityIndicator
                        size="large"
                        color={colors.brand.primary}
                      />
                      <Text className="mt-4 text-base text-text-muted">
                        Searching exercises...
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id.toString()}
                      contentContainerStyle={{ padding: 20 }}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          className={`mb-3 p-4 rounded-xl border ${
                            selectedExercise?.id === item.id
                              ? "border-brand-primary"
                              : "bg-white border-gray-200"
                          }`}
                          onPress={() => setSelectedExercise(item)}
                          activeOpacity={0.7}
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-text-primary mb-1">
                                {item.name}
                              </Text>
                              {item.description && (
                                <Text className="text-sm text-text-muted mb-3">
                                  {item.description}
                                </Text>
                              )}

                              {/* Exercise Details with Icons */}
                              <View className="flex-row flex-wrap gap-3 mb-2">
                                {/* Muscle Groups */}
                                {item.muscleGroups &&
                                  item.muscleGroups.length > 0 && (
                                    <View className="flex-row items-center">
                                      <Ionicons
                                        name="body"
                                        size={14}
                                        color={colors.text.muted}
                                      />
                                      <View className="flex-row flex-wrap ml-1">
                                        {getIndividualMuscleGroups(
                                          item.muscleGroups
                                        )
                                          .slice(0, 2)
                                          .map((muscle, muscleIndex) => (
                                            <View
                                              key={muscleIndex}
                                              className="rounded-full px-2 py-1 mr-1"
                                              style={{
                                                backgroundColor:
                                                  colors.brand.primary,
                                              }}
                                            >
                                              <Text className="text-xs font-semibold text-white">
                                                {muscle}
                                              </Text>
                                            </View>
                                          ))}
                                        {getIndividualMuscleGroups(
                                          item.muscleGroups
                                        ).length > 2 && (
                                          <View
                                            className="rounded-full px-2 py-1"
                                            style={{
                                              backgroundColor:
                                                colors.brand.primary,
                                            }}
                                          >
                                            <Text className="text-xs font-semibold text-white">
                                              +
                                              {getIndividualMuscleGroups(
                                                item.muscleGroups
                                              ).length - 2}
                                            </Text>
                                          </View>
                                        )}
                                      </View>
                                    </View>
                                  )}

                                {/* Equipment */}
                                {item.equipment && (
                                  <View className="flex-row items-center">
                                    <Ionicons
                                      name="fitness"
                                      size={14}
                                      color={colors.text.muted}
                                    />
                                    <View className="ml-1">
                                      <View
                                        className="rounded-full px-2 py-1"
                                        style={{
                                          backgroundColor: colors.brand.primary,
                                        }}
                                      >
                                        <Text className="text-xs font-semibold text-white">
                                          {formatEquipment(item.equipment)}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </View>
                            </View>

                            {/* Selection Indicator */}
                            {selectedExercise?.id === item.id && (
                              <View className="ml-3">
                                <View className="w-6 h-6 bg-brand-primary rounded-full items-center justify-center">
                                  <Ionicons
                                    name="checkmark"
                                    size={14}
                                    color="white"
                                  />
                                </View>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View className="flex-1 justify-center items-center py-12">
                          <Ionicons
                            name="search"
                            size={48}
                            color={colors.text.muted}
                          />
                          <Text className="text-base text-text-muted text-center mt-4">
                            {searchQuery ||
                            selectedEquipment.length > 0 ||
                            selectedMuscleGroups.length > 0 ||
                            selectedDifficulty
                              ? "No exercises found matching your criteria"
                              : "Enter a search term or adjust filters to find exercises"}
                          </Text>
                        </View>
                      }
                    />
                  )}
                </View>
              </View>

              {/* Replace Button */}
              {selectedExercise && (
                <View className="px-5 py-4 border-t border-neutral-light-2">
                  <TouchableOpacity
                    className="bg-primary py-4 rounded-xl items-center"
                    onPress={handleConfirmReplace}
                    disabled={replacing}
                  >
                    {replacing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons
                          name="swap-horizontal"
                          size={20}
                          color="white"
                        />
                        <Text className="text-white font-semibold text-lg ml-2">
                          Replace Exercise
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {modifiedExercises.size > 0 && (
            <View className="px-5 pb-10 mb-5">
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-white border border-gray-300 py-4 rounded-md items-center"
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text className="text-text-primary font-semibold text-sm">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 bg-primary py-4 rounded-md items-center flex-row justify-center ${
                    saving ? "opacity-70" : ""
                  }`}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="white" />
                      <Text className="text-white font-semibold text-sm ml-2">
                        Save Changes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={cancelFilters}
      >
        <View className="flex-1 bg-background mb-4">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
            <TouchableOpacity onPress={cancelFilters}>
              <Text
                className="text-base font-medium"
                style={{ color: colors.text.muted }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              className="text-base font-semibold"
              style={{ color: colors.text.primary }}
            >
              Filters
            </Text>
            <TouchableOpacity onPress={applyFilters}>
              <Text
                className="text-base font-medium"
                style={{ color: colors.brand.primary }}
              >
                Apply
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Equipment Filters */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name="fitness"
                  size={20}
                  color={colors.text.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  Equipment
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-3">
                {getVisibleEquipment().map((equipment) => (
                  <TouchableOpacity
                    key={equipment}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor: tempEquipment.includes(equipment)
                        ? colors.brand.primary
                        : "white",
                      borderColor: tempEquipment.includes(equipment)
                        ? colors.brand.primary
                        : colors.neutral.medium[1],
                    }}
                    onPress={() =>
                      setTempEquipment((prev) =>
                        prev.includes(equipment)
                          ? prev.filter((e) => e !== equipment)
                          : [...prev, equipment]
                      )
                    }
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: tempEquipment.includes(equipment)
                          ? "white"
                          : colors.text.primary,
                      }}
                    >
                      {formatEquipmentDisplay(equipment)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Show More/Less button for equipment */}
              {filterOptions?.equipment &&
                filterOptions.equipment.length > 10 && (
                  <TouchableOpacity
                    onPress={() => setShowAllEquipment(!showAllEquipment)}
                    className="mt-3 py-2 px-4 rounded-lg self-start"
                    style={{ backgroundColor: colors.neutral.light[1] }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: colors.brand.primary }}
                    >
                      {showAllEquipment
                        ? "Show Less"
                        : `Show More (${
                            filterOptions.equipment.length - 10
                          } more)`}
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            {/* Muscle Group Filters */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons
                    name="body"
                    size={20}
                    color={colors.text.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className="text-base font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    Muscle Groups
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setShowMuscleGroupSearch(!showMuscleGroupSearch)
                  }
                  className="p-1"
                >
                  <Ionicons name="search" size={18} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              {/* Search input */}
              {showMuscleGroupSearch && (
                <View className="mb-3">
                  <TextInput
                    className="px-3 py-2 border rounded-lg text-sm"
                    style={{
                      borderColor: colors.neutral.medium[1],
                      color: colors.text.primary,
                    }}
                    placeholder="Search muscle groups..."
                    placeholderTextColor={colors.text.muted}
                    value={muscleGroupSearchQuery}
                    onChangeText={setMuscleGroupSearchQuery}
                    autoFocus
                  />
                </View>
              )}

              <View className="flex-row flex-wrap gap-3">
                {getVisibleMuscleGroups().map((muscleGroup) => (
                  <TouchableOpacity
                    key={muscleGroup}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor: tempMuscleGroups.includes(muscleGroup)
                        ? colors.brand.primary
                        : "white",
                      borderColor: tempMuscleGroups.includes(muscleGroup)
                        ? colors.brand.primary
                        : colors.neutral.medium[1],
                    }}
                    onPress={() =>
                      setTempMuscleGroups((prev) =>
                        prev.includes(muscleGroup)
                          ? prev.filter((m) => m !== muscleGroup)
                          : [...prev, muscleGroup]
                      )
                    }
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: tempMuscleGroups.includes(muscleGroup)
                          ? "white"
                          : colors.text.primary,
                      }}
                    >
                      {formatMuscleGroup(muscleGroup)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Show More/Less button for muscle groups */}
              {!showMuscleGroupSearch &&
                filterOptions?.muscleGroups &&
                filterOptions.muscleGroups.length > 10 && (
                  <TouchableOpacity
                    onPress={() => setShowAllMuscleGroups(!showAllMuscleGroups)}
                    className="mt-3 py-2 px-4 rounded-lg self-start"
                    style={{ backgroundColor: colors.neutral.light[1] }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: colors.brand.primary }}
                    >
                      {showAllMuscleGroups
                        ? "Show Less"
                        : `Show More (${
                            filterOptions.muscleGroups.length - 10
                          } more)`}
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            {/* Difficulty Filter */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={colors.text.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  Difficulty
                </Text>
              </View>
              <View className="flex-row gap-3">
                {(filterOptions?.difficulty || []).map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor:
                        tempDifficulty === difficulty
                          ? colors.brand.primary
                          : "white",
                      borderColor:
                        tempDifficulty === difficulty
                          ? colors.brand.primary
                          : colors.neutral.medium[1],
                    }}
                    onPress={() =>
                      setTempDifficulty(
                        tempDifficulty === difficulty ? null : difficulty
                      )
                    }
                  >
                    <Text
                      className="text-sm font-medium capitalize"
                      style={{
                        color:
                          tempDifficulty === difficulty
                            ? "white"
                            : colors.text.primary,
                      }}
                    >
                      {difficulty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear All Filters */}
            {(tempEquipment.length > 0 ||
              tempMuscleGroups.length > 0 ||
              tempDifficulty) && (
              <TouchableOpacity
                className="self-start py-2"
                onPress={() => {
                  setTempEquipment([]);
                  setTempMuscleGroups([]);
                  setTempDifficulty(null);
                }}
              >
                <Text
                  className="text-base font-medium"
                  style={{ color: colors.brand.primary }}
                >
                  Clear all filters
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}
