import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type ColorTheme = "original" | "steel-blue" | "dusty-denim" | "dusty-sage" | "carbon-violet";

export interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colorTheme: ColorTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
}

// Default value for when provider isn't available yet (during Expo Router pre-rendering)
const defaultThemeContext: ThemeContextType = {
  mode: "auto",
  isDark: false,
  colorTheme: "original",
  setThemeMode: () => {},
  setColorTheme: () => {},
};

export const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export function useTheme() {
  return useContext(ThemeContext);
}

// Theme metadata for UI display
export const COLOR_THEMES: { id: ColorTheme; name: string; primaryColor: string }[] = [
  { id: "original", name: "Original", primaryColor: "#9BB875" },
  { id: "steel-blue", name: "Steel Blue", primaryColor: "#5A7A94" },
  { id: "dusty-denim", name: "Dusty Denim", primaryColor: "#5C6D7E" },
  { id: "dusty-sage", name: "Dusty Sage", primaryColor: "#6E806B" },
  { id: "carbon-violet", name: "Carbon Violet", primaryColor: "#6B6488" },
];
