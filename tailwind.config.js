/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FBBF24",
        dark: "#000000",
        accent: "#6B7280",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
