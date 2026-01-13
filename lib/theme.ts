import { vars } from "nativewind";

// ============================================
// Theme Key Type - All 8 theme variants
// ============================================
export type ThemeKey =
  | "original-light"
  | "original-dark"
  | "steel-blue-light"
  | "steel-blue-dark"
  | "dusty-denim-light"
  | "dusty-denim-dark"
  | "dusty-sage-light"
  | "dusty-sage-dark"
  | "carbon-violet-light"
  | "carbon-violet-dark";

// Helper: Convert hex color to RGB values string for CSS variables
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0 0";
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

// ============================================
// THEME: Original (Lime Green)
// ============================================
export const colors = {
  brand: {
    primary: "#9BB875",
    secondary: "#181917",
    light: {
      1: "#E5EFD4",
      2: "#F0F9D3",
    },
    medium: {
      1: "#E8F8B8",
      2: "#D4E5A1",
    },
    dark: {
      0: "#98BE26",
      1: "#8CAF25",
      2: "#7D9D1F",
      3: "#668019",
      4: "#506415",
      5: "#37460B",
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
  background: "#F8FAF5",
  surface: "#F8FAF5",
  danger: "#EF4444",
  warning: "#F59E0B",
  contentOnPrimary: "#FFFFFF",
} as const;

export const darkColors = {
  brand: {
    primary: "#B8E5A1",
    secondary: "#F5F8F7",
    light: {
      1: "#5A7350",
      2: "#647D5A",
    },
    medium: {
      1: "#3C3C3C",
      2: "#505050",
    },
    dark: {
      0: "#B8E5A1",
      1: "#A8D491",
      2: "#9BB875",
      3: "#8CAF25",
      4: "#7D9D1F",
      5: "#668019",
    },
  },
  neutral: {
    white: "#181917",
    light: {
      1: "#282828",
      2: "#323232",
    },
    medium: {
      1: "#3A3A3A",
      2: "#646464",
      3: "#787878",
      4: "#8A8A8A",
    },
    dark: {
      1: "#A8A8A8",
    },
  },
  text: {
    primary: "#F5F8F7",
    secondary: "#C6C6C6",
    muted: "#8A93A2",
  },
  background: "#181917",
  surface: "#181917",
  danger: "#FF6B6B",
  warning: "#FBBF24",
  contentOnPrimary: "#181917",
} as const;

// ============================================
// THEME: Steel Blue
// ============================================
export const steelBlueColors = {
  brand: {
    primary: "#5A7A94",
    secondary: "#1C1D1F",
    light: {
      1: "#D6E5F3",
      2: "#DCE8F5",
    },
    medium: {
      1: "#B4C8DC",
      2: "#9DB8D0",
    },
    dark: {
      0: "#7A9BB8",
      1: "#5A7A94",
      2: "#4A6680",
      3: "#3A526A",
      4: "#2A3E54",
      5: "#1E2D3E",
    },
  },
  neutral: {
    white: "#FFFFFF",
    light: {
      1: "#F5F7F9",
      2: "#EBEEF2",
    },
    medium: {
      1: "#D2D7DE",
      2: "#B4BAC4",
      3: "#8C94A2",
      4: "#6E7887",
    },
    dark: {
      1: "#464B55",
    },
  },
  text: {
    primary: "#1C1D1F",
    secondary: "#464B55",
    muted: "#6E7887",
  },
  background: "#F2F4F7",
  surface: "#F2F4F7",
  danger: "#DC5050",
  warning: "#D2A03C",
  contentOnPrimary: "#FFFFFF",
} as const;

export const steelBlueDarkColors = {
  brand: {
    primary: "#7A9BB8",
    secondary: "#F0F3F6",
    light: {
      1: "#242A34",
      2: "#2D3440",
    },
    medium: {
      1: "#374150",
      2: "#465569",
    },
    dark: {
      0: "#7A9BB8",
      1: "#8CAAC6",
      2: "#9DB8D0",
      3: "#AFC6DA",
      4: "#C0D2E4",
      5: "#D4E2EE",
    },
  },
  neutral: {
    white: "#1C1D1F",
    light: {
      1: "#242527",
      2: "#2D2E30",
    },
    medium: {
      1: "#37383C",
      2: "#55585F",
      3: "#737882",
      4: "#9196A0",
    },
    dark: {
      1: "#B4B9C3",
    },
  },
  text: {
    primary: "#F0F3F6",
    secondary: "#B4B9C3",
    muted: "#737882",
  },
  background: "#171A1E",
  surface: "#171A1E",
  danger: "#F06E6E",
  warning: "#F0BE50",
  contentOnPrimary: "#171A1E",
} as const;

// ============================================
// THEME: Dusty Denim
// ============================================
export const dustyDenimColors = {
  brand: {
    primary: "#5C6D7E",
    secondary: "#19191B",
    light: {
      1: "#D8E1ED",
      2: "#DAE4F0",
    },
    medium: {
      1: "#B4C3D4",
      2: "#9BACC0",
    },
    dark: {
      0: "#7A8A9A",
      1: "#5C6D7E",
      2: "#4B5A6C",
      3: "#3A4858",
      4: "#2A3644",
      5: "#1E2834",
    },
  },
  neutral: {
    white: "#FFFFFF",
    light: {
      1: "#F6F7F9",
      2: "#ECEEF2",
    },
    medium: {
      1: "#D4D8DE",
      2: "#B6BCC6",
      3: "#8E96A2",
      4: "#707A88",
    },
    dark: {
      1: "#484E58",
    },
  },
  text: {
    primary: "#19191B",
    secondary: "#484E58",
    muted: "#707A88",
  },
  background: "#EFF1F5",
  surface: "#EFF1F5",
  danger: "#DA5252",
  warning: "#D09E3A",
  contentOnPrimary: "#FFFFFF",
} as const;

export const dustyDenimDarkColors = {
  brand: {
    primary: "#8B9CAE",
    secondary: "#F2F4F6",
    light: {
      1: "#26282D",
      2: "#30343A",
    },
    medium: {
      1: "#3A4048",
      2: "#4B5562",
    },
    dark: {
      0: "#8B9CAE",
      1: "#9BAABA",
      2: "#ABB8C6",
      3: "#BCC6D2",
      4: "#CDD4DE",
      5: "#DEE6EC",
    },
  },
  neutral: {
    white: "#19191B",
    light: {
      1: "#212123",
      2: "#2A2A2D",
    },
    medium: {
      1: "#343438",
      2: "#52555C",
      3: "#707680",
      4: "#8E949E",
    },
    dark: {
      1: "#B2B6C0",
    },
  },
  text: {
    primary: "#F2F4F6",
    secondary: "#B2B6C0",
    muted: "#707680",
  },
  background: "#16171A",
  surface: "#16171A",
  danger: "#EE6C6C",
  warning: "#EEBC4E",
  contentOnPrimary: "#16171A",
} as const;

// ============================================
// THEME: Dusty Sage
// ============================================
export const dustySageColors = {
  brand: {
    primary: "#6E806B",
    secondary: "#1B1C1B",
    light: {
      1: "#DCE8DA",
      2: "#DEEBDC",
    },
    medium: {
      1: "#C0D4BC",
      2: "#A5BCA2",
    },
    dark: {
      0: "#8A9E87",
      1: "#6E806B",
      2: "#5A6C58",
      3: "#485846",
      4: "#374436",
      5: "#283228",
    },
  },
  neutral: {
    white: "#FFFFFF",
    light: {
      1: "#F6F8F6",
      2: "#ECF0EC",
    },
    medium: {
      1: "#D4DAD4",
      2: "#B6BEB6",
      3: "#8E988E",
      4: "#707C70",
    },
    dark: {
      1: "#485048",
    },
  },
  text: {
    primary: "#1B1C1B",
    secondary: "#485048",
    muted: "#707C70",
  },
  background: "#F3F4F3",
  surface: "#F3F4F3",
  danger: "#D25555",
  warning: "#C89E3C",
  contentOnPrimary: "#FFFFFF",
} as const;

export const dustySageDarkColors = {
  brand: {
    primary: "#94A891",
    secondary: "#F2F4F2",
    light: {
      1: "#262A26",
      2: "#303630",
    },
    medium: {
      1: "#3A423A",
      2: "#4B584B",
    },
    dark: {
      0: "#94A891",
      1: "#A5B6A2",
      2: "#B5C4B2",
      3: "#C6D2C3",
      4: "#D7E0D4",
      5: "#E8EEE5",
    },
  },
  neutral: {
    white: "#181918",
    light: {
      1: "#232423",
      2: "#2C2E2C",
    },
    medium: {
      1: "#363836",
      2: "#525852",
      3: "#707870",
      4: "#8E988E",
    },
    dark: {
      1: "#B2BAB2",
    },
  },
  text: {
    primary: "#F2F4F2",
    secondary: "#B2BAB2",
    muted: "#707870",
  },
  background: "#181918",
  surface: "#181918",
  danger: "#EB6E6E",
  warning: "#EBBC50",
  contentOnPrimary: "#181918",
} as const;

// ============================================
// THEME: Carbon + Slate Violet
// ============================================
export const carbonVioletColors = {
  brand: {
    primary: "#6B6488",
    secondary: "#1A1A1A",
    light: {
      1: "#E0DCF0",
      2: "#E6E2F2",
    },
    medium: {
      1: "#C8C2DC",
      2: "#AAA4C0",
    },
    dark: {
      0: "#9088A8",
      1: "#6B6488",
      2: "#585273",
      3: "#46415F",
      4: "#34304B",
      5: "#232037",
    },
  },
  neutral: {
    white: "#FFFFFF",
    light: {
      1: "#F5F5F5",
      2: "#ECECEC",
    },
    medium: {
      1: "#D4D4D4",
      2: "#B8B8B8",
      3: "#9CA3AF",
      4: "#6B7280",
    },
    dark: {
      1: "#4B5563",
    },
  },
  text: {
    primary: "#1A1A1A",
    secondary: "#4B5563",
    muted: "#6B7280",
  },
  background: "#F5F5F5",
  surface: "#F5F5F5",
  danger: "#C8555F",
  warning: "#C8A04B",
  contentOnPrimary: "#FFFFFF",
} as const;

export const carbonVioletDarkColors = {
  brand: {
    primary: "#9088A8",
    secondary: "#F5F5F5",
    light: {
      1: "#1C1A23",
      2: "#262330",
    },
    medium: {
      1: "#322E3E",
      2: "#443E55",
    },
    dark: {
      0: "#9088A8",
      1: "#9E96B4",
      2: "#AAA4C0",
      3: "#B9B4CD",
      4: "#C8C4DA",
      5: "#D7D2E7",
    },
  },
  neutral: {
    white: "#121212",
    light: {
      1: "#1A1A1A",
      2: "#242424",
    },
    medium: {
      1: "#2E2E2E",
      2: "#4B4B4B",
      3: "#6B6B6B",
      4: "#8A8A8A",
    },
    dark: {
      1: "#B8B8B8",
    },
  },
  text: {
    primary: "#F5F5F5",
    secondary: "#B8B8B8",
    muted: "#6B6B6B",
  },
  background: "#121212",
  surface: "#121212",
  danger: "#E1737D",
  warning: "#E1B95F",
  contentOnPrimary: "#121212",
} as const;

// ============================================
// Color theme palettes for JS usage
// ============================================
import { useTheme, ColorTheme } from "./theme-context";

export const colorThemes = {
  original: { light: colors, dark: darkColors },
  "steel-blue": { light: steelBlueColors, dark: steelBlueDarkColors },
  "dusty-denim": { light: dustyDenimColors, dark: dustyDenimDarkColors },
  "dusty-sage": { light: dustySageColors, dark: dustySageDarkColors },
  "carbon-violet": { light: carbonVioletColors, dark: carbonVioletDarkColors },
} as const;

// ============================================
// NativeWind vars() Theme Objects
// Each theme variant is a complete standalone theme
// that cascades CSS variables to all children
// ============================================

// Type for theme color palettes (generic to accept any theme)
type ThemeColorPalette = {
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
};

// Helper to generate vars object from a color palette
const createThemeVars = (themeColors: ThemeColorPalette) =>
  vars({
    "--color-brand-primary": hexToRgb(themeColors.brand.primary),
    "--color-brand-secondary": hexToRgb(themeColors.brand.secondary),
    "--color-brand-light-1": hexToRgb(themeColors.brand.light[1]),
    "--color-brand-light-2": hexToRgb(themeColors.brand.light[2]),
    "--color-brand-medium-1": hexToRgb(themeColors.brand.medium[1]),
    "--color-brand-medium-2": hexToRgb(themeColors.brand.medium[2]),
    "--color-brand-dark-0": hexToRgb(themeColors.brand.dark[0]),
    "--color-brand-dark-1": hexToRgb(themeColors.brand.dark[1]),
    "--color-brand-dark-2": hexToRgb(themeColors.brand.dark[2]),
    "--color-brand-dark-3": hexToRgb(themeColors.brand.dark[3]),
    "--color-brand-dark-4": hexToRgb(themeColors.brand.dark[4]),
    "--color-brand-dark-5": hexToRgb(themeColors.brand.dark[5]),
    "--color-neutral-white": hexToRgb(themeColors.neutral.white),
    "--color-neutral-light-1": hexToRgb(themeColors.neutral.light[1]),
    "--color-neutral-light-2": hexToRgb(themeColors.neutral.light[2]),
    "--color-neutral-medium-1": hexToRgb(themeColors.neutral.medium[1]),
    "--color-neutral-medium-2": hexToRgb(themeColors.neutral.medium[2]),
    "--color-neutral-medium-3": hexToRgb(themeColors.neutral.medium[3]),
    "--color-neutral-medium-4": hexToRgb(themeColors.neutral.medium[4]),
    "--color-neutral-dark-1": hexToRgb(themeColors.neutral.dark[1]),
    "--color-text-primary": hexToRgb(themeColors.text.primary),
    "--color-text-secondary": hexToRgb(themeColors.text.secondary),
    "--color-text-muted": hexToRgb(themeColors.text.muted),
    "--color-background": hexToRgb(themeColors.background),
    "--color-surface": hexToRgb(themeColors.surface),
    "--color-danger": hexToRgb(themeColors.danger),
    "--color-warning": hexToRgb(themeColors.warning),
    "--color-success": hexToRgb(themeColors.brand.primary),
    "--color-primary": hexToRgb(themeColors.brand.primary),
    "--color-secondary": hexToRgb(themeColors.brand.secondary),
    "--color-content-on-primary": hexToRgb(themeColors.contentOnPrimary),
  });

// All 8 theme variants - each is a complete standalone theme
export const themes: Record<ThemeKey, ReturnType<typeof vars>> = {
  "original-light": createThemeVars(colors),
  "original-dark": createThemeVars(darkColors),
  "steel-blue-light": createThemeVars(steelBlueColors),
  "steel-blue-dark": createThemeVars(steelBlueDarkColors),
  "dusty-denim-light": createThemeVars(dustyDenimColors),
  "dusty-denim-dark": createThemeVars(dustyDenimDarkColors),
  "dusty-sage-light": createThemeVars(dustySageColors),
  "dusty-sage-dark": createThemeVars(dustySageDarkColors),
  "carbon-violet-light": createThemeVars(carbonVioletColors),
  "carbon-violet-dark": createThemeVars(carbonVioletDarkColors),
};

// Hook to get theme-aware colors for components that need inline color values
// (Ionicons, ActivityIndicator, StatusBar, NavigationBar, etc.)
export function useThemeColors() {
  const { isDark, colorTheme } = useTheme();
  const palette = colorThemes[colorTheme];

  if (isDark) {
    return { ...palette.light, ...palette.dark };
  }
  return palette.light;
}

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
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
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
    normal: 1.4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  "2xl": {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 16,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPressed: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
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

// Responsive breakpoints
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
