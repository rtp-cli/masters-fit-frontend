import { colors, darkColors, colorThemes } from "@/lib/theme";
import { ColorTheme } from "@/lib/theme-context";

// Type for theme colors - generic to accept any theme palette
interface ThemeColorPalette {
  brand: {
    primary: string;
    secondary: string;
    light: { 1: string; 2: string };
    medium: { 1: string; 2: string };
    dark: { 0: string; 1: string; 2: string; 3: string; 4: string; 5: string };
  };
  neutral: {
    white: string;
    light: { 1: string; 2: string };
    medium: { 1: string; 2: string; 3: string; 4: string };
    dark: { 1: string };
  };
  text: { primary: string; secondary: string; muted: string };
  background: string;
  surface: string;
  danger: string;
  warning: string;
  contentOnPrimary: string;
}

// Color constants for charts and UI components

// Generate chart palette from theme colors
const getChartPalette = (themeColors: ThemeColorPalette) => [
  themeColors.brand.medium[2],
  themeColors.brand.dark[1],
  themeColors.brand.dark[3],
  themeColors.brand.dark[4],
  themeColors.brand.dark[2],
  themeColors.brand.dark[5],
];

// Chart color palettes - matches pie chart colors for consistency
const CHART_PALETTE = {
  light: getChartPalette(colors as ThemeColorPalette),
  dark: getChartPalette(darkColors as ThemeColorPalette),
};

// Static color palette (fallback)
export const DONUT_COLORS = CHART_PALETTE.light;

// Theme-aware chart colors - use in components (legacy, for backward compatibility)
export const getDonutColors = (isDark: boolean) => {
  return isDark ? CHART_PALETTE.dark : CHART_PALETTE.light;
};

// NEW: Fully theme-aware donut colors - accepts colorTheme and isDark
export const getThemedDonutColors = (colorTheme: ColorTheme, isDark: boolean) => {
  const palette = colorThemes[colorTheme];
  const themeColors = isDark ? { ...palette.light, ...palette.dark } : palette.light;
  return getChartPalette(themeColors as ThemeColorPalette);
};

// Specific pie chart colors (3 segments: As Planned, Progressed, Adapted)
export const getPieChartColors = (isDark: boolean) => {
  if (isDark) {
    // Dark mode: light greens that pop on dark background
    return {
      asPlanned: darkColors.brand.medium[2],
      progressed: darkColors.brand.dark[1],
      adapted: darkColors.brand.dark[3],
    };
  } else {
    // Light mode: muted greens matching app aesthetic
    return {
      asPlanned: colors.brand.medium[2],
      progressed: colors.brand.dark[1],
      adapted: colors.brand.dark[3],
    };
  }
};

// NEW: Fully theme-aware pie chart colors
export const getThemedPieChartColors = (colorTheme: ColorTheme, isDark: boolean) => {
  const palette = colorThemes[colorTheme];
  const themeColors = isDark ? { ...palette.light, ...palette.dark } : palette.light;
  return {
    asPlanned: themeColors.brand.medium[2],
    progressed: themeColors.brand.dark[1],
    adapted: themeColors.brand.dark[3],
  };
};

// Additional color constants can be added here
export const CHART_COLORS = {
  PRIMARY: colors.brand.primary,
  SECONDARY: colors.brand.secondary,
  SUCCESS: colors.brand.dark[0],
  WARNING: colors.brand.light[1],
  ERROR: colors.brand.medium[1],
} as const;

// Theme-aware chart colors (legacy)
export const getChartColors = (isDark: boolean) => {
  const themeColors = isDark ? darkColors : colors;
  return {
    PRIMARY: themeColors.brand.primary,
    SECONDARY: themeColors.brand.secondary,
    SUCCESS: themeColors.brand.dark[0],
    WARNING: themeColors.brand.light[1],
    ERROR: themeColors.brand.medium[1],
  };
};

// NEW: Fully theme-aware chart colors
export const getThemedChartColors = (colorTheme: ColorTheme, isDark: boolean) => {
  const palette = colorThemes[colorTheme];
  const themeColors = isDark ? { ...palette.light, ...palette.dark } : palette.light;
  return {
    PRIMARY: themeColors.brand.primary,
    SECONDARY: themeColors.brand.secondary,
    SUCCESS: themeColors.brand.dark[0],
    WARNING: themeColors.brand.light[1],
    ERROR: themeColors.brand.medium[1],
  };
};
