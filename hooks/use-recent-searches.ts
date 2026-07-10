import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

// [MF-019] Recent search history for the search screen's initial state --
// last 5 exercise queries and last 5 searched dates, most recent first.
const EXERCISE_QUERIES_KEY = "@recent_search_exercise_queries";
const DATES_KEY = "@recent_search_dates";
const MAX_ITEMS = 5;

async function loadList(key: string): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveList(key: string, items: string[]): void {
  AsyncStorage.setItem(key, JSON.stringify(items)).catch(() => {});
}

// Exported for direct unit testing -- pure, no AsyncStorage/hook involved.
export function addToList(existing: string[], value: string): string[] {
  const deduped = existing.filter((item) => item !== value);
  return [value, ...deduped].slice(0, MAX_ITEMS);
}

export function useRecentSearches() {
  const [recentExerciseQueries, setRecentExerciseQueries] = useState<
    string[]
  >([]);
  const [recentDates, setRecentDates] = useState<string[]>([]);

  useEffect(() => {
    loadList(EXERCISE_QUERIES_KEY).then(setRecentExerciseQueries);
    loadList(DATES_KEY).then(setRecentDates);
  }, []);

  const addRecentExerciseQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentExerciseQueries((prev) => {
      const next = addToList(prev, trimmed);
      saveList(EXERCISE_QUERIES_KEY, next);
      return next;
    });
  }, []);

  const addRecentDate = useCallback((isoDate: string) => {
    if (!isoDate) return;
    setRecentDates((prev) => {
      const next = addToList(prev, isoDate);
      saveList(DATES_KEY, next);
      return next;
    });
  }, []);

  return {
    recentExerciseQueries,
    recentDates,
    addRecentExerciseQuery,
    addRecentDate,
  };
}
