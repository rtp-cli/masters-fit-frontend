/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#9BB875",
          secondary: "#181917",
          light: {
            1: "#F2F6E7",
            2: "#F0F9D3",
          },
          medium: {
            1: "#E8F8B8",
            2: "#D4E5A1",
          },
          dark: {
            1: "#8CAF25",
            2: "#7D9D1F",
            3: "#668019",
            4: "#506415",
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
        primary: "#9BB875",
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
