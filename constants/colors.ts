import { colors } from "@/lib/theme";

// Color constants for charts and UI components

// Dynamic color palette for donut chart (green gradient from light to dark)
export const DONUT_COLORS = [
  colors.brand.dark[0],
  colors.brand.dark[1],
  colors.brand.dark[2],
  colors.brand.dark[3],
  colors.brand.dark[4],
  colors.brand.dark[5],
];

// Additional color constants can be added here
export const CHART_COLORS = {
  PRIMARY: colors.brand.primary,
  SECONDARY: colors.brand.secondary,
  SUCCESS: colors.brand.dark[0],
  WARNING: colors.brand.light[1],
  ERROR: colors.brand.medium[1],
} as const;