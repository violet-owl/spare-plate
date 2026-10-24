/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F7F3FC',
          100: '#F3EEFA',
          200: '#E7D9F5',
          300: '#D4BCEF',
          400: '#B79AE3',
          500: '#9170D4',
          600: '#7450C2',
          700: '#5E3DA8',
          800: '#4B2A7B',
          900: '#3A1F61',
          950: '#251342',
        },
        gold: {
          400: '#F8D66A',
          500: '#F5C842',
          600: '#E0B234',
        },
        ink: '#1F1A2B',
        cream: '#FFFDF8',
        warm: '#FBF7F0',
        success: '#2E8B57',
        amber: '#E08A00',
        danger: '#D14545',
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        app: '640px',
      },
    },
  },
  plugins: [],
};
