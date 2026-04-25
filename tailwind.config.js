/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        surface2: '#0f3460',
        accent: '#e94560',
        text: '#eaeaea',
        text2: '#a0a0a0'
      }
    },
  },
  plugins: [],
}
