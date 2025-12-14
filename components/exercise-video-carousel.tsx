import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import ExerciseLink from "./exercise-link";
import { WorkoutBlockWithExercise } from "@/types/api/workout.types";

interface ExerciseVideoCarouselProps {
  exercises: WorkoutBlockWithExercise[];
  blockName?: string;
}

interface ExerciseVideoItem {
  exercise: WorkoutBlockWithExercise;
  hasVideo: boolean;
}

const ExerciseVideoCarousel: React.FC<ExerciseVideoCarouselProps> = ({
  exercises,
  blockName = "Exercises",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get("window");

  // Filter exercises that have video links
  const exercisesWithVideos: ExerciseVideoItem[] = exercises
    .map((exercise) => ({
      exercise,
      hasVideo: Boolean(exercise.exercise.link),
    }))
    .filter((item) => item.hasVideo);

  // Don't render if no videos are available
  if (exercisesWithVideos.length === 0) {
    return null;
  }

  const showHeader = blockName && blockName.trim() !== "";
  const cardWidth = showHeader ? screenWidth - 48 : screenWidth; // Full width for hero, account for padding for cards
  const totalVideos = exercisesWithVideos.length;

  const scrollToIndex = (index: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * cardWidth,
        animated: true,
      });
      setCurrentIndex(index);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / cardWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalVideos) {
      setCurrentIndex(newIndex);
    }
  };

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : totalVideos - 1;
    scrollToIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex < totalVideos - 1 ? currentIndex + 1 : 0;
    scrollToIndex(newIndex);
  };

  return (
    <View className="mb-6">
      {/* Header - Only show if blockName is provided */}
      {showHeader && (
        <View className="flex-row items-center justify-between px-6 mb-4">
          <View className="flex-row items-center">
            <View className="bg-brand-primary/10 rounded-full w-8 h-8 items-center justify-center mr-3">
              <Ionicons
                name="play-circle-outline"
                size={18}
                color={colors.brand.primary}
              />
            </View>
            <View>
              <Text className="text-lg font-semibold text-text-primary">
                Exercise Videos
              </Text>
              <Text className="text-xs text-text-muted">
                {totalVideos} video{totalVideos !== 1 ? "s" : ""} available
              </Text>
            </View>
          </View>

          {/* Navigation Controls */}
          {totalVideos > 1 && (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={goToPrevious}
                className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToNext}
                className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Carousel */}
      <View className="relative">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={cardWidth}
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: showHeader ? 24 : 0 }}
        >
          {exercisesWithVideos.map((item, index) => (
            <View
              key={item.exercise.id}
              style={{ width: cardWidth }}
              className="mr-0"
            >
              {showHeader ? (
                <View className="bg-card rounded-2xl border border-neutral-light-2 overflow-hidden">
                  {/* Exercise Info Header */}
                  <View className="p-4 pb-2">
                    <Text className="text-base font-semibold text-text-primary">
                      {item.exercise.exercise.name}
                    </Text>
                    {item.exercise.exercise.description && (
                      <Text
                        className="text-xs text-text-muted mt-1"
                        numberOfLines={2}
                      >
                        {item.exercise.exercise.description}
                      </Text>
                    )}
                  </View>

                  {/* Video */}
                  <View className="px-4 pb-4">
                    <ExerciseLink
                      link={item.exercise.exercise.link}
                      exerciseName={item.exercise.exercise.name}
                      exerciseId={item.exercise.exercise.id}
                      variant="default"
                      showFullVideo={false}
                    />
                  </View>
                </View>
              ) : (
                /* Hero style - full width video */
                <ExerciseLink
                  link={item.exercise.exercise.link}
                  exerciseName={item.exercise.exercise.name}
                  exerciseId={item.exercise.exercise.id}
                  variant="hero"
                  showFullVideo={false}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Overlay Navigation Controls removed for hero; swipe + dots handle navigation */}
      </View>

      {/* Page Indicators */}
      {totalVideos > 1 && (
        <View className="flex-row items-center justify-center mt-4 gap-2">
          {exercisesWithVideos.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex
                  ? "bg-brand-primary"
                  : "bg-neutral-light-2"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ExerciseVideoCarousel;
