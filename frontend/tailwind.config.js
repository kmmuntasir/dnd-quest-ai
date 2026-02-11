/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        background: {
          dark: '#0a0a0f',
          darker: '#050508',
          card: '#12121a',
          input: '#1a1a24'
        },
        primary: {
          default: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8'
        },
        accent: {
          gold: '#fbbf24',
          purple: '#a855f7',
          red: '#ef4444',
          green: '#22c55e'
        }
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        fantasy: ['MedievalSharp', 'cursive']
      }
    },
  },
  plugins: [],
}
