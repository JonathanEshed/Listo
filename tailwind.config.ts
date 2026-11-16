import type { Config } from 'tailwindcss';

// Listo brand · direction C ("bottle green"): white ground, bottle green, ochre accents.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1D2A24',
        muted: '#5F675F',
        line: '#E5E0D4',
        green: { DEFAULT: '#22392F', 2: '#2E4A3D' },
        mint: '#EEF3EC',
        cream: '#F2EEE4',
        ochre: { DEFAULT: '#9E6327', light: '#D9A266' },
        good: '#2F7A55',
        bad: '#A3361F',
      },
      fontFamily: {
        head: ['Rubik', 'Heebo', 'system-ui', 'sans-serif'],
        body: ['Heebo', 'system-ui', 'Arial', 'sans-serif'],
      },
      borderRadius: { card: '18px' },
      transitionTimingFunction: { out: 'cubic-bezier(.23,1,.32,1)' },
    },
  },
  plugins: [],
};
export default config;
