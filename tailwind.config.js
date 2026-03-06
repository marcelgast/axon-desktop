/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        axon: {
          // Matches the dashboard dark-mode palette (globals.css)
          50:   "#f0fdf9", // teal-50 — light tint
          500:  "#2dd4bf", // --brand (teal)
          600:  "#14b8a6", // --brand-strong (teal hover)
          800:  "#161b22", // --panel
          900:  "#0d1117", // --bg (main background)
          line: "#30363d", // --line (borders / dividers)
          muted:"#8b949e", // --muted (secondary text)
        },
      },
    },
  },
  plugins: [],
};
