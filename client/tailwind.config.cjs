/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#0a66c2',
        'brand-dark': '#004182',
        'brand-light': '#70b5f9',
      },
    },
  },
  plugins: [],
};
