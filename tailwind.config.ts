import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bark: {
          deepest: "var(--bark-deepest)",
          DEFAULT: "var(--bark)",
          mid: "var(--bark-mid)",
          warm: "var(--bark-warm)",
          light: "var(--bark-light)",
          pale: "var(--bark-pale)",
        },
        stone: {
          lightest: "var(--stone-lightest)",
          light: "var(--stone-light)",
          mid: "var(--stone-mid)",
          warm: "var(--stone-warm)",
          deep: "var(--stone-deep)",
          shadow: "var(--stone-shadow)",
          card: "var(--stone-card)",
        },
        garnet: {
          black: "var(--garnet-black)",
          deep: "var(--garnet-deep)",
          DEFAULT: "var(--garnet)",
          vivid: "var(--garnet-vivid)",
          ruby: "var(--garnet-ruby)",
          blush: "var(--garnet-blush)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          warm: "var(--brass-warm)",
          bright: "var(--brass-bright)",
        },
        olive: {
          black: "var(--olive-black)",
          dark: "var(--olive-dark)",
          DEFAULT: "var(--olive)",
          mid: "var(--olive-mid)",
          sage: "var(--olive-sage)",
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
