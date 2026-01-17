import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import CircuitTracker from "@/components/circuit-tracker";
import {
  WorkoutBlockWithExercises,
  PlanDayWithBlocks,
} from "@/types/api/workout.types";
import {
  CircuitSessionData,
  CircuitRound,
  UseCircuitSessionReturn,
} from "@/types/api/circuit.types";
import { logCircuitSession, logCircuitRound } from "@/lib/circuits";

interface CircuitLoggingInterfaceProps {
  block: WorkoutBlockWithExercises;
  workout: PlanDayWithBlocks;
  isWorkoutStarted: boolean;
  circuitSession: UseCircuitSessionReturn | null;
  scrollViewRef: React.RefObject<ScrollView | null>;
  circuitHeadingRef: React.RefObject<View | null>;
  onError: (title: string, description: string) => void;
}

export function CircuitLoggingInterface({
  block,
  workout,
  isWorkoutStarted,
  circuitSession,
  scrollViewRef,
  circuitHeadingRef,
  onError,
}: CircuitLoggingInterfaceProps) {
  const colors = useThemeColors();

  if (!circuitSession) {
    return null; // Don't render if no circuit session
  }

  const {
    sessionData,
    currentRoundData,
    metrics,
    actions,
    isLoading,
    canCompleteRound,
    canCompleteCircuit,
    updateTimerState,
  } = circuitSession;

  const handleRoundComplete = async (roundData: CircuitRound) => {
    try {
      await logCircuitRound(workout.workoutId, block.id, roundData);
    } catch (error) {
      onError("Error", "Failed to log round. Please try again.");
    }
  };

  const handleCircuitComplete = async (sessionData: CircuitSessionData) => {
    try {
      // Log the circuit session; advancement is handled by bottom "Complete Circuit"
      await logCircuitSession(workout.workoutId, sessionData);
    } catch (error) {
      console.error("Error completing circuit:", error);
      onError("Error", "Failed to complete circuit. Please try again.");
    }
  };

  // TIMER DISPLAY HIDDEN: Timer display disabled
  const shouldShowTimer = false;

  return (
    <View
      ref={circuitHeadingRef}
      className="bg-card rounded-2xl p-6 border border-neutral-light-2 mb-6"
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-text-primary">
          {block.blockName}
        </Text>
        {block.exercises.some((ex) => ex.exercise.link) && (
          <TouchableOpacity
            onPress={() =>
              scrollViewRef.current?.scrollTo({
                y: 0,
                animated: true,
              })
            }
            className="flex-row items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-full"
          >
            <Ionicons
              name="play-circle-outline"
              size={14}
              color={colors.brand.primary}
            />
            <Text className="text-xs text-brand-primary">Videos Available</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="space-y-6">
        {/* Circuit Tracker */}
        <View className="bg-card rounded-2xl p-6 border border-neutral-light-2">
          <CircuitTracker
            block={block}
            sessionData={sessionData}
            onSessionUpdate={(updatedSessionData) => {
              // Update session data through the hook's actions
              // This is handled internally by the useCircuitSession hook
            }}
            onRoundComplete={handleRoundComplete}
            onCircuitComplete={handleCircuitComplete}
            isActive={isWorkoutStarted}
            circuitActions={actions}
            updateTimerState={updateTimerState}
            shouldShowTimer={shouldShowTimer}
          />
        </View>
      </View>
    </View>
  );
}


