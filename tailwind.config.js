/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zone: {
          1: '#94a3b8', // Recovery - Grey
          2: '#38bdf8', // Endurance - Blue
          3: '#4ade80', // Tempo - Green
          4: '#facc15', // SweetSpot / Threshold - Yellow
          5: '#fb923c', // VO2 Max - Orange
          6: '#f87171', // Anaerobic - Red
          7: '#c084fc', // Neuromuscular - Purple
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
