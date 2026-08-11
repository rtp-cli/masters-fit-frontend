import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef,useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ExerciseActionSheet from "@/components/exercise-action-sheet";
import { ExclusionFlow } from "@/components/exercise-exclusion";
import { OutlineChip } from "@/components/ui";
import WorkoutBlock from "@/components/workout-block";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  getFilterOptionsAPI,
  searchExercisesWithFiltersAPI,
} from "@/lib/search";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  addExerciseToBlock,
  deleteExerciseFromBlock,
  replaceExercise,
  updateExerciseParams,
} from "@/lib/workouts";
import { type SearchExercise } from "@/types/api/search.types";
import {
  type PlanDayWithBlocks,
  type WorkoutBlockWithExercise,
} from "@/types/api/workout.types";
import {
  calculatePlanDayDuration,
  formatEnumValue,
  formatEquipment,
  formatWorkoutDuration,
} from "@/utils";

import { CustomDialog, type DialogButton } from "./ui";

interface WorkoutEditModalProps {
  visible: boolean;
  onClose: () => void;
  planDay: PlanDayWithBlocks | null;
}

export default function WorkoutEditModal({
  visible,
  onClose,
  planDay,
}: WorkoutEditModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const {
    refresh: { refreshWorkout },
  } = useAppDataContext();

  const [expandedBlocks, setExpandedBlocks] = useState<
    Record<number, boolean | undefined>
  >({});

  // Exercise replacement states
  const [currentView, setCurrentView] = useState<
    "main" | "replace" | "add" | "editParams"
  >("main");
  const [currentExercise, setCurrentExercise] =
    useState<WorkoutBlockWithExercise | null>(null);
  const [selectedExercise, setSelectedExercise] =
    useState<SearchExercise | null>(null);
  const [replacing, setReplacing] = useState(false);

  // Add exercise states
  const [addingToBlock, setAddingToBlock] = useState<{
    blockId: number;
    planDayId: number;
  } | null>(null);
  const [addParams, setAddParams] = useState({
    sets: "",
    reps: "",
    weight: "",
    duration: "",
    restTime: "",
  });
  const [addingExercise, setAddingExercise] = useState(false);
  // Edit-params view reuses `addParams` for its inputs; this is its own saver.
  const [savingParams, setSavingParams] = useState(false);

  // 1a action sheet + exclusion flow. Tapping a row opens the three-door sheet
  // (Replace / Remove today / Never prescribe again); door three mounts the
  // self-contained ExclusionFlow.
  const [actionSheetExercise, setActionSheetExercise] =
    useState<WorkoutBlockWithExercise | null>(null);
  const [exclusionExercise, setExclusionExercise] =
    useState<WorkoutBlockWithExercise | null>(null);

  // Track whether modal has been initialized (prevents re-init on planDay prop changes)
  const initializedRef = useRef(false);
  // Focus the replace/add search field when the user opens that view.
  const searchInputRef = useRef<TextInput>(null);
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
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

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

  // Format equipment names for display
  const formatEquipmentDisplay = (equipment: string) => {
    return equipment
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Initialize expanded blocks when modal first opens (not on every planDay change)
  useEffect(() => {
    if (visible && planDay && !initializedRef.current) {
      initializedRef.current = true;
      // All blocks expanded by default (undefined = expanded, false = collapsed)
      setExpandedBlocks({});
      setCurrentView("main");
      setCurrentExercise(null);
      setSelectedExercise(null);
      setSearchQuery("");
      setSelectedEquipment([]);
      setSelectedMuscleGroups([]);
      setSelectedDifficulty(null);
      setAddingToBlock(null);
      setAddParams({
        sets: "",
        reps: "",
        weight: "",
        duration: "",
        restTime: "",
      });
      setAddingExercise(false);
    }
    if (!visible) {
      initializedRef.current = false;
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
    if (currentView === "replace" || currentView === "add") {
      searchExercises();
    }
  }, [
    currentView,
    selectedMuscleGroups,
    selectedEquipment,
    selectedDifficulty,
  ]);

  // Live-filter as the user types, matching the calendar search tab's 300ms
  // debounce (previously this view only searched on Return / onSubmitEditing).
  useEffect(() => {
    if (currentView !== "replace" && currentView !== "add") return;
    const timeoutId = setTimeout(() => {
      searchExercises();
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Auto-focus the search field when the replace/add view opens so the user can
  // type immediately. The short delay lets the view finish mounting first.
  useEffect(() => {
    if (currentView !== "replace" && currentView !== "add") return;
    const timeoutId = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [currentView]);

  const toggleBlockExpansion = (blockId: number) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: prev[blockId] === false ? undefined : false,
    }));
  };

  // Tapping a row now opens the 1a action sheet instead of jumping straight to
  // Replace (and the row no longer carries a trash icon — that's door two).
  const handleExercisePress = (exercise: WorkoutBlockWithExercise) => {
    setActionSheetExercise(exercise);
  };

  // Door 1 — the existing replace/search view, seeded from the exercise's own
  // muscle groups.
  const startReplace = (exercise: WorkoutBlockWithExercise) => {
    setCurrentExercise(exercise);
    setCurrentView("replace");
    if (exercise.exercise.muscles_targeted) {
      setSelectedMuscleGroups(exercise.exercise.muscles_targeted);
    }
    searchExercises();
  };

  // Door — edit this exercise's own sets/reps/weight/duration/rest in place.
  // Reuses the Add view's `addParams` inputs, pre-filled from the exercise.
  const startEditParams = (exercise: WorkoutBlockWithExercise) => {
    const numToStr = (v?: number | null) =>
      v != null && v > 0 ? String(v) : "";
    setCurrentExercise(exercise);
    setAddParams({
      sets: numToStr(exercise.sets),
      reps: numToStr(exercise.reps),
      weight: numToStr(exercise.weight),
      duration: numToStr(exercise.duration),
      restTime: numToStr(exercise.restTime),
    });
    setCurrentView("editParams");
  };

  const handleSaveParams = async () => {
    if (!currentExercise) return;
    // Empty field → null (clears it); otherwise the parsed number. This is
    // WYSIWYG: the form is pre-filled, so what's on screen is what persists.
    const strToNum = (s: string): number | null => {
      const t = s.trim();
      if (t === "") return null;
      const v = Number(t);
      return Number.isFinite(v) ? v : null;
    };
    try {
      setSavingParams(true);
      const result = await updateExerciseParams(currentExercise.id, {
        sets: strToNum(addParams.sets),
        reps: strToNum(addParams.reps),
        weight: strToNum(addParams.weight),
        duration: strToNum(addParams.duration),
        restTime: strToNum(addParams.restTime),
      });
      if (result?.success) {
        setCurrentView("main");
        setCurrentExercise(null);
        setAddParams({
          sets: "",
          reps: "",
          weight: "",
          duration: "",
          restTime: "",
        });
        refreshWorkout();
      } else {
        setDialogConfig({
          title: "Error",
          description: "Failed to update exercise. Please try again.",
          primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      console.error("Error updating exercise:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to update exercise. Please try again.",
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setSavingParams(false);
    }
  };

  // Door 2 — remove from today only. No reason, no confirmation dialog (its
  // scope is stated in the sheet subtitle, and it can come back).
  const removeFromToday = async (exercise: WorkoutBlockWithExercise) => {
    try {
      const result = await deleteExerciseFromBlock(exercise.id);
      if (result?.success) {
        refreshWorkout();
      } else {
        setDialogConfig({
          title: "Error",
          description: "Failed to remove exercise. Please try again.",
          primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      console.error("Error removing exercise:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to remove exercise. Please try again.",
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    }
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
        excludeId:
          currentView === "replace" ? currentExercise?.exercise.id : undefined,
        userEquipmentOnly: selectedEquipment.length === 0, // Only use user equipment if no manual equipment filter
        limit: 20,
      });

      if (result.success) {
        setSearchResults(result.exercises);
      } else {
        setSearchResults([]);
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
      }
    } catch (error) {
      console.error("Search exercises error:", error);
      setSearchResults([]);
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
        // Return to main view immediately, refresh data in background
        setCurrentView("main");
        setCurrentExercise(null);
        setSelectedExercise(null);
        setSearchQuery("");
        refreshWorkout();
      } else {
        setDialogConfig({
          title: "Error",
          description: "Failed to replace exercise. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      console.error("Error replacing exercise:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to replace exercise. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setReplacing(false);
    }
  };

  const handleAddExercise = (blockId: number) => {
    if (!planDay) return;
    setAddingToBlock({ blockId, planDayId: planDay.id });
    setSelectedExercise(null);
    setSearchQuery("");
    setSelectedEquipment([]);
    setSelectedMuscleGroups([]);
    setSelectedDifficulty(null);
    setAddParams({
      sets: "",
      reps: "",
      weight: "",
      duration: "",
      restTime: "",
    });
    setCurrentView("add");
  };

  const handleConfirmAdd = async () => {
    if (!selectedExercise || !addingToBlock || !planDay) return;

    setAddingExercise(true);
    try {
      // Calculate the next order number
      const block = planDay.blocks.find((b) => b.id === addingToBlock.blockId);
      const maxOrder =
        block?.exercises.reduce((max, ex) => Math.max(max, ex.order || 0), 0) ||
        0;

      const result = await addExerciseToBlock(addingToBlock.planDayId, {
        workoutBlockId: addingToBlock.blockId,
        exerciseId: selectedExercise.id,
        sets: addParams.sets ? parseInt(addParams.sets, 10) : null,
        reps: addParams.reps ? parseInt(addParams.reps, 10) : null,
        weight: addParams.weight ? parseFloat(addParams.weight) : null,
        duration: addParams.duration ? parseInt(addParams.duration, 10) : null,
        restTime: addParams.restTime ? parseInt(addParams.restTime, 10) : null,
        order: maxOrder + 1,
      });

      if (result?.success) {
        // Return to main view immediately, refresh data in background
        setCurrentView("main");
        setAddingToBlock(null);
        setSelectedExercise(null);
        setAddParams({
          sets: "",
          reps: "",
          weight: "",
          duration: "",
          restTime: "",
        });
        setSearchQuery("");
        refreshWorkout();
      } else {
        setDialogConfig({
          title: "Error",
          description: "Failed to add exercise. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      console.error("Error adding exercise:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to add exercise. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setAddingExercise(false);
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

  // Muscle groups are one-per-array-element and clean (verified in prod), so
  // display them directly — the old comma-split defensive code was dead and
  // would have masked a future regression (per handoff cleanup).
  const displayMuscleGroups = (muscleGroups: string[] | undefined) => {
    if (!muscleGroups || !Array.isArray(muscleGroups)) return [];
    return [...new Set(muscleGroups.map((m) => formatEnumValue(m)))];
  };

  const handleCancel = () => {
    if (currentView === "replace") {
      setCurrentView("main");
      setCurrentExercise(null);
      setSelectedExercise(null);
      return;
    }

    if (currentView === "editParams") {
      setCurrentView("main");
      setCurrentExercise(null);
      setAddParams({
        sets: "",
        reps: "",
        weight: "",
        duration: "",
        restTime: "",
      });
      return;
    }

    if (currentView === "add") {
      setCurrentView("main");
      setAddingToBlock(null);
      setSelectedExercise(null);
      setAddParams({
        sets: "",
        reps: "",
        weight: "",
        duration: "",
        restTime: "",
      });
      return;
    }

    onClose();
  };

  if (!planDay) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <SafeAreaView
          edges={["top"]}
          className={`flex-1 justify-center items-center bg-background ${isDark ? "dark" : ""}`}
        >
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
            <Text className="text-neutral-white font-semibold">Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  const totalExercises = planDay.blocks.reduce(
    (total, block) => total + (block.exercises?.length || 0),
    0
  );

  // Sets/Reps/Weight/Duration/Rest inputs, bound to `addParams`. Shared by the
  // Add-exercise view and the Edit-params view so the two stay identical.
  const paramInputs = (
    <>
      <Text className="text-base font-semibold text-text-primary mb-4">
        Exercise Parameters
      </Text>

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-text-secondary mb-1">
            Sets
          </Text>
          <TextInput
            className="border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary bg-surface"
            placeholder="e.g. 3"
            placeholderTextColor={colors.text.muted}
            value={addParams.sets}
            onChangeText={(v) => setAddParams((p) => ({ ...p, sets: v }))}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-text-secondary mb-1">
            Reps
          </Text>
          <TextInput
            className="border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary bg-surface"
            placeholder="e.g. 10"
            placeholderTextColor={colors.text.muted}
            value={addParams.reps}
            onChangeText={(v) => setAddParams((p) => ({ ...p, reps: v }))}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-text-secondary mb-1">
          Weight (lbs)
        </Text>
        <TextInput
          className="border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary bg-surface"
          placeholder="e.g. 135"
          placeholderTextColor={colors.text.muted}
          value={addParams.weight}
          onChangeText={(v) => setAddParams((p) => ({ ...p, weight: v }))}
          keyboardType="decimal-pad"
        />
      </View>

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-text-secondary mb-1">
            Duration (sec)
          </Text>
          <TextInput
            className="border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary bg-surface"
            placeholder="e.g. 30"
            placeholderTextColor={colors.text.muted}
            value={addParams.duration}
            onChangeText={(v) => setAddParams((p) => ({ ...p, duration: v }))}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-text-secondary mb-1">
            Rest (sec)
          </Text>
          <TextInput
            className="border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary bg-surface"
            placeholder="e.g. 60"
            placeholderTextColor={colors.text.muted}
            value={addParams.restTime}
            onChangeText={(v) => setAddParams((p) => ({ ...p, restTime: v }))}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text className="text-xs text-text-muted italic mt-1">
        Fill in the relevant fields. Leave empty if not applicable.
      </Text>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <SafeAreaView edges={["top"]} className="flex-1">
        <KeyboardAvoidingView
          className={`flex-1 ${isDark ? "dark" : ""}`}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 bg-background">
            {/* Header */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
                <TouchableOpacity
                  onPress={handleCancel}
                  className="size-8 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color={colors.text.muted} />
                </TouchableOpacity>
                <Text className="text-base font-semibold text-text-primary">
                  {currentView === "main"
                    ? "Edit Exercises"
                    : currentView === "replace"
                      ? "Replace Exercise"
                      : currentView === "editParams"
                        ? "Edit Sets & Reps"
                        : "Add Exercise"}
                </Text>
                <View className="w-8" />
              </View>
            </TouchableWithoutFeedback>

            {/* Content */}
            {currentView === "main" && (
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
                <View className="px-5 py-4 bg-surface border-b border-neutral-medium-1">
                  {/* Workout Name */}
                  <Text className="text-xl font-bold mb-3 text-text-primary">
                    {planDay.description || planDay.name || "Workout"}
                  </Text>

                  {/* Workout Instructions */}
                  {planDay.instructions && (
                    <Text className="text-sm mb-4 italic leading-5 text-text-secondary">
                      {planDay.instructions}
                    </Text>
                  )}

                  {/* Edit Instructions */}
                  <Text className="text-sm mb-4 italic leading-5 text-text-secondary">
                    Tap an exercise to replace it, remove it, or stop it coming
                    back.
                  </Text>

                  {/* Workout Details — outline chips (MF-006: data reads as
                      outline, ink is reserved for the primary action). */}
                  <View className="flex-row flex-wrap items-center">
                    <OutlineChip label={`${totalExercises} exercises`} />
                    <OutlineChip
                      label={formatWorkoutDuration(
                        calculatePlanDayDuration(planDay)
                      )}
                    />
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
                            onAddExercise={handleAddExercise}
                          />
                        </View>
                      ))
                  ) : (
                    <View className="p-6 rounded-xl items-center bg-brand-light-1">
                      <Text className="text-base font-bold mb-2 text-text-primary">
                        No Exercises
                      </Text>
                      <Text className="text-sm text-center leading-5 text-text-muted">
                        This workout doesn't have any exercises to edit.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {currentView === "replace" && (
              /* Exercise Replacement View */
              <View className="flex-1">
                {/* Current Exercise Section */}
                <View className="px-5 py-4 bg-surface">
                  {currentExercise && (
                    <>
                      {/* Exercise Name */}
                      <Text className="text-xl font-bold mb-3 text-text-primary">
                        {currentExercise.exercise.name}
                      </Text>

                      {/* Instructions */}
                      {currentExercise.exercise.instructions ? (
                        <Text className="text-sm mb-4 italic leading-5 text-text-secondary">
                          {currentExercise.exercise.instructions}
                        </Text>
                      ) : (
                        <Text className="text-sm mb-4 italic leading-5 text-text-muted">
                          No instructions available
                        </Text>
                      )}

                      {/* Exercise Details (sets/reps/weight) */}
                      <Text className="text-sm mb-4 italic leading-5 text-text-secondary">
                        {formatExerciseDetails(currentExercise)}
                      </Text>

                      {/* Exercise details — outline chips (MF-006). */}
                      <View className="flex-row flex-wrap items-center">
                        {displayMuscleGroups(
                          currentExercise.exercise.muscles_targeted
                        ).map((muscle) => (
                          <OutlineChip key={muscle} label={muscle} />
                        ))}
                        {currentExercise.exercise.equipment && (
                          <OutlineChip
                            label={formatEquipment(
                              currentExercise.exercise.equipment
                            )}
                          />
                        )}
                      </View>
                    </>
                  )}
                </View>

                {/* Separator Line */}
                <View className="h-px mx-5 bg-neutral-medium-1" />

                {/* Search Section */}
                <View className="flex-1">
                  {/* Search Header and Input */}
                  <View className="px-5 py-4 bg-surface">
                    {/* Search Input Row */}
                    <View className="flex-row items-center gap-3">
                      {/* Search Input */}
                      <View className="flex-1 flex-row items-center rounded-xl px-4 py-3 bg-neutral-light-2">
                        <Ionicons
                          name="search"
                          size={20}
                          color={colors.text.muted}
                        />
                        <TextInput
                          ref={searchInputRef}
                          className="flex-1 ml-3 text-base text-text-primary"
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
                              : colors.surface,
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
                              ? colors.contentOnPrimary
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
                                ? colors.contentOnPrimary
                                : colors.brand.primary,
                          }}
                        >
                          Filter
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Separator Line */}
                  <View className="h-px mx-5 bg-neutral-medium-1" />

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
                                : "bg-surface border-neutral-medium-1"
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

                                {/* Exercise details — outline chips (MF-006). */}
                                <View className="flex-row flex-wrap items-center mb-1">
                                  {displayMuscleGroups(item.muscleGroups)
                                    .slice(0, 2)
                                    .map((muscle) => (
                                      <OutlineChip key={muscle} label={muscle} />
                                    ))}
                                  {displayMuscleGroups(item.muscleGroups).length >
                                    2 && (
                                    <OutlineChip
                                      label={`+${
                                        displayMuscleGroups(item.muscleGroups)
                                          .length - 2
                                      }`}
                                    />
                                  )}
                                  {item.equipment && (
                                    <OutlineChip
                                      label={formatEquipment(item.equipment)}
                                    />
                                  )}
                                </View>
                              </View>

                              {/* Selection Indicator */}
                              {selectedExercise?.id === item.id && (
                                <View className="ml-3">
                                  <View className="size-6 bg-brand-primary rounded-full items-center justify-center">
                                    <Ionicons
                                      name="checkmark"
                                      size={14}
                                      color={colors.neutral.white}
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
                  <View className="px-5 py-4 border-t border-neutral-light-2 mb-4">
                    <TouchableOpacity
                      className="bg-primary py-4 rounded-xl items-center"
                      onPress={handleConfirmReplace}
                      disabled={replacing}
                    >
                      {replacing ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.neutral.white}
                        />
                      ) : (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="swap-horizontal"
                            size={20}
                            color={colors.neutral.white}
                          />
                          <Text className="text-neutral-white font-semibold text-lg ml-2">
                            Replace Exercise
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {currentView === "add" && (
              /* Add Exercise View */
              <View className="flex-1 pb-4">
                {/* Search Section */}
                <View className="flex-1">
                  {/* Search Header and Input */}
                  <View className="px-5 py-4 bg-surface">
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1 flex-row items-center rounded-xl px-4 py-3 bg-neutral-light-2">
                        <Ionicons
                          name="search"
                          size={20}
                          color={colors.text.muted}
                        />
                        <TextInput
                          ref={searchInputRef}
                          className="flex-1 ml-3 text-base text-text-primary"
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

                      <TouchableOpacity
                        className="flex-row items-center justify-center px-4 py-3 rounded-xl border"
                        style={{
                          backgroundColor:
                            selectedEquipment.length > 0 ||
                            selectedMuscleGroups.length > 0 ||
                            selectedDifficulty
                              ? colors.brand.primary
                              : colors.surface,
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
                              ? colors.contentOnPrimary
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
                                ? colors.contentOnPrimary
                                : colors.brand.primary,
                          }}
                        >
                          Filter
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="h-px mx-5 bg-neutral-medium-1" />

                  {/* Search Results or Parameter Form */}
                  <View className="flex-1">
                    {selectedExercise ? (
                      /* Parameter Form after selecting an exercise */
                      <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 20 }}
                        keyboardShouldPersistTaps="handled"
                      >
                        {/* Selected Exercise Card */}
                        <View className="p-4 rounded-xl border border-brand-primary mb-5 bg-surface">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-text-primary">
                                {selectedExercise.name}
                              </Text>
                              {selectedExercise.description && (
                                <Text className="text-sm text-text-muted mt-1">
                                  {selectedExercise.description}
                                </Text>
                              )}
                            </View>
                            <TouchableOpacity
                              onPress={() => setSelectedExercise(null)}
                              className="ml-3 size-8 rounded-full bg-neutral-light-2 items-center justify-center"
                            >
                              <Ionicons
                                name="close"
                                size={16}
                                color={colors.text.muted}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Parameter Inputs (shared with the Edit view) */}
                        {paramInputs}
                      </ScrollView>
                    ) : searching ? (
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
                            className="mb-3 p-4 rounded-xl border bg-surface border-neutral-medium-1"
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
                                <View className="flex-row flex-wrap items-center mb-1">
                                  {displayMuscleGroups(item.muscleGroups)
                                    .slice(0, 2)
                                    .map((muscle) => (
                                      <OutlineChip key={muscle} label={muscle} />
                                    ))}
                                  {displayMuscleGroups(item.muscleGroups).length >
                                    2 && (
                                    <OutlineChip
                                      label={`+${
                                        displayMuscleGroups(item.muscleGroups)
                                          .length - 2
                                      }`}
                                    />
                                  )}
                                  {item.equipment && (
                                    <OutlineChip
                                      label={formatEquipment(item.equipment)}
                                    />
                                  )}
                                </View>
                              </View>
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

                {/* Add Exercise Button */}
                {selectedExercise && (
                  <View className="px-5 py-4 border-t border-neutral-light-2">
                    <TouchableOpacity
                      className="bg-primary py-4 rounded-xl items-center"
                      onPress={handleConfirmAdd}
                      disabled={addingExercise}
                    >
                      {addingExercise ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.neutral.white}
                        />
                      ) : (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="add-circle"
                            size={20}
                            color={colors.neutral.white}
                          />
                          <Text className="text-neutral-white font-semibold text-lg ml-2">
                            Add Exercise
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {currentView === "editParams" && currentExercise && (
              /* Edit Sets & Reps View — same inputs as Add, pre-filled */
              <View className="flex-1">
                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{ padding: 20 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text className="text-lg font-bold text-text-primary mb-1">
                    {currentExercise.exercise.name}
                  </Text>
                  <Text className="text-sm text-text-muted mb-6">
                    Adjust the targets for this exercise.
                  </Text>
                  {paramInputs}
                </ScrollView>
                <View className="px-5 py-4 border-t border-neutral-light-2">
                  <TouchableOpacity
                    className="bg-primary py-4 rounded-xl items-center"
                    onPress={handleSaveParams}
                    disabled={savingParams}
                  >
                    {savingParams ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.neutral.white}
                      />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.neutral.white}
                        />
                        <Text className="text-neutral-white font-semibold text-lg ml-2">
                          Save changes
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={cancelFilters}
        statusBarTranslucent
      >
        <SafeAreaView
          edges={["top"]}
          className={`flex-1 bg-background ${isDark ? "dark" : ""}`}
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
            <TouchableOpacity onPress={cancelFilters}>
              <Text className="text-base font-medium text-text-muted">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-text-primary">
              Filters
            </Text>
            <TouchableOpacity onPress={applyFilters}>
              <Text className="text-base font-medium text-primary">Apply</Text>
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
                <Text className="text-base font-semibold text-text-primary">
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
                        : colors.surface,
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
                          ? colors.contentOnPrimary
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
                    className="mt-3 py-2 px-4 rounded-lg self-start bg-neutral-light-1"
                  >
                    <Text className="text-sm font-medium text-primary">
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
                  <Text className="text-base font-semibold text-text-primary">
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
                    className="px-3 py-2 border border-neutral-medium-1 rounded-lg text-sm text-text-primary"
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
                        : colors.surface,
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
                          ? colors.contentOnPrimary
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
                    className="mt-3 py-2 px-4 rounded-lg self-start bg-neutral-light-1"
                  >
                    <Text className="text-sm font-medium text-primary">
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
                <Text className="text-base font-semibold text-text-primary">
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
                          : colors.surface,
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
                            ? colors.contentOnPrimary
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
                <Text className="text-base font-medium text-primary">
                  Clear all filters
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 1a — three-door action sheet */}
      <ExerciseActionSheet
        visible={!!actionSheetExercise}
        exerciseName={actionSheetExercise?.exercise.name ?? ""}
        contextLine={
          actionSheetExercise
            ? formatExerciseDetails(actionSheetExercise)
            : undefined
        }
        onEditParams={() => {
          const ex = actionSheetExercise;
          setActionSheetExercise(null);
          if (ex) startEditParams(ex);
        }}
        onReplace={() => {
          const ex = actionSheetExercise;
          setActionSheetExercise(null);
          if (ex) startReplace(ex);
        }}
        onRemoveToday={() => {
          const ex = actionSheetExercise;
          setActionSheetExercise(null);
          if (ex) removeFromToday(ex);
        }}
        onNeverPrescribe={() => {
          const ex = actionSheetExercise;
          setActionSheetExercise(null);
          // Defer opening the flow modal until the sheet has dismissed —
          // presenting a new modal in the same tick orphans the iOS pageSheet.
          setTimeout(() => setExclusionExercise(ex), 300);
        }}
        onClose={() => setActionSheetExercise(null)}
      />

      {/* 1c–1f — self-contained exclusion flow (door three) */}
      <ExclusionFlow
        visible={!!exclusionExercise}
        exercise={exclusionExercise}
        source="workout-edit"
        onClose={() => setExclusionExercise(null)}
        onDone={() => {
          setExclusionExercise(null);
          setCurrentView("main");
          setCurrentExercise(null);
          refreshWorkout();
        }}
        onSearchInstead={() => {
          const ex = exclusionExercise;
          setExclusionExercise(null);
          // The exclusion is already committed and its slot still holds the
          // original today; drop the user into the normal replace search for it.
          setTimeout(() => ex && startReplace(ex), 300);
        }}
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
    </Modal>
  );
}
