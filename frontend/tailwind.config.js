/** @type {import('tailwindcss').Config} */
// Дизайн-система «Ventriloc»: монохром + один оранжевый акцент, светлая тема.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // brand переопределён под систему, чтобы существующие классы
        // bg-brand / text-brand / text-brand-accent подхватили тему.
        brand: {
          DEFAULT: "#202020", // Carbon — primary-кнопки, тёмный текст
          accent: "#ff682c", // Signal Orange — акцент данных/ссылок
        },
        carbon: "#202020",
        graphite: "#4d4d4d",
        slate: "#828282",
        fog: "#f5f5f5",
        mist: "#efefef",
        chalk: "#e8e8e8",
        paper: "#ffffff",
        signal: "#ff682c",
        sienna: "#816729",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
