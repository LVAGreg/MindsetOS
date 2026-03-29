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
      // ─── MindsetOS Design System ─────────────────────────────────────────
      // Primary: Deep intelligent indigo (not harsh — warm-toned)
      // Background: Very dark warm-tinted near-black
      // Surface: Slightly lighter for card layering
      // Accent: Electric violet — says "breakthrough", pairs with indigo
      // Amber: Reserved for CTAs and upgrade prompts only
      colors: {
        // Core brand
        'mindset-blue':          '#4f6ef7',   // primary action, links
        'mindset-blue-light':    '#7b92ff',   // hover states, highlights
        'mindset-blue-dim':      '#3a54d4',   // pressed / active states
        'mindset-violet':        '#7c5bf6',   // accent — "breakthrough" moments
        'mindset-violet-light':  '#a07ef9',   // hover on violet

        // Backgrounds (dark-first)
        'mindset-base':          '#09090f',   // deepest background (body)
        'mindset-dark':          '#0d0d18',   // sidebar, panels
        'mindset-darker':        '#07070d',   // modals over sidebar
        'mindset-surface':       '#12121f',   // card surfaces
        'mindset-surface-raised':'#181828',   // elevated cards, dropdowns
        'mindset-surface-high':  '#1e1e30',   // tooltips, highest elevation

        // Borders
        'mindset-border':        '#1e1e30',   // default border
        'mindset-border-subtle': '#161624',   // very subtle dividers
        'mindset-border-bright': '#2a2a42',   // focused / active borders

        // Text
        'mindset-text':          '#ededf5',   // primary text (warm white)
        'mindset-text-secondary':'#9090a8',   // secondary / muted
        'mindset-text-tertiary': '#5a5a72',   // placeholder, disabled

        // Semantic states
        'mindset-success':       '#22c55e',   // calm green
        'mindset-success-dim':   '#16a34a',
        'mindset-warning':       '#f59e0b',   // warm amber
        'mindset-warning-dim':   '#d97706',
        'mindset-error':         '#ef4444',
        'mindset-error-dim':     '#dc2626',

        // Amber — for upgrade CTAs, trial banners (use sparingly)
        'mindset-amber':         '#f59e0b',
        'mindset-amber-bright':  '#fcc824',
        'mindset-amber-dark':    '#d97706',

        // Legacy aliases — kept for backward compatibility with any
        // components that reference old tokens
        'mindset-primary':       '#4f6ef7',
        'mindset-secondary':     '#7c5bf6',
        'mindset-accent':        '#7c5bf6',
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        heading: ['var(--font-heading)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)',    'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'JetBrains Mono',    'Fira Code',  'monospace'],
      },
      lineHeight: {
        relaxed: '1.65',
        comfortable: '1.7',
      },
      letterSpacing: {
        'heading-tight': '-0.025em',
        'heading-tighter': '-0.04em',
      },

      // ─── Animations ───────────────────────────────────────────────────────
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
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
      },
      keyframes: {
        floatUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmerBg: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        subtlePulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.7' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.05)' },
        },
      },

      // ─── Box shadows with brand colors ───────────────────────────────────
      boxShadow: {
        'mindset-card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(78,110,247,0.06)',
        'mindset-card-hover': '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(78,110,247,0.14)',
        'mindset-glow-blue': '0 0 24px rgba(79,110,247,0.18), 0 0 64px rgba(79,110,247,0.06)',
        'mindset-glow-violet': '0 0 24px rgba(124,91,246,0.18), 0 0 64px rgba(124,91,246,0.06)',
        'mindset-glow-amber': '0 0 20px rgba(252,200,36,0.22), 0 4px 16px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
