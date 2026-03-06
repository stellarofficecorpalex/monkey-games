/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9686c9',
          light: '#b8a9e8',
          dark: '#7567a5',
        },
        dark: {
          DEFAULT: '#1b143d',
          light: '#2e2260',
          card: '#100f1f',
        },
        accent: {
          green: '#498a29',
          red: '#c93333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
