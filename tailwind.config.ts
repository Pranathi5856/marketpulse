import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0E14",
          900: "#12161F",
          800: "#1B212C",
          700: "#262E3B",
        },
        paper: "#E8EAED",
        muted: "#8A93A3",
        gain: "#3DD68C",
        loss: "#FF6B6B",
        amber: "#F5A623",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
