/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080719',
          900: '#10102A',
          800: '#1B1B3A',
          700: '#292851',
        },
        violet: {
          50: '#F7F3FF',
          100: '#EEE6FF',
          200: '#DCCBFF',
          300: '#C3A1FF',
          400: '#A56BFF',
          500: '#8338EC',
          600: '#6C22D7',
          700: '#591AAF',
          800: '#49198D',
          900: '#3C176F',
        },
        gold: {
          50: '#FFFBEA',
          100: '#FFF3BF',
          200: '#FFE47A',
          300: '#FFD33D',
          400: '#FFC40C',
          500: '#F5AE00',
          600: '#D88900',
        },
        surface: '#F7F7FB',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 35px rgba(20, 16, 51, 0.08)',
        float: '0 22px 60px rgba(69, 32, 128, 0.18)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 75% 45%, rgba(131, 56, 236, 0.16), transparent 34%)',
      },
    },
  },
  plugins: [],
};
