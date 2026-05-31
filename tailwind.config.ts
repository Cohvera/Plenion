import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        steel: "#66737c",
        qhome: "#1f7a62",
        warco: "#b63a3a",
        tomme: "#a07018"
      },
      boxShadow: {
        panel: "0 18px 45px rgba(17, 34, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
