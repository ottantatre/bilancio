/** @type {import("prettier").Config} */
module.exports = {
  semi: true, // średniki
  singleQuote: true, // pojedyncze cudzysłowy
  trailingComma: 'es5', // przecinki końcowe w obiektach/tablicach
  printWidth: 140, // szerokość linii
  tabWidth: 2, // spacje zamiast tabów
  plugins: ['prettier-plugin-tailwindcss'], // sortowanie klas tailwindowych
};
