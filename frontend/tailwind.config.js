/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          850: '#172032',
          900: '#0f172a',
          950: '#080d1a',
        },
        accent: {
          green:  '#10b981',
          red:    '#ef4444',
          yellow: '#f59e0b',
          blue:   '#3b82f6',
          purple: '#8b5cf6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient':
          'radial-gradient(at 40% 20%, hsl(237,87%,60%) 0px, transparent 50%), radial-gradient(at 80% 0%, hsl(263,90%,50%) 0px, transparent 50%), radial-gradient(at 0% 50%, hsl(220,60%,20%) 0px, transparent 50%)',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'slide-in':  'slideIn 0.35s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'typing':    'typing 1.2s steps(3) infinite',
        'shimmer':   'shimmer 2s linear infinite',
        'glow':      'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        typing:  { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          from: { boxShadow: '0 0 5px #6366f1, 0 0 10px #6366f1' },
          to:   { boxShadow: '0 0 20px #6366f1, 0 0 40px #6366f1' },
        },
      },
      boxShadow: {
        'glow-sm':  '0 0 8px rgba(99,102,241,0.4)',
        'glow-md':  '0 0 16px rgba(99,102,241,0.5)',
        'glow-lg':  '0 0 32px rgba(99,102,241,0.6)',
        'card':     '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
