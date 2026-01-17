import { type Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import ExerciseLink from "@/components/exercise-link";
import ExerciseVideoCarousel from "@/components/exercise-video-carousel";
import type { DialogButton } from "@/components/ui";
import { CustomDialog } from "@/components/ui";

import { CircuitLoggingInterface, CurrentBlockInfo, CurrentExerciseCard, WorkoutActionBar, WorkoutHeader, WorkoutOverview } from "./sections";
import { CompleteExerciseModal, RestCompleteModal, SkipExerciseModal } from "./modals";
import { NoWorkoutState, WorkoutCompletedState, WorkoutErrorState, WorkoutLoadingState } from "./states";

// Hooks
import { useWorkoutSession, } from "@/hooks/use-workout-session";

// Re-export the type from the hook
export type { ExerciseProgress } from "@/hooks/use-workout-session";

export default function WorkoutScreen() {
  const session = useWorkoutSession();

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Helper function to show error dialog
  const showErrorDialog = useCallback((title: string, description: string) => {
    setDialogConfig({
      title,
      description,
      primaryButton: {
        text: "OK",
        onPress: () => setDialogVisible(false),
      },
      icon: "alert-circle",
    });
    setDialogVisible(true);
  }, []);

  // Extract stable references from session
  const {
    handleGenerateNewWorkout: sessionHandleGenerateNewWorkout,
    completeExercise,
    skipCurrentExercise,
    loadWorkout,
    scrollViewRef,
    isWorkoutStarted,
    resetWorkout,
  } = session;

  // Use refs to always have latest functions
  const loadWorkoutRef = useRef(loadWorkout);
  const resetWorkoutRef = useRef(resetWorkout);
  useEffect(() => {
    loadWorkoutRef.current = loadWorkout;
    resetWorkoutRef.current = resetWorkout;
  }, [loadWorkout, resetWorkout]);

  // Handle generate new workout with dialog feedback
  const handleGenerateNewWorkout = useCallback(async () => {
    const result = await sessionHandleGenerateNewWorkout();
    if (result?.error) {
      setDialogConfig({
        title: result.title,
        description: result.description,
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: result.icon,
      });
      setDialogVisible(true);
    }
  }, [sessionHandleGenerateNewWorkout]);

  // Handle complete exercise with dialog feedback
  const handleCompleteExercise = useCallback(async () => {
    const result = await completeExercise();
    if (!result.success && result.error) {
      showErrorDialog(result.error.title, result.error.description);
    } else if (result.workoutComplete) {
      setDialogConfig({
        title: "Workout Complete!",
        description: "Congratulations! You've completed today's workout.",
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: "checkmark-circle",
      });
      setDialogVisible(true);
    }
  }, [completeExercise, showErrorDialog]);

  // Handle skip exercise with dialog feedback
  const handleSkipExercise = useCallback(async () => {
    const result = await skipCurrentExercise();
    if (!result.success && result.error) {
      showErrorDialog(result.error.title, result.error.description);
    } else if (result.workoutComplete) {
      setDialogConfig({
        title: "Workout Complete!",
        description: "You've finished today's workout.",
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: "checkmark-circle",
      });
      setDialogVisible(true);
    }
  }, [skipCurrentExercise, showErrorDialog]);

  // Notification setup
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: false,
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }) as any,
    });

    const requestPermissions = async () => {
      await Notifications.requestPermissionsAsync();
    };
    requestPermissions();
  }, []);

  // Load workout on mount
  useEffect(() => {
    loadWorkoutRef.current();
  }, []);

  // Focus effect - load on focus, reset on blur (leaving tab)
  useFocusEffect(
    useCallback(() => {
      // On focus: load workout data
      loadWorkoutRef.current(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      // Cleanup: reset workout when leaving the tab
      return () => {
        resetWorkoutRef.current();
      };
    }, [scrollViewRef]),
  );

  // Tab re-click scroll
  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const { tabEvents } = require("../../lib/tab-events");
    tabEvents.on("scrollToTop:workout", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:workout", handleScrollToTop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render states
  if (session.loading) {
    return <WorkoutLoadingState />;
  }

  if (session.error) {
    return (
      <WorkoutErrorState
        error={session.error}
        onRetry={() => session.loadWorkout(true)}
      />
    );
  }

  if (!session.workout) {
    return (
      <NoWorkoutState
        hasActiveWorkoutPlan={session.hasActiveWorkoutPlan}
        isGenerating={session.isGenerating}
        refreshing={session.refreshing}
        showRepeatModal={session.showRepeatModal}
        onRefresh={session.onRefresh}
        onRepeatWorkout={() => session.setShowRepeatModal(true)}
        onGenerateWorkout={handleGenerateNewWorkout}
        onCloseRepeatModal={() => session.setShowRepeatModal(false)}
        onRepeatWorkoutSuccess={session.handleRepeatWorkoutSuccess}
      />
    );
  }

  if (session.isWorkoutCompleted) {
    return (
      <WorkoutCompletedState
        exercisesCompleted={
          session.hasCompletedWorkoutDuration
            ? session.completedExercisesCount
            : session.currentExerciseIndex
        }
        skippedCount={session.skippedExercises.length}
        hasCompletedWorkoutDuration={session.hasCompletedWorkoutDuration}
      />
    );
  }

  // Main workout interface
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={session.scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={session.refreshing}
            onRefresh={session.onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Hero Exercise Media */}
        {session.currentExercise && !session.isCurrentBlockCircuit ? (
          <ExerciseLink
            link={session.currentExercise.exercise.link}
            exerciseName={session.currentExercise.exercise.name}
            exerciseId={session.currentExercise.exercise.id}
            variant="hero"
          />
        ) : session.isCurrentBlockCircuit && session.currentBlock ? (
          <ExerciseVideoCarousel
            exercises={session.currentBlock.exercises}
            blockName=""
          />
        ) : null}

        <View className="px-6 pt-6">
          <WorkoutHeader
            workoutName={session.workout.name}
            instructions={session.workout.instructions}
            progressPercent={session.progressPercent}
            workoutTimer={session.timers.workoutTimer}
            isWorkoutStarted={session.isWorkoutStarted}
            formatTime={session.timers.formatTime}
          />

          {session.currentBlock && (
            <CurrentBlockInfo
              block={session.currentBlock}
              isCircuit={session.isCurrentBlockCircuit}
            />
          )}

          {session.currentExercise && !session.isCurrentBlockCircuit && (
            <CurrentExerciseCard
              exercise={session.currentExercise}
              progress={session.currentProgress}
              block={session.currentBlock}
              isWorkoutStarted={session.isWorkoutStarted}
              isWarmupCooldown={session.isCurrentBlockWarmupCooldown}
              scrollViewRef={session.scrollViewRef}
              exerciseHeadingRef={session.exerciseHeadingRef}
              onUpdateProgress={session.updateProgress}
            />
          )}

          {session.isCurrentBlockCircuit &&
            session.currentBlock &&
            session.isWorkoutStarted && (
              <CircuitLoggingInterface
                block={session.currentBlock}
                workout={session.workout}
                isWorkoutStarted={session.isWorkoutStarted}
                circuitSession={session.circuitSession}
                scrollViewRef={session.scrollViewRef}
                circuitHeadingRef={session.circuitHeadingRef}
                onError={showErrorDialog}
              />
            )}

          <WorkoutOverview
            workout={session.workout}
            exercises={session.exercises}
            currentExerciseIndex={session.currentExerciseIndex}
            skippedExercises={session.skippedExercises}
          />
        </View>
      </ScrollView>

      <WorkoutActionBar
        isWorkoutStarted={session.isWorkoutStarted}
        isPaused={session.timers.isPaused}
        isWarmupCooldown={session.isCurrentBlockWarmupCooldown}
        isCircuit={session.isCurrentBlockCircuit}
        onStartWorkout={session.startWorkout}
        onTogglePause={session.timers.togglePause}
        onShowSkipModal={() => session.setShowSkipModal(true)}
        onShowCompleteModal={() => session.setShowCompleteModal(true)}
      />

      {/* Modals */}
      <CompleteExerciseModal
        visible={session.showCompleteModal}
        isCircuit={session.isCurrentBlockCircuit}
        isWarmupCooldown={session.isCurrentBlockWarmupCooldown}
        blockType={session.currentBlock?.blockType}
        blockName={session.currentBlock?.blockName}
        exerciseName={session.currentExercise?.exercise.name}
        isLastExercise={
          session.currentExerciseIndex >= session.exercises.length - 1
        }
        isCompleting={session.isCompletingExercise}
        onClose={() => session.setShowCompleteModal(false)}
        onComplete={handleCompleteExercise}
      />

      <SkipExerciseModal
        visible={session.showSkipModal}
        exerciseName={session.currentExercise?.exercise.name}
        isSkipping={session.isSkippingExercise}
        onClose={() => session.setShowSkipModal(false)}
        onSkip={handleSkipExercise}
      />

      <RestCompleteModal
        visible={session.showRestCompleteModal}
        restTime={session.currentExercise?.restTime}
        currentSetsCount={session.currentProgress?.sets?.length || 0}
        targetSets={session.currentExercise?.sets || 3}
        isCircuit={session.isCurrentBlockCircuit}
        onClose={() => session.setShowRestCompleteModal(false)}
        onContinue={() => session.setShowRestCompleteModal(false)}
        onComplete={() => {
          session.setShowRestCompleteModal(false);
          session.setShowCompleteModal(true);
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
    </View>
  );
}
