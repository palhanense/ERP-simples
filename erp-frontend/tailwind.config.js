/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      colors: {
        surface: {
          light: "#f7f7f7",
          dark: "#111111",
        },
        text: {
          light: "#111111",
          dark: "#f5f5f5",
        },
        accent: "#ffffff",
        outline: "#1f1f1f",
      },
      boxShadow: {
        subtle: "0 12px 24px -16px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
