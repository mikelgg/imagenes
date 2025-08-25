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
        // High contrast dark theme - elegant black
        bg: '#000000',
        surface: '#0A0A0A',
        muted: '#1A1A1A',
        border: 'rgba(255, 255, 255, 0.08)',
        'text-primary': '#FFFFFF',
        'text-muted': '#A3A3A3',
        
        // Blue accents for key actions only
        'accent-blue': '#3B82F6',
        'accent-blue-hover': '#2563EB',
        
        // Shadcn/ui compatibility colors - high contrast
        background: '#000000',
        foreground: '#FFFFFF',
        primary: {
          DEFAULT: '#3B82F6',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#1A1A1A',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        ring: 'rgba(59, 130, 246, 0.3)',
        input: '#0A0A0A',
        accent: {
          DEFAULT: '#1A1A1A',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#0A0A0A',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#0A0A0A',
          foreground: '#FFFFFF',
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
        'glow': '0 8px 30px rgba(59, 130, 246, 0.25)',
        'glow-sm': '0 4px 15px rgba(59, 130, 246, 0.15)',
        'surface': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
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
    'from-blue-500',
    'via-blue-400', 
    'to-blue-600',
    'shadow-glow',
    'shadow-glow-sm',
    'ring-blue-500/30',
    'ring-blue-500/40',
    'text-accent-blue',
    'bg-accent-blue',
    'hover:bg-accent-blue-hover',
  ],
  plugins: [],
}
