import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: "#18160f",
        card: "#211f17",
        "card-hover": "#2a2720",
        // Text
        text: "#e8e0cc",
        muted: "#9a9280",
        dim: "#5a5548",
        // Accents
        olive: "#5a6b35",
        "olive-light": "#7a9248",
        gold: "#c4a84a",
        tobacco: "#8b5a2b",
        burgundy: "#7a2e2e",
        "burgundy-light": "#a03a3a",
        amber: "#c47a2a",
        "blue-muted": "#4a7a9a",
        // Borders
        border: "#2e2c22",
        "border-light": "#3d3b2e",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "serif"],
        mono: ["var(--font-ibm-mono)", "monospace"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        // Cards: 12px, Modals: 16px top, Buttons: 8px, Pills: 20px
        card: "12px",
        modal: "16px",
        pill: "20px",
      },
      maxWidth: {
        mobile: "420px",
      },
    },
  },
  plugins: [],
};
export default config;
