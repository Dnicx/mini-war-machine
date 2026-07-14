/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Button variants live in this config as literal Tailwind classes;
    // JIT must scan it so those classes get generated.
    "./src/config/ui.config.json",
  ],
  theme: {
    extend: {
      // RGB channels come from CSS variables so theme presets can swap
      // colors at runtime; <alpha-value> keeps bg-accent/80 etc. working.
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surface2: 'rgb(var(--color-surface2) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        text2: 'rgb(var(--color-text2) / <alpha-value>)'
      }
    },
  },
  plugins: [],
}
