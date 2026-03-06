/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        axon: {
          50:  "#f0f4ff",
          500: "#4f6ef7",
          600: "#3b5bf5",
          900: "#1a1f3c",
        },
      },
    },
  },
  plugins: [],
};
