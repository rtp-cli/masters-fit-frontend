import React, { useState } from "react";
import { colors } from "../lib/theme";
import { View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  imageUrl?: string;
}

interface ExerciseSearchProps {
  exercises: Exercise[];
  onFilterChange: (filteredExercises: Exercise[]) => void;
}

type FilterCategory =
  | "All"
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "No Equipment";

const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  exercises,
  onFilterChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");

  // Filter categories
  const filters: FilterCategory[] = [
    "All",
    "Beginner",
    "Intermediate",
    "Advanced",
    "No Equipment",
  ];

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, activeFilter);
  };

  // Handle filter selection
  const handleFilterSelect = (filter: FilterCategory) => {
    setActiveFilter(filter);
    applyFilters(searchQuery, filter);
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
    applyFilters("", activeFilter);
  };

  // Apply filters to exercises
  const applyFilters = (query: string, filter: FilterCategory) => {
    const filtered = exercises.filter((exercise) => {
      // Filter by search query
      const matchesSearch =
        query === "" ||
        exercise.name.toLowerCase().includes(query.toLowerCase()) ||
        exercise.description.toLowerCase().includes(query.toLowerCase()) ||
        exercise.muscleGroups.some((muscle) =>
          muscle.toLowerCase().includes(query.toLowerCase())
        );

      // Filter by category
      let matchesFilter = true;
      if (
        filter === "Beginner" ||
        filter === "Intermediate" ||
        filter === "Advanced"
      ) {
        matchesFilter = exercise.difficulty === filter.toLowerCase();
      } else if (filter === "No Equipment") {
        matchesFilter =
          exercise.equipment.includes("None") ||
          exercise.equipment.length === 0;
      }

      return matchesSearch && matchesFilter;
    });

    onFilterChange(filtered);
  };

  return (
    <View className="bg-white border-b border-neutral-light-2">
      <View className="p-4">
        <View className="flex-row items-center rounded-lg px-3 py-2.5 bg-neutral-light-1">
          <Ionicons
            name="search"
            size={20}
            color={colors.text.muted}
            className="mr-2"
          />
          <TextInput
            className="flex-1 text-base py-0 text-text-primary"
            placeholder="Search exercises, muscle groups..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={colors.text.muted}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 pb-4"
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            className={`px-4 py-2 rounded-2xl mr-2.5 ${
              activeFilter === filter ? "bg-primary" : "bg-neutral-light-1"
            }`}
            onPress={() => handleFilterSelect(filter)}
          >
            <Text
              variant="bodySmall"
              color={
                activeFilter === filter ? colors.background : colors.text.muted
              }
              weight={activeFilter === filter ? "semibold" : "normal"}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default ExerciseSearch;
