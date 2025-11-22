/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'temporal-purple': '#8B5CF6',
        'temporal-blue': '#3B82F6',
        'temporal-pink': '#EC4899',
      },
    },
  },
  plugins: [],
}
