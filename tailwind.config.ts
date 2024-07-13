/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        body: ['new-order', 'sans-serif'],
        'new-order': ['new-order', 'sans-serif']
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        // SimplePay colors
        'sp-primary': {
          DEFAULT: '#D0F451'
        },
        'sp-background': {
          DEFAULT: '#EDECE8CC'
        },
        'sp-text': {
          DEFAULT: '#1A1A1A'
        },
        'sp-text-secondary': {
          DEFAULT: '#767676'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      fontSize: {
        'sp-title-small': ['14px', { lineHeight: '16.8px' }],
        'sp-h1-small': ['28px', { lineHeight: '39.2px' }],
        'sp-h2-small': ['22px', { lineHeight: '26.4px' }],
        'sp-13px': ['13px', { lineHeight: '15.6px' }],
        'sp-paragraph-regular': ['14px', { lineHeight: '21px' }],
        'sp-button-text-small': ['13px', { lineHeight: '15.6px' }],
        'sp-title-regular': ['16px', { lineHeight: '19.2px' }],
        'sp-h5': ['14px', { lineHeight: '19.6px' }],
        'sp-paragraph-small': ['12px', { lineHeight: '15.6px' }],
        'sp-h1-large': ['32px', { lineHeight: '44.8px' }],
        'sp-h2-large': ['24px', { lineHeight: '28.8px' }],
        'sp-h4': ['16px', { lineHeight: '22.4px' }]
      },
      fontWeight: {
        'sp-medium': 500,
        'sp-semibold': 600,
        'sp-regular': 400
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
