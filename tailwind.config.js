/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070710',
          900: '#0a0a14',
          850: '#0e0e1a',
          800: '#13131f',
          750: '#181826',
          700: '#1e1e2e',
          600: '#2a2a3d',
          500: '#3a3a52',
          400: '#4a4a68',
          300: '#6a6a8a',
        },
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        accent: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Semantic surfaces. These are the tokens components should reference so
        // the palette can be retuned in one place.
        surface: {
          base: '#070710',
          raised: '#0e0e1a',
          overlay: '#13131f',
          input: 'rgba(0, 0, 0, 0.3)',
        },
        edge: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          default: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        content: {
          primary: '#ffffff',
          secondary: '#d1d5db',
          muted: '#9ca3af',
          faint: '#6b7280',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -12px rgba(0, 0, 0, 0.6)',
        lift: '0 8px 32px -8px rgba(0, 0, 0, 0.7)',
        glow: '0 0 0 1px rgba(239, 68, 68, 0.2), 0 8px 32px -8px rgba(239, 68, 68, 0.4)',
        // Glass: a coloured ambient shadow that matches the surface, not a
        // generic black drop.
        glass:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 40px -24px rgba(0,0,0,0.9), 0 4px 16px -12px rgba(99,102,241,0.35)',
        'glass-lg':
          'inset 0 1px 0 rgba(255,255,255,0.10), 0 32px 64px -28px rgba(0,0,0,0.95), 0 8px 24px -16px rgba(239,68,68,0.28)',
        'glow-primary': '0 10px 40px -12px rgba(239,68,68,0.55)',
        'glow-accent': '0 10px 40px -12px rgba(59,130,246,0.5)',
        'glow-success': '0 10px 40px -12px rgba(34,197,94,0.45)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-down': 'fadeDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in': 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'typing': 'typing 1.4s ease-in-out infinite',
        'pop': 'pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'spin-slow': 'spin 14s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeDown: { '0%': { opacity: '0', transform: 'translateY(-12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
