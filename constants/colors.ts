import { colors, darkColors } from "@/lib/theme";

// Color constants for charts and UI components

// Chart color palettes - matches pie chart colors for consistency
const CHART_PALETTE = {
  light: [
    colors.brand.medium[2], // #D4E5A1 - soft light green
    colors.brand.dark[1],   // #8CAF25 - lime (line chart color)
    colors.brand.dark[3],   // #668019 - olive
    colors.brand.dark[4],   // #506415 - dark forest
    colors.brand.dark[2],   // #7D9D1F
    colors.brand.dark[5],   // #37460B - darkest
  ],
  dark: [
    "#C5E1A5",   // Light lime
    "#8BC34A",   // Medium green
    "#558B2F",   // Dark green
    darkColors.brand.dark[1],  // #A8D491
    darkColors.brand.dark[3],  // #8CAF25
    darkColors.brand.dark[5],  // #668019
  ],
};

// Static color palette (fallback)
export const DONUT_COLORS = CHART_PALETTE.light;

// Theme-aware chart colors - use in components
export const getDonutColors = (isDark: boolean) => {
  return isDark ? CHART_PALETTE.dark : CHART_PALETTE.light;
};

// Specific pie chart colors (3 segments: As Planned, Progressed, Adapted)
export const getPieChartColors = (isDark: boolean) => {
  if (isDark) {
    // Dark mode: light greens that pop on dark background
    return {
      asPlanned: "#C5E1A5",   // Light lime
      progressed: "#8BC34A",  // Medium green
      adapted: "#558B2F",     // Dark green
    };
  } else {
    // Light mode: muted greens matching app aesthetic
    return {
      asPlanned: colors.brand.medium[2],   // #D4E5A1 - soft light green
      progressed: colors.brand.dark[1],    // #8CAF25 - lime (line chart color)
      adapted: colors.brand.dark[3],       // #668019 - olive
    };
  }
};

// Additional color constants can be added here
export const CHART_COLORS = {
  PRIMARY: colors.brand.primary,
  SECONDARY: colors.brand.secondary,
  SUCCESS: colors.brand.dark[0],
  WARNING: colors.brand.light[1],
  ERROR: colors.brand.medium[1],
} as const;

// Theme-aware chart colors
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