import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mindset-amber': '#f59e0b',
        'mindset-amber-dark': '#d97706',
        'mindset-dark': '#0a0a1a',
        'mindset-darker': '#050510',
        'mindset-primary': '#f59e0b',
        'mindset-secondary': '#06b6d4',
        'mindset-accent': '#8b5cf6',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
