import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bark: {
          deepest: "#1A1510",
          DEFAULT: "#2C2418",
          mid: "#474033",
          warm: "#504536",
          light: "#5E5344",
          pale: "#6D6153",
        },
        stone: {
          lightest: "#E0D9CC",
          light: "#D8D0C1",
          mid: "#C8BFAE",
          warm: "#B8AD99",
          deep: "#A89D89",
          shadow: "#988D7A",
          card: "#D5CCBC",
        },
        garnet: {
          black: "#1E0A0F",
          deep: "#3A1219",
          DEFAULT: "#6E2830",
          vivid: "#8B353E",
          ruby: "#A6434E",
          blush: "#C4868F",
        },
        brass: {
          DEFAULT: "#9E8750",
          warm: "#B59A5B",
          bright: "#D4B76A",
        },
        olive: {
          black: "#1A1E14",
          dark: "#2A3020",
          DEFAULT: "#3E4632",
          mid: "#5C6148",
          sage: "#7E856A",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        brand: ["'Cormorant Garamond'", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
