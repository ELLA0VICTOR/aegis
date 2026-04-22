/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aegis-bg':      '#0A0B0D',
        'aegis-surface': '#0F1114',
        'aegis-safe':    '#00D4AA',
        'aegis-warn':    '#F5A623',
        'aegis-danger':  '#FF4444',
        'aegis-text':    '#E8E3D5',
        'aegis-muted':   'rgba(232,227,213,0.45)',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
        ui:      ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-up':    'fade-up 0.5s ease forwards',
        'blink':      'blink-warning 1s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
