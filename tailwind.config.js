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
        primary: "#BBDE51",
        secondary: "#181917",
        background: "#FFFFFF",
        text: {
          primary: "#181917",
          secondary: "#525252",
          muted: "#8A93A2",
        },
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
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "18px",
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
