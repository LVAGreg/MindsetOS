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
        'mindset-surface': '#111827',
        'mindset-surface-raised': '#1a2235',
        'mindset-border': '#1f2937',
      },
      animation: {
        'float-up-1': 'floatUp 0.6s 0.05s ease-out both',
        'float-up-2': 'floatUp 0.6s 0.12s ease-out both',
        'float-up-3': 'floatUp 0.6s 0.19s ease-out both',
        'float-up-4': 'floatUp 0.6s 0.26s ease-out both',
        'float-up-5': 'floatUp 0.6s 0.33s ease-out both',
        'float-up-6': 'floatUp 0.6s 0.40s ease-out both',
        'skeleton-shimmer': 'shimmerBg 1.8s ease-in-out infinite',
        'subtle-pulse': 'subtlePulse 3s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out both',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmerBg: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        subtlePulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
