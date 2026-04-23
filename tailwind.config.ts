import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b0c0e",
          muted: "#6b7280",
          soft: "#9ca3af",
        },
        paper: {
          DEFAULT: "#fafaf9",
          card: "#ffffff",
          rule: "#e5e7eb",
        },
        accent: {
          DEFAULT: "#c2410c",
          soft: "#fed7aa",
        },
        warn: "#b45309",
        ok: "#047857",
        bad: "#b91c1c",
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Inter', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
