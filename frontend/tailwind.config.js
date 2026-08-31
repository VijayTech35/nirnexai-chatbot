/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#0a0a0f",
          900: "#101018",
          800: "#17171f",
          700: "#23232e",
          DEFAULT: "#10b981",
          dark: "#059669",
          subtle: "#34d399"
        }
      }
    }
  },
  plugins: []
};