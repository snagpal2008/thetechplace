import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1f2a2e", soft: "#3b4a4f", mute: "#6b7a7e" },
        paper: { DEFAULT: "#f7f5f0", card: "#ffffff", line: "#e4e0d6" },
        sage: { DEFAULT: "#4f6f62", dark: "#3c5a4e", light: "#e6eee9" },
        brass: { DEFAULT: "#a8833f", light: "#f4ecdc" },
        alert: { DEFAULT: "#a8463f", light: "#f6e4e2" },
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', "Palatino", "Georgia", "serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
