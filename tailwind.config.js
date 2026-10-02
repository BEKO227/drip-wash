/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090a', card: '#151517', card2: '#1d1d20', line: '#2b2b30',
        mut: '#9b9ba3', brand: '#ff7a1a', brand2: '#ffa04d', ok: '#4ade80',
      },
      fontFamily: { sans: ['Cairo', 'Segoe UI', 'Tahoma', 'sans-serif'] },
    },
  },
  plugins: [],
};
