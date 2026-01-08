import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark" | "auto";

export interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

// Default value for when provider isn't available yet (during Expo Router pre-rendering)
const defaultThemeContext: ThemeContextType = {
  mode: "auto",
  isDark: false,
  setThemeMode: () => {},
};

export const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export function useTheme() {
  return useContext(ThemeContext);
}
