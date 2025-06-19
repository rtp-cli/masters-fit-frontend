import { ViewStyle, TextStyle } from "react-native";

// Brand Colors (from the provided design)
export const colors = {
  brand: {
    primary: "primary",
    secondary: "secondary",
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
    white: "white",
    light: {
      1: "neutral-light-1",
      2: "neutral-light-2",
    },
    medium: {
      1: "neutral-medium-1",
      2: "neutral-medium-2",
      3: "neutral-medium-3",
      4: "text-muted",
    },
    dark: {
      1: "text-secondary",
    },
  },
  text: {
    primary: "secondary",
    secondary: "text-secondary",
    muted: "text-muted",
  },
  background: "white",
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
    xs: 11, // very small text
    sm: 13, // captions/secondary text (Twitter-style)
    base: 15, // body text (Twitter-style)
    lg: 17, // medium headings
    xl: 20, // large headings (Twitter-style)
    "2xl": 24, // extra large headings
    "3xl": 28, // hero text
    "4xl": 32, // display text
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4, // Good for readability
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
