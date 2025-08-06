// tailwind.config.js
module.exports = {
  content: [
    "./index.html", 
    "./assets/**/*.js",
    "./assets/css/input.css"
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors to match brand
        primary: {
          DEFAULT: '#ad2118',
          dark: '#8a1a13',         // Darker variant for hovers
          light: '#c52d22'         // Lighter variant if needed
        },
        // Secondary colors
        brown: {
          DEFAULT: '#8B4513',      // brown accent
          light: '#a0521a',
          dark: '#6d3610'
        },
        // Background colors
        'warm-gray': '#f8f8f8',
        dark: {
          DEFAULT: '#0f0f0f',
          secondary: '#1a1a1a'
        },
        accent: '#ffb366'           // orange accent
      },
      fontFamily: {
        // Google Fonts
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'] 
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      borderWidth: {
        '3': '3px',           
        '5': '5px',
        '6': '6px'
      },
      backdropBlur: {
        xs: '2px'
      },
      // animation configurations
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shine': 'shine 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.7s ease-out forwards'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        shine: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' }
        },
        fadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(30px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        }
      },
      // z-index utilities
      zIndex: {
        '60': '60',
        '70': '70'
      }
    }
  },
  plugins: []
}