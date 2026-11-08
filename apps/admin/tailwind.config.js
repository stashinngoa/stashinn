// Gray and white resolve to CSS variables (see globals.css) so light mode can use a warm
// sand palette while dark mode keeps Tailwind's default cool grays.
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const grayShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        white: themed('white'),
        gray: Object.fromEntries(grayShades.map((s) => [s, themed(`gray-${s}`)])),
        brand: {
          orange: '#E8722A',
          amber: '#D4A017',
          teal: '#5B8A8A',
          olive: '#3D3B0E',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
