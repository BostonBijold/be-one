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
        // Text — tuned for legibility on bg/card: text ≈12.5:1, muted ≈7:1,
        // dim ≈4.6:1 (WCAG AA). Keep dim ≥4.5:1 on card; it carries real labels.
        text: "#ece5d3",
        muted: "#b3ab96",
        dim: "#8e8673",
        // Accents
        olive: "#7a9248",
        "olive-light": "#8aaa55",
        gold: "#c4a84a",
        // tobacco / burgundy-light / blue-muted are used as text, so they're
        // lifted to ≥4.5:1 on card. burgundy stays dark — it's a fill color.
        tobacco: "#b57e4b",
        burgundy: "#7a2e2e",
        "burgundy-light": "#cf6a5f",
        amber: "#c47a2a",
        // blue-muted is the fill (cream text on it ≈4.6:1); blue-light is the
        // text/icon version of the same hue (≈4.8:1 on card).
        "blue-muted": "#3f6a87",
        "blue-light": "#6390b0",
        // Borders
        border: "#38352a",
        "border-light": "#4d4a3c",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "serif"],
        mono: ["var(--font-ibm-mono)", "monospace"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        // Floor of the type scale — nothing in the UI goes below micro (11px).
        micro: "11px",
        caption: "12px",
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
