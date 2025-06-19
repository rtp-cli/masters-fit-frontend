/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          1: "#BBDE51",
          2: "#181917",
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
          light: {
            1: "#FBFBFB",
            2: "#F4F4F4",
            3: "#F9FAFB",
            4: "#F3F4F6",
          },
          medium: {
            1: "#E8E8E8",
            2: "#C6C6C6",
            3: "#A8A8A8",
            4: "#8A93A2",
            5: "#9CA3AF",
            6: "#6B7280",
          },
          dark: {
            1: "#525252",
            2: "#4B5563",
            3: "#374151",
            4: "#1F2937",
            5: "#111827",
          },
        },
        // Status colors
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        // Semantic colors
        primary: "#BBDE51",
        secondary: "#181917",
        background: "#FFFFFF",
        white: "#FFFFFF",
        black: "#000000",
        transparent: "transparent",
        // Text colors
        text: {
          primary: "#181917",
          secondary: "#525252",
          muted: "#8A93A2",
          light: "#6B7280",
          white: "#FFFFFF",
        },
        // Special purpose colors
        youtube: "#FF0000",
        overlay: "rgba(0,0,0,0.5)",
        // Activity indicator colors
        activity: "#BBDE51",
        // Slider colors
        slider: {
          track: "#E8E8E8",
          thumb: "#BBDE51",
          active: "#BBDE51",
        },
        // Additional theme colors for comprehensive coverage
        purple: "#8B5CF6",
        pink: "#EC4899",
        orange: "#F97316",
        cyan: "#06B6D4",
        teal: "#14B8A6",
        indigo: "#6366F1",
        // Brand opacities for primary color
        "primary-10": "rgba(187, 222, 81, 0.1)",
        "primary-20": "rgba(187, 222, 81, 0.2)",
        "primary-30": "rgba(187, 222, 81, 0.3)",
        // Additional grays and system colors
        "gray-100": "#f5f5f5",
        "gray-200": "#e5e5e5",
        "gray-300": "#d4d4d4",
        "gray-400": "#a3a3a3",
        "gray-500": "#737373",
        "gray-600": "#525252",
        "gray-700": "#404040",
        "gray-800": "#262626",
        "gray-900": "#171717",
        // Additional utility colors
        "border-light": "#f0f0f0",
        "border-medium": "#e0e0e0",
        shadow: "#000",
        "light-green": "#dcfce7",
        "light-blue": "#dbeafe",
        "green-600": "#16a34a",
        "green-500": "#22c55e",
        "gray-350": "#D1D5DB",
        // Final cleanup colors
        "green-50": "#ecfdf5",
        "stroke-gray": "#e3e3e3",
        "debug-red": "#FF6B6B",
        "border-gray": "#ddd",
        "text-gray": "#333",
        "text-light-gray": "#666",
        "bg-light": "#f9f9f9",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "System", "Arial", "sans-serif"],
        body: ["Inter_400Regular", "System"],
        heading: ["Inter_700Bold", "System"],
        regular: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
      fontSize: {
        xs: "11px",
        sm: "13px",
        base: "15px",
        lg: "17px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "32px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
        "3xl": "48px",
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
