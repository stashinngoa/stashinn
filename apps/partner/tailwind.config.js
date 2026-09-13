/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#E8722A',
          amber: '#D4A017',
          teal: '#5B8A8A',
          olive: '#3D3B0E',
        },
      },
    },
  },
  plugins: [],
}
