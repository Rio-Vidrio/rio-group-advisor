import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rio: {
          red: "#C8202A",
          "red-light": "#FFF5F5",
          "red-tint": "#FFF8F8",
          black: "#0D0D0D",
          white: "#FFFFFF",
          surface: "#F9F8F6",
          gray: "#F9F8F6",
          "gray-100": "#F0EEE9",
          "gray-300": "#D4D0C8",
          "gray-500": "#8C8880",
          "gray-700": "#4A4845",
          dark: "#0D0D0D",
          border: "#D4D0C8",
          "text-secondary": "#8C8880",
          "text-muted": "#8C8880",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.10)",
      },
      maxWidth: {
        content: "820px",
      },
      spacing: {
        "18": "72px",
      },
    },
  },
  plugins: [],
};
export default config;
