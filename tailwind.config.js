/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-brand-secondary) / <alpha-value>)",
          light: {
            1: "rgb(var(--color-brand-light-1) / <alpha-value>)",
            2: "rgb(var(--color-brand-light-2) / <alpha-value>)",
          },
          medium: {
            1: "rgb(var(--color-brand-medium-1) / <alpha-value>)",
            2: "rgb(var(--color-brand-medium-2) / <alpha-value>)",
          },
          dark: {
            1: "rgb(var(--color-brand-dark-1) / <alpha-value>)",
            2: "rgb(var(--color-brand-dark-2) / <alpha-value>)",
            3: "rgb(var(--color-brand-dark-3) / <alpha-value>)",
            4: "rgb(var(--color-brand-dark-4) / <alpha-value>)",
          },
        },
        neutral: {
          white: "rgb(var(--color-neutral-white) / <alpha-value>)",
          light: {
            1: "rgb(var(--color-neutral-light-1) / <alpha-value>)",
            2: "rgb(var(--color-neutral-light-2) / <alpha-value>)",
          },
          medium: {
            1: "rgb(var(--color-neutral-medium-1) / <alpha-value>)",
            2: "rgb(var(--color-neutral-medium-2) / <alpha-value>)",
            3: "rgb(var(--color-neutral-medium-3) / <alpha-value>)",
            4: "rgb(var(--color-neutral-medium-4) / <alpha-value>)",
          },
          dark: {
            1: "rgb(var(--color-neutral-dark-1) / <alpha-value>)",
          },
        },
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        },
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
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
