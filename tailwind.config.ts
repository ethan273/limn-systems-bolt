import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        headings: '#1f1f1f',
        body: '#4a4a49',
        white: '#ffffff',
        black: '#000000',
        
        // Black Tints
        'black-tint-1': '#79797c',
        'black-tint-2': '#bababa',
        'black-tint-3': '#e8e7e7',
        
        // Charcoal Colors
        charcoal: '#474a49',
        'charcoal-tint-1': '#90918f',
        'charcoal-tint-2': '#c5c3c2',
        'charcoal-tint-3': '#eeeded',
        
        // Glacier Colors
        glacier: '#88c0c0',
        'glacier-tint-1': '#b8d9d8',
        'glacier-tint-2': '#daecec',
        'glacier-tint-3': '#f2f7f7',
        'glacier-tint-4': 'rgba(218, 236, 236, 0)',
        
        // Graphite Colors
        graphite: '#606c78',
        'graphite-tint-1': '#9ca4ab',
        'graphite-tint-2': '#ced3d4',
        'graphite-tint-3': '#f0f0f2',
        
        // Rose Colors
        rose: '#d87891',
        'rose-tint-1': '#e8aebe',
        'rose-tint-2': '#f4d6de',
        'rose-tint-3': '#f8f2f6',
        
        // Skyfall Colors
        skyfall: '#7095ae',
        'skyfall-tint-1': '#a8becf',
        'skyfall-tint-2': '#d4dde8',
        'skyfall-tint-3': '#f1f7f7',
        
        // Stone Colors
        stone: '#8c8a87',
        'stone-tint-1': '#bab8b5',
        'stone-tint-2': '#dbddda',
        'stone-tint-3': '#f5f4f5',
        
        // Amber Color
        amber: '#db7f38',
        
        // Semantic colors for app
        primary: {
          DEFAULT: '#88c0c0', // glacier
          dark: '#606c78',    // graphite
          light: '#b8d9d8',   // glacier-tint-1
        },
        secondary: {
          DEFAULT: '#7095ae', // skyfall
          dark: '#606c78',    // graphite
          light: '#a8becf',   // skyfall-tint-1
        },
        accent: {
          DEFAULT: '#d87891', // rose
          light: '#e8aebe',   // rose-tint-1
        },
        neutral: {
          DEFAULT: '#8c8a87', // stone
          dark: '#474a49',    // charcoal
          light: '#bab8b5',   // stone-tint-1
        },
        success: '#88c0c0',   // glacier
        warning: '#db7f38',   // amber
        error: '#d87891',     // rose
        info: '#7095ae',      // skyfall
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        heading: ['Roboto', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-limn': 'linear-gradient(135deg, #88c0c0 0%, #7095ae 100%)',
      },
    },
  },
  plugins: [],
}

export default config