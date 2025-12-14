import { useCallback } from "react";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";

export const useDataPreload = () => {
  const { user } = useAuth();
  const { refresh } = useAppDataContext();

  const preloadAllData = useCallback(async () => {
    if (!user?.id) {
      console.error("No user ID available for data preloading");
      return;
    }

    try {
      // Use the centralized refresh function to load all data
      await refresh.refreshAll();
    } catch (error) {
      console.error("Data preload failed:", error);
    }
  }, [user?.id, refresh.refreshAll]);

  return {
    preloadAllData,
  };
};
