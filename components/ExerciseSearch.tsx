import React, { useState } from "react";
import { colors } from "../lib/theme";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
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
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={colors.text.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
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
        contentContainerStyle={styles.filtersContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.activeFilterButton,
            ]}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.light[2],
  },
  searchBarContainer: {
    padding: 15,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral.light[1],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  filtersContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.neutral.light[1],
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: colors.brand.primary,
  },
});

export default ExerciseSearch;
