/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#09090e',
          card: '#0f0f17',
          hover: '#141421',
          elevated: '#1a1a28',
        },
        gang: {
          crimson: '#c41e3a',
          'crimson-dim': '#8b1528',
          'crimson-glow': 'rgba(196,30,58,0.25)',
          gold: '#d4af37',
          'gold-dim': '#9a7e28',
        },
        ink: {
          border: '#1e1e2e',
          'border-bright': '#2a2a3e',
          primary: '#e8e8f8',
          secondary: '#5a5a7a',
          muted: '#2e2e45',
        },
        propre: '#22c55e',
        sale: '#ef4444',
        role: {
          boss: '#c41e3a',
          capo: '#f97316',
          soldato: '#eab308',
          associe: '#64748b',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-crimson': '0 0 30px rgba(196,30,58,0.35)',
        'glow-crimson-sm': '0 0 12px rgba(196,30,58,0.25)',
        'glow-gold': '0 0 20px rgba(212,175,55,0.3)',
        card: '0 4px 32px rgba(0,0,0,0.6)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.7)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.35s ease forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(34,197,94,0.6)' },
          '50%': { boxShadow: '0 0 14px rgba(34,197,94,1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
