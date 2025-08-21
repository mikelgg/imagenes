/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['var(--font-inter-tight)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Dark theme color palette
        bg: '#0B0F19',
        surface: '#111827',
        muted: '#1F2937',
        border: 'rgba(255, 255, 255, 0.06)',
        'text-primary': '#E5E7EB',
        'text-muted': '#9CA3AF',
        
        // Gradient accent colors
        'accent-from': '#7C3AED',
        'accent-to': '#06B6D4',
        
        // Shadcn/ui compatibility colors
        background: '#0B0F19',
        foreground: '#E5E7EB',
        primary: {
          DEFAULT: '#06B6D4',
          foreground: '#0B0F19',
        },
        secondary: {
          DEFAULT: '#1F2937',
          foreground: '#E5E7EB',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FEFEFE',
        },
        ring: 'rgba(6, 182, 212, 0.3)',
        input: '#111827',
        accent: {
          DEFAULT: '#1F2937',
          foreground: '#E5E7EB',
        },
        popover: {
          DEFAULT: '#111827',
          foreground: '#E5E7EB',
        },
        card: {
          DEFAULT: '#111827',
          foreground: '#E5E7EB',
        },
      },
      borderRadius: {
        lg: '1rem',
        md: '0.75rem',
        sm: '0.5rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'glow': '0 8px 30px rgba(32, 211, 238, 0.25)',
        'glow-sm': '0 4px 15px rgba(32, 211, 238, 0.15)',
        'surface': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-up': 'fadeUp 0.28s ease-out',
        'fade-in': 'fadeIn 0.28s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(10px)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0)' 
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { 
            opacity: '0', 
            transform: 'scale(0.95)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale(1)' 
          },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
      },
      letterSpacing: {
        'tight': '-0.025em',
        'tighter': '-0.05em',
      },
    },
  },
  safelist: [
    'bg-gradient-to-br',
    'from-emerald-400',
    'via-cyan-400', 
    'to-violet-500',
    'shadow-glow',
    'shadow-glow-sm',
    'ring-cyan-400/30',
    'ring-cyan-400/40',
  ],
  plugins: [],
}
