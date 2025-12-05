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
        sans: ["Manrope_400Regular", "System", "Arial", "sans-serif"],
        body: ["Manrope_400Regular", "System"],
        heading: ["Manrope_700Bold", "System"],
        regular: ["Manrope_400Regular"],
        medium: ["Manrope_500Medium"],
        semibold: ["Manrope_600SemiBold"],
        bold: ["Manrope_700Bold"],
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
      boxShadow: {
        // React Native compatible shadows
        "rn-sm": "0px 1px 2px rgba(0, 0, 0, 0.1)",
        "rn-md": "0px 2px 4px rgba(0, 0, 0, 0.15)",
        "rn-lg": "0px 4px 10px rgba(0, 0, 0, 0.25)",
        "rn-xl": "0px 8px 20px rgba(0, 0, 0, 0.3)",
        "rn-2xl": "0px 12px 30px rgba(0, 0, 0, 0.35)",
        // Card-specific shadows
        card: "0px 2px 8px rgba(0, 0, 0, 0.12)",
        "card-hover": "0px 4px 12px rgba(0, 0, 0, 0.18)",
        // Button shadows
        button: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        "button-pressed": "0px 1px 2px rgba(0, 0, 0, 0.15)",
      },
    },
  },
  plugins: [
    // Custom React Native shadow plugin
    function ({ addUtilities }) {
      const shadows = {
        ".shadow-rn-sm": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "1",
          "-rn-shadow-opacity": "0.1",
          "-rn-shadow-radius": "2",
          "-rn-elevation": "2",
        },
        ".shadow-rn-md": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "2",
          "-rn-shadow-opacity": "0.15",
          "-rn-shadow-radius": "4",
          "-rn-elevation": "4",
        },
        ".shadow-rn-lg": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "4",
          "-rn-shadow-opacity": "0.25",
          "-rn-shadow-radius": "10",
          "-rn-elevation": "8",
        },
        ".shadow-rn-xl": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "8",
          "-rn-shadow-opacity": "0.3",
          "-rn-shadow-radius": "20",
          "-rn-elevation": "12",
        },
        ".shadow-card": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "2",
          "-rn-shadow-opacity": "0.12",
          "-rn-shadow-radius": "8",
          "-rn-elevation": "4",
        },
        ".shadow-card-hover": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "4",
          "-rn-shadow-opacity": "0.18",
          "-rn-shadow-radius": "12",
          "-rn-elevation": "6",
        },
        ".shadow-button": {
          "-rn-shadow-color": "#000",
          "-rn-shadow-offset-width": "0",
          "-rn-shadow-offset-height": "2",
          "-rn-shadow-opacity": "0.1",
          "-rn-shadow-radius": "4",
          "-rn-elevation": "3",
        },
      };

      addUtilities(shadows);
    },
  ],
};
