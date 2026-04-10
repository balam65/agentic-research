import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f3f6f2",
        ink: "#102018",
        panel: "#fbfdf9",
        line: "#d9e4da",
        accent: "#0f766e",
        accentSoft: "#d7f3ed",
        danger: "#b42318",
        dangerSoft: "#fee4e2",
        success: "#166534",
        successSoft: "#dcfce7",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(16, 32, 24, 0.08)",
      },
      borderRadius: {
        xl2: "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
