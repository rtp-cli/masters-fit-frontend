import { useCallback } from "react";
import { useAppDataContext } from "@contexts/AppDataContext";
import { useAuth } from "@contexts/AuthContext";

export const useDataPreload = () => {
  const { user } = useAuth();
  const { refresh } = useAppDataContext();

  const preloadAllData = useCallback(async () => {
    if (!user?.id) {
      console.error("No user ID available for data preloading");
      return;
    }

    try {
      console.log("🔄 Starting data preload for user:", user.id);

      // Use the centralized refresh function to load all data
      await refresh.refreshAll();
      
      console.log("✅ Data preload completed successfully");
    } catch (error) {
      console.error("❌ Data preload failed:", error);
    }
  }, [user?.id, refresh.refreshAll]);

  return {
    preloadAllData,
  };
};