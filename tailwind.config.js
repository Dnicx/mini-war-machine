/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#010007',
        surface: '#16213e',
        surface2: '#0f3460',
        accent: ' #5ead31',
        text: '#eaeaea',
        text2: '#dbc924'
      }
    },
  },
  plugins: [],
}
