import React, { createContext, useContext, ReactNode } from "react";
import { useAppData } from "@/hooks/use-app-data";

// Create context
const AppDataContext = createContext<ReturnType<typeof useAppData> | undefined>(undefined);

// Provider component
export function AppDataProvider({ children }: { children: ReactNode }) {
  const appData = useAppData();
  
  return (
    <AppDataContext.Provider value={appData}>
      {children}
    </AppDataContext.Provider>
  );
}

// Custom hook to use the context
export function useAppDataContext() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error("useAppDataContext must be used within an AppDataProvider");
  }
  return context;
}