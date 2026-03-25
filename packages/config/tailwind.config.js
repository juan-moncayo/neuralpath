/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [],
  theme: {
    extend: {
      colors: {
        // Paleta NeuralPath — vibrante para niños
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // Naranja principal
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        violet: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6", // Violeta secundario
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        sky: {
          500: "#0ea5e9",
        },
        emerald: {
          500: "#10b981",
        },
        rose: {
          500: "#f43f5e",
        },
      },
      fontFamily: {
        display: ["Fredoka One", "cursive"],
        body: ["Nunito", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        "pulse-slow": "pulse 3s infinite",
        "wiggle": "wiggle 0.5s ease-in-out",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
    },
  },
  plugins: [],
};
