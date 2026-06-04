/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          base: '#25D366',       // verde brillante
          light: '#128C7E',      // verde claro / degradado
          medium: '#075E54',     // verde medio
          dark: '#0B1E2E',       // azul oscuro / casi negro
          lightGreen: '#25D366', // alias usado por componentes SST
          green: '#075E54',      // alias usado por componentes SST
        },
      },
    },
  },
  plugins: [],
}
