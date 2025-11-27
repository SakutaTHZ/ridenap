/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|text|ring|border|accent|shadow|from|via)-(slate|zinc|neutral|blue|rose|violet|emerald|amber|red|indigo|orange|cyan|pink|fuchsia)-(50|100|200|300|400|500|600|700|800|900)(\/.*)?/,
    },
  ],
  theme: {
    extend: {
      keyframes: {
        'urgent-pulse': {
          '0%, 100%': { backgroundColor: '#ef4444' },
          '50%': { backgroundColor: '#7f1d1d' },
        },
        'slide-down': {
          'from': { transform: 'translateY(-100%)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          'from': { transform: 'translateY(100%)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'zoom-in': {
          'from': { transform: 'scale(0.9)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(.9)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      animation: {
        'urgent-pulse': 'urgent-pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slide-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 1s ease-out forwards',
        'zoom-in': 'zoom-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-in': 'bounce-in 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) forwards',
      }
    },
  },
  plugins: [],
}