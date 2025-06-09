// tailwind.config.js
module.exports = {
  content: ["./index.html", "./assets/**/*.js"], // adjust paths as needed
  theme: {
    extend: {
      colors: {
        primary: '#ff4500',
        'primary-dark': '#e63e00',
        'primary-light': '#ff7733',
        accent: '#ffb366',
        dark: '#0f0f0f',
        'dark-secondary': '#1a1a1a',
        'warm-gray': '#f7f5f3'
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
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
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
