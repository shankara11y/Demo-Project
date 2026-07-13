/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f9f6',
          100: '#e5f2eb',
          500: '#2d6a4f', // Forest Green Primary
          600: '#1b4332', // Dark Green
          700: '#081c15', // Deep Emerald
          DEFAULT: '#2d6a4f'
        },
        secondary: {
          50: '#fbf8f5',
          100: '#f5ebe0',
          500: '#9c6644', // Earth Brown Secondary
          600: '#7f5539', // Dark Earth Brown
          DEFAULT: '#9c6644'
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7', // Sky Blue Accent
          600: '#0369a1',
          DEFAULT: '#0284c7'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
