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
          black: "#111111",
          white: "#FFFFFF",
          gray: "#F5F5F5",
          dark: "#1A1A1A",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
