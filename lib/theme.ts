import { ViewStyle, TextStyle } from "react-native";

// Brand Colors (from the provided design)
export const colors = {
  brand: {
    primary: "#BBDE51",
    secondary: "#181917",
    light: {
      1: "#F5FAE8",
      2: "#EDF5D1",
    },
    medium: {
      1: "#D6E894",
      2: "#C7E076",
    },
    dark: {
      1: "#A3C842",
      2: "#8BB233",
      3: "#739C24",
      4: "#5B8615",
    },
  },
  neutral: {
    white: "#FFFFFF",
    light: {
      1: "#FBFBFB",
      2: "#F4F4F4",
    },
    medium: {
      1: "#E8E8E8",
      2: "#C6C6C6",
      3: "#A8A8A8",
      4: "#8A93A2",
    },
    dark: {
      1: "#525252",
    },
  },
  text: {
    primary: "#181917",
    secondary: "#525252",
    muted: "#8A93A2",
  },
  background: "#FFFFFF",
} as const;

// Spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 48,
} as const;

// Typography system
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

// Border radius system
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

// Shadow system
export const shadows = {
  sm: {
    shadowColor: colors.neutral.dark[1],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.neutral.dark[1],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.neutral.dark[1],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// Common style utilities
export const flex = {
  center: "items-center justify-center" as const,
  centerVertical: "justify-center" as const,
  centerHorizontal: "items-center" as const,
  spaceBetween: "justify-between" as const,
  spaceAround: "justify-around" as const,
  spaceEvenly: "justify-evenly" as const,
} as const;

// Component-specific theme tokens
export const components = {
  button: {
    primary: {
      base: "bg-primary rounded-md px-6 py-4 flex-row items-center justify-center",
      text: "text-secondary font-semibold text-base",
      disabled: "opacity-70",
    },
    secondary: {
      base: "bg-neutral-light-2 border border-neutral-medium-1 rounded-md px-6 py-4 flex-row items-center justify-center",
      text: "text-text-secondary font-semibold text-base",
      disabled: "opacity-70",
    },
    outline: {
      base: "border border-primary rounded-md px-6 py-4 flex-row items-center justify-center",
      text: "text-primary font-semibold text-base",
      disabled: "opacity-70",
    },
  },
  input: {
    base: "bg-neutral-light-1 border border-neutral-medium-1 rounded-md px-4 py-3 text-base text-text-primary",
    focused: "border-primary",
    error: "border-red-500",
  },
  card: {
    base: "bg-white rounded-lg p-4",
    withShadow: "bg-white rounded-lg p-4 shadow-md",
  },
  option: {
    base: "bg-neutral-light-1 border border-neutral-medium-1 rounded-md p-4 flex-row items-center",
    selected: "bg-primary border-primary",
    text: "text-text-secondary font-medium text-base ml-3",
    selectedText: "text-secondary font-medium text-base ml-3",
  },
} as const;

// Utility function to get theme-based styles
export const getThemeStyle = (path: string): string => {
  const keys = path.split(".");
  let result: any = components;

  for (const key of keys) {
    result = result[key];
    if (!result) return "";
  }

  return typeof result === "string" ? result : "";
};

// Responsive breakpoints (for future use)
export const breakpoints = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  flex,
  components,
  breakpoints,
  getThemeStyle,
};
